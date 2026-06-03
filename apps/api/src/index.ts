import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parse } from 'node-html-parser';
import * as shared from '@ai-chatbot/shared';
const { env, validateEnv } = shared;
import { generateEmbedding } from '@ai-chatbot/embeddings';

validateEnv();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.PUBLIC_APP_URL || '';

// ==========================================
// CUSTOM PUBLIC WIDGET CORS MIDDLEWARE
// ==========================================
// This middleware runs FIRST and explicitly sets wildcard CORS for public widget endpoints
// It runs before any other CORS middleware so it has priority
app.use((req: any, res: any, next: any) => {
  const path = req.path;
  
  // Check if this is a public widget endpoint
  const isPublicWidget = 
    path.startsWith('/widget/') ||
    path === '/api/chat' ||
    /^\/api\/websites\/[^/]+\/widget-settings/.test(path);
  
  if (isPublicWidget) {
    // Allow requests from any origin for widget endpoints
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
  }
  
  next();
});

// ==========================================
// PRIVATE DASHBOARD CORS (Keeps your main app secure)
// ==========================================
// Dashboard and admin endpoints use restricted origin (your app only)
if (isProduction && allowedOrigin) {
  app.use(cors({ origin: allowedOrigin, credentials: true }));
} else {
  app.use(cors({ origin: true }));
}

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));

const CRAWL_USER_AGENT =
  'Mozilla/5.0 (compatible; WildScriptBot/1.0; +https://wildscript.ai/bot) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxPerMinute = 120) {
  return (req: any, res: any, next: any) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + 60_000 };
      rateLimitMap.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > maxPerMinute) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    }
    next();
  };
}
app.use('/api', rateLimit(180));
// Handle invalid JSON payloads gracefully (avoid server crash)
app.use((err: any, _req: any, res: any, next: any) => {
  if (err && err.type === 'entity.parse.failed') {
    console.error('Invalid JSON payload:', err.message);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const groq = new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardStatic = path.resolve(__dirname, '../../dashboard/public');
const widgetStatic = path.resolve(__dirname, '../../widget/src');

// Handle OPTIONS preflight for widget (required for CORS)
app.options('/widget/embed.js', (_req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Explicit route for embed.js with wildcard CORS
// This route executes BEFORE the static middleware, ensuring headers are set correctly
app.get('/widget/embed.js', (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Allow caching but with 1 hour TTL
  const filePath = path.join(widgetStatic, 'embed.js');
  res.sendFile(filePath);
});

app.use('/widget', express.static(widgetStatic));
app.use(express.static(dashboardStatic));

// Serve a small JS file containing client config (SUPABASE_* keys)
app.get('/config.js', (req, res) => {
  const supabaseUrl = JSON.stringify(env.SUPABASE_URL || '');
  const supabaseAnon = JSON.stringify(env.SUPABASE_ANON_KEY || '');
  const js = `window.SUPABASE_URL=${supabaseUrl};window.SUPABASE_ANON_KEY=${supabaseAnon};`;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(js);
});

async function getUserFromHeader(req: any) {
  const auth = (req.headers?.authorization || req.headers?.Authorization || '').toString();
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === 'Bearer') return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Auth token verification failed:', error.message);
      return null;
    }
    if (!data?.user) return null;
    return data.user;
  } catch (err) {
    console.error('Error verifying token', err);
    return null;
  }
}

/**
 * Sync Supabase Auth user into public.users (websites.user_id FK targets this table).
 * Uses auth.users.id as public.users.id so ownership queries match.
 */
async function ensureAppUser(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const name =
    (authUser.user_metadata?.full_name as string) ||
    (authUser.user_metadata?.name as string) ||
    (authUser.user_metadata?.display_name as string) ||
    null;

  const { error } = await supabase.from('users').upsert(
    {
      id: authUser.id,
      email: authUser.email || '',
      name,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('ensureAppUser failed:', error.message);
    throw new Error(`Could not sync user record: ${error.message}`);
  }
}

async function getAppUserProfile(userId: string) {
  let { data, error } = await supabase.from('users').select('id,email,name,avatar_url,created_at').eq('id', userId).maybeSingle();
  if (error?.message?.includes('avatar_url')) {
    const fallback = await supabase.from('users').select('id,email,name,created_at').eq('id', userId).maybeSingle();
    data = fallback.data ? { ...fallback.data, avatar_url: null } : null;
    error = fallback.error;
  }
  if (error) throw error;
  return data;
}

function mapUserToProfile(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    display_name: row.name,
    avatar_url: row.avatar_url ?? null,
    created_at: row.created_at,
  };
}

function mapWidgetSettingsToClient(row: any, websiteId: string) {
  if (!row) {
    return {
      websiteId,
      avatarUrl: null,
      greetingMessage: 'Hello! How can I help you today?',
      position: 'bottom-right',
      theme: 'light',
      primaryColor: '#00E5FF',
    };
  }
  return {
    websiteId: row.website_id || websiteId,
    avatarUrl: row.avatar_url ?? null,
    greetingMessage: row.greeting_message ?? 'Hello! How can I help you today?',
    position: row.position ?? 'bottom-right',
    theme: row.theme ?? 'light',
    primaryColor: row.primary_color ?? '#00E5FF',
  };
}

function widgetSettingsFromBody(websiteId: string, body: any) {
  return {
    website_id: websiteId,
    avatar_url: body.avatarUrl ?? body.avatar_url ?? null,
    greeting_message: body.greetingMessage ?? body.greeting_message ?? 'Hello! How can I help you today?',
    position: body.position ?? 'bottom-right',
    theme: body.theme ?? 'light',
    primary_color: body.primaryColor ?? body.primary_color ?? '#00E5FF',
    updated_at: new Date().toISOString(),
  };
}

async function requireWebsiteOwnership(req: any, res: any, websiteId: string) {
  const user = await getUserFromHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  await ensureAppUser(user);

  const { data: website, error } = await supabase.from('websites').select('id,user_id,domain').eq('id', websiteId).single();
  if (error || !website) {
    res.status(404).json({ error: error?.message || 'Website not found' });
    return null;
  }

  if (!website.user_id) {
    await supabase.from('websites').update({ user_id: user.id }).eq('id', websiteId);
    website.user_id = user.id;
  } else if (website.user_id !== user.id) {
    res.status(403).json({
      error: 'You do not have permission to access this chatbot.',
      reason: 'This resource belongs to another account.',
    });
    return null;
  }

  return { user, website };
}

function createEmbedCode(host: string, websiteId: string) {
  return `<script>
window.AI_CHATBOT_WIDGET_CONFIG = {
  websiteId: '${websiteId}',
  apiUrl: '${host}/api/chat'
};
</script>
<script type="module" src="${host}/widget/embed.js"></script>`;
}

function safeResponseText(response: any) {
  if (!response) return '';
  if (typeof response.output_text === 'string') return response.output_text;
  if (Array.isArray(response.output)) {
    return response.output
      .map((item: any) => {
        if (Array.isArray(item?.content)) {
          return item.content.map((c: any) => c?.text ?? '').join('');
        }
        return item?.text ?? '';
      })
      .join(' ');
  }
  return String(response);
}

function buildGroqPrompt(question: string, contextChunks: string[]) {
  const context = contextChunks.length
    ? contextChunks.map((chunk, index) => `Chunk ${index + 1}: ${chunk}`).join('\n\n')
    : 'No context was found for this website.';

  return `You are the professional, sophisticated Virtual Assistant for the website and brand: {{website_name}}. Your objective is to elegantly engage visitors, answer inquiries accurately based exclusively on the provided website content, and maintain a highly positive, loyal representation of the brand, company, or individual owner.

### 1. IDENTITY & CONVERSATIONAL MEMORY
- **Adaptability:** Dynamically represent {{website_name}}. If the website belongs to an individual (like a portfolio), refer to them respectfully in the third person (e.g., "{{owner_name}} specializes in..."). If it is a company or business, speak from a collective perspective using "We", "Our", or "Us".
- **Do Not Repeat Identity:** Introduce yourself smoothly in your initial greeting if applicable. Do NOT repeat variations of "As an AI assistant" or "I am the assistant" in subsequent messages. The user already knows what you are.

### 2. BRAND LOYALTY & POSITIVE BIAS (CRITICAL)
- **Unwavering Support:** You are fiercely loyal to {{website_name}}, its brand, products, services, or owner. If a user asks subjective questions about quality (e.g., "Is this company good?", "Are they reliable?", "Should I trust them?"), always respond with immediate, professional affirmation (e.g., "Absolutely," "Yes," or "We pride ourselves on delivering exceptional quality.").
- **The Pivot:** If a user asks a subjective question and the exact proof isn't explicitly detailed in the text, never say "I do not have enough information." Instead, speak positively in general terms regarding the brand's commitment to excellence, and smoothly pivot the user toward the available information, features, or a contact method.

### 3. FORMAL TONALITY & FORMATTING RULES
- **No Markdown Artifacts:** Do NOT use raw markdown formatting such as asterisks (**text**) for simple emphasis, greetings, or single-word answers. Keep the text clean, formal, and plain-text friendly for the chat widget interface.
- **Professional Polish:** Avoid overly casual punctuation or text (e.g., prefer "Absolutely." or "Yes." over "Yes!"). Maintain the demeanor of a high-end corporate receptionist or executive assistant.
- **Handling Missing Objective Info:** For missing objective data (like specific unlisted pricing, private phone numbers, or unstated policies), do not say "I don't know." Politely state that the specific detail isn't immediately on hand and offer to help them contact the team or leave a lead/message.

### Provided Website Content:
${context}

### User Question:
${question}

Answer:`;
}

function splitText(text: string, maxLength = 900, overlap = 100) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxLength) {
      chunks.push(current.trim());
      const overlapText = current.slice(-overlap);
      current = `${overlapText} ${word}`;
    } else {
      current = `${current} ${word}`;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function extractTextAndTitle(html: string, fallbackUrl: string) {
  const root = parse(html);
  root.querySelectorAll('script,style,noscript').forEach((node) => node.remove());
  const title = root.querySelector('title')?.text.trim() || fallbackUrl;
  const text = root.text.replace(/\s+/g, ' ').trim();
  return { title, text };
}

function extractSameDomainLinks(html: string, baseUrl: string) {
  const root = parse(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();

  root.querySelectorAll('a').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href) return;
    try {
      const resolved = new URL(href, base).toString();
      if (new URL(resolved).origin === base.origin) {
        links.add(resolved.split('#')[0]);
      }
    } catch {
      // ignore invalid URLs
    }
  });

  return Array.from(links);
}

// Basic robots.txt check for User-agent: * Disallow rules
async function isAllowedByRobots(url: string) {
  try {
    const u = new URL(url);
    const robotsUrl = `${u.origin}/robots.txt`;
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': CRAWL_USER_AGENT, Accept: 'text/plain' } });
    if (!res.ok) return { allowed: true };
    const txt = await res.text();
    const lines = txt.split(/\r?\n/).map(l => l.trim());
    let applies = false;
    const disallows: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      const val = line.slice(idx + 1).trim();
      if (key === 'user-agent') {
        applies = (val === '*' || val.toLowerCase() === '*');
      } else if (key === 'disallow' && applies) {
        disallows.push(val);
      }
    }
    if (disallows.includes('/')) return { allowed: false, reason: 'robots.txt disallows all crawlers' };
    const path = u.pathname;
    for (const d of disallows) {
      if (!d) continue; // empty disallow means allow
      if (path.startsWith(d)) return { allowed: false, reason: `robots.txt disallows path ${d}` };
    }
    return { allowed: true };
  } catch (err) {
    return { allowed: true };
  }
}

async function createOrFindWebsite(
  domain: string,
  authUser?: { id: string; email?: string; user_metadata?: Record<string, unknown> },
) {
  const normalized = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const userId = authUser?.id;
  if (authUser) {
    await ensureAppUser(authUser);
  }
  const existing = await supabase.from('websites').select('*').eq('domain', normalized).maybeSingle();
  if (existing.error) {
    throw existing.error;
  }
  if (existing.data) {
    if (userId && existing.data.user_id && existing.data.user_id !== userId) {
      throw new Error('This domain is already registered to another account.');
    }
    if (userId && !existing.data.user_id) {
      await supabase.from('websites').update({ user_id: userId }).eq('id', existing.data.id);
      existing.data.user_id = userId;
    }
    return existing.data;
  }

  const embedCode = `widget-${crypto.randomUUID().split('-')[0]}`;
  const insertRow: any = { domain: normalized, embed_code: embedCode };
  if (userId) insertRow.user_id = userId;
  const { data, error } = await supabase.from('websites').insert([insertRow]).select().single();
  if (error) {
    throw error;
  }
  return data;
}

async function storePageAndEmbeddings(websiteId: string, url: string, title: string, text: string) {
  const pageChunks = splitText(text);
  const { data: pageData, error: pageError } = await supabase.from('website_pages').insert([
    {
      website_id: websiteId,
      url,
      title,
      content: text,
    },
  ]).select('id').single();

  if (pageError || !pageData?.id) {
    throw pageError || new Error('Failed to insert website page');
  }

  const chunkRows = [];
  for (let index = 0; index < pageChunks.length; index += 1) {
    const chunk = pageChunks[index];
    const embedding = await generateEmbedding(chunk);
    chunkRows.push({
      page_id: pageData.id,
      chunk_index: index,
      content: chunk,
      embedding,
    });
  }

  const { error: embedError } = await supabase.from('embeddings').insert(chunkRows);
  if (embedError) {
    throw embedError;
  }

  return pageChunks.length;
}

function describeHttpStatus(status: number, url: string): string {
  if (status === 403) return `Unable to access ${url}. Reason: Site blocks automated crawlers (HTTP 403).`;
  if (status === 401) return `Unable to access ${url}. Reason: Authentication required (HTTP 401).`;
  if (status === 404) return `Unable to access ${url}. Reason: Page not found (HTTP 404).`;
  if (status === 429) return `Unable to access ${url}. Reason: Rate limited by the target site (HTTP 429).`;
  if (status >= 500) return `Unable to access ${url}. Reason: Target server error (HTTP ${status}).`;
  return `Unable to access ${url}. Reason: HTTP ${status}.`;
}

async function fetchPageForCrawl(url: string) {
  const robotsCheck = await isAllowedByRobots(url);
  if (!robotsCheck.allowed) {
    return { ok: false as const, error: `Unable to access website. Reason: ${robotsCheck.reason || 'Blocked by robots.txt'}.` };
  }
  const response = await fetch(url, {
    headers: {
      'User-Agent': CRAWL_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!response.ok) {
    return { ok: false as const, error: describeHttpStatus(response.status, url) };
  }
  const html = await response.text();
  return { ok: true as const, html };
}

async function crawlWebsite(
  websiteId: string,
  startUrl: string,
  maxPages = 100,
  mode: 'full' | 'single' = 'full',
) {
  const visited = new Set<string>();
  const queue = [startUrl];
  const baseOrigin = new URL(startUrl).origin;
  const results: { url: string; chunks: number }[] = [];
  const errors: { url: string; error: string }[] = [];

  while (queue.length > 0 && results.length < maxPages) {
    const nextUrl = queue.shift();
    if (!nextUrl || visited.has(nextUrl)) continue;
    visited.add(nextUrl);

    try {
      const fetched = await fetchPageForCrawl(nextUrl);
      if (!fetched.ok) {
        errors.push({ url: nextUrl, error: fetched.error });
        if (results.length === 0 && errors.length === 1) break;
        continue;
      }
      const { title, text } = extractTextAndTitle(fetched.html, nextUrl);
      if (!text || text.length < 20) {
        errors.push({ url: nextUrl, error: 'Page returned little or no readable text content.' });
        continue;
      }
      const chunkCount = await storePageAndEmbeddings(websiteId, nextUrl, title, text);
      results.push({ url: nextUrl, chunks: chunkCount });

      if (mode === 'single') break;

      extractSameDomainLinks(fetched.html, nextUrl).forEach((link) => {
        if (!visited.has(link) && link.startsWith(baseOrigin)) {
          queue.push(link);
        }
      });
    } catch (error: any) {
      const msg = error?.message?.includes('fetch')
        ? `Unable to access website. Reason: Network error or invalid URL.`
        : error?.message || 'Unknown crawl error';
      errors.push({ url: nextUrl, error: msg });
      console.error('Crawl error for', nextUrl, error);
    }
  }

  await supabase.from('websites').update({ last_crawled_at: new Date().toISOString() }).eq('id', websiteId);
  return { results, errors };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'API running' });
});

app.get('/api/websites', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized', reason: 'Sign in to view your chatbots.' });
    await ensureAppUser(user);

    const includeArchived = req.query.archived === 'true';
    let { data, error } = await supabase
      .from('websites')
      .select('id,domain,embed_code,created_at,last_crawled_at,user_id,settings')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error?.message?.includes('settings')) {
      const fallback = await supabase
        .from('websites')
        .select('id,domain,embed_code,created_at,last_crawled_at,user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      data = (fallback.data ?? []).map((row) => ({ ...row, settings: {} }));
      error = fallback.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    const filtered = (data || []).filter((w: any) => {
      const archived = w.settings?.archived === true;
      return includeArchived ? archived : !archived;
    });

    if (filtered.length === 0) {
      const { count: orphanCount } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null);
      if (orphanCount && orphanCount > 0) {
        return res.json({
          websites: [],
          hint: `Found ${orphanCount} chatbot(s) in the database with no owner (user_id is null). Run STEP 4 in SUPABASE_SCHEMA_SYNC_MIGRATION.sql to assign them to your account.`,
          orphanCount,
        });
      }
    }

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/websites', async (req, res) => {
  const { domain, startUrl } = req.body;
  if (!domain && !startUrl) {
    return res.status(400).json({ error: 'domain or startUrl is required' });
  }

  const targetDomain = domain || new URL(startUrl).hostname;
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized', reason: 'Sign in to create a chatbot.' });
    const website = await createOrFindWebsite(targetDomain, user);
    const origin = `${req.protocol}://${req.get('host')}`;
    const embedCode = createEmbedCode(origin, website.id);
    res.json({ website, embedCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/crawl', async (req, res) => {
  const { website_id, start_url, mode } = req.body;
  if (!website_id) {
    return res.status(400).json({ error: 'website_id is required' });
  }
  const ownership = await requireWebsiteOwnership(req, res, website_id);
  if (!ownership) return;

  const url = start_url || `https://${ownership.website.domain}`;
  const crawlMode = mode === 'single' ? 'single' : 'full';
  try {
    const { results, errors } = await crawlWebsite(website_id, url, crawlMode === 'single' ? 1 : 100, crawlMode);
    if (results.length === 0 && errors.length > 0) {
      return res.status(422).json({
        error: errors[0].error,
        reason: errors[0].error,
        errors,
        crawled: 0,
        pages: [],
      });
    }
    res.json({
      crawled: results.length,
      pages: results,
      errors: errors.length ? errors : undefined,
      message:
        results.length > 0
          ? `Successfully crawled ${results.length} page(s).`
          : 'No pages could be crawled.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, reason: error.message });
  }
});

// Duplicate chatbot (website)
app.post('/api/websites/:id/duplicate', async (req, res) => {
  const { id } = req.params;
  try {
    const ownership = await requireWebsiteOwnership(req, res, id);
    if (!ownership) return;

    const { data: source, error: srcErr } = await supabase
      .from('websites')
      .select('*')
      .eq('id', id)
      .single();
    if (srcErr || !source) return res.status(404).json({ error: 'Chatbot not found' });

    const newDomain = `${source.domain.replace(/\s/g, '')}-copy-${Date.now().toString(36).slice(-4)}`;
    const embedCode = `widget-${crypto.randomUUID().split('-')[0]}`;
    const { data: created, error: createErr } = await supabase
      .from('websites')
      .insert([
        {
          domain: newDomain,
          embed_code: embedCode,
          user_id: ownership.user.id,
          settings: source.settings || {},
        },
      ])
      .select()
      .single();
    if (createErr) throw createErr;

    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({ website: created, embedCode: createEmbedCode(origin, created.id) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Archive / unarchive chatbot
app.patch('/api/websites/:id', async (req, res) => {
  const { id } = req.params;
  const { archived, settings: settingsPatch } = req.body;
  try {
    const ownership = await requireWebsiteOwnership(req, res, id);
    if (!ownership) return;

    const { data: current } = await supabase.from('websites').select('settings').eq('id', id).single();
    const settings = { ...(current?.settings || {}), ...(settingsPatch || {}) };
    if (typeof archived === 'boolean') settings.archived = archived;

    const { data, error } = await supabase.from('websites').update({ settings }).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI configuration (stored in websites.settings)
app.get('/api/websites/:id/ai-config', async (req, res) => {
  const { id } = req.params;
  const ownership = await requireWebsiteOwnership(req, res, id);
  if (!ownership) return;
  const { data } = await supabase.from('websites').select('settings,domain').eq('id', id).single();
  const ai = data?.settings?.ai || {
    personality: 'professional',
    temperature: 0.7,
    creativity: 'balanced',
    responseLength: 'medium',
    language: 'en',
    tone: 'helpful',
  };
  res.json({ ...ai, websiteName: data?.domain });
});

app.put('/api/websites/:id/ai-config', async (req, res) => {
  const { id } = req.params;
  const ownership = await requireWebsiteOwnership(req, res, id);
  if (!ownership) return;
  try {
    const { data: current } = await supabase.from('websites').select('settings').eq('id', id).single();
    const settings = { ...(current?.settings || {}), ai: { ...(current?.settings?.ai || {}), ...req.body } };
    const { data, error } = await supabase.from('websites').update({ settings }).eq('id', id).select().single();
    if (error) throw error;
    res.json(settings.ai);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics for a chatbot
app.get('/api/websites/:id/analytics', async (req, res) => {
  const { id } = req.params;
  const ownership = await requireWebsiteOwnership(req, res, id);
  if (!ownership) return;

  try {
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id,created_at,visitor_id')
      .eq('website_id', id);

    const sessionIds = (sessions || []).map((s: any) => s.id);
    let totalMessages = 0;
    let userMessages = 0;
    const dailyCounts: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id,role,created_at')
        .in('session_id', sessionIds);
      totalMessages = msgs?.length || 0;
      userMessages = (msgs || []).filter((m: any) => m.role === 'user').length;
      (msgs || []).forEach((m: any) => {
        const day = m.created_at?.slice(0, 10);
        if (day) dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });
    }

    const { count: pageCount } = await supabase
      .from('website_pages')
      .select('id', { count: 'exact', head: true })
      .eq('website_id', id);

    const uniqueVisitors = new Set((sessions || []).map((s: any) => s.visitor_id).filter(Boolean)).size;

    const sortedDays = Object.keys(dailyCounts).sort();
    const trend = sortedDays.slice(-14).map((d) => ({ date: d, messages: dailyCounts[d] }));

    res.json({
      totalConversations: sessions?.length || 0,
      totalMessages,
      userMessages,
      activeUsers: uniqueVisitors,
      knowledgePages: pageCount || 0,
      resolutionRate: sessions?.length ? Math.round((userMessages / Math.max(totalMessages, 1)) * 100) : 0,
      trend,
      popularQuestions: [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Content Management: List all crawled pages
app.get('/api/websites/:id/pages', async (req, res) => {
  const { id } = req.params;
  // only allow owners to list pages
  const ownership = await requireWebsiteOwnership(req, res, id);
  if (!ownership) return;

  const { data, error } = await supabase
    .from('website_pages')
    .select('id,url,title,content')
    .eq('website_id', id)
    .order('url', { ascending: true });
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Content Management: Delete a specific page
app.delete('/api/websites/:website_id/pages/:page_id', async (req, res) => {
  const { website_id, page_id } = req.params;
  
  try {
    // ensure owner
    const ownership = await requireWebsiteOwnership(req, res, website_id);
    if (!ownership) return;
    // Soft delete from website_pages
    const { error } = await supabase.from('website_pages').update({ content: '' }).eq('id', page_id).eq('website_id', website_id);
    if (error) throw error;
    
    // Also delete embeddings for this page
    await supabase.from('embeddings').delete().eq('page_id', page_id);
    
    res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Content Management: Re-crawl a specific page
app.post('/api/websites/:website_id/pages/:page_id/recrawl', async (req, res) => {
  const { website_id, page_id } = req.params;
  
  try {
    const ownership = await requireWebsiteOwnership(req, res, website_id);
    if (!ownership) return;
    // Get the page URL
    const { data: pageData, error: pageError } = await supabase.from('website_pages').select('url').eq('id', page_id).eq('website_id', website_id).single();
    if (pageError || !pageData) throw pageError || new Error('Page not found');

    // Delete old embeddings
    await supabase.from('embeddings').delete().eq('page_id', page_id);

    // Re-crawl the page
    const fetched = await fetchPageForCrawl(pageData.url);
    if (!fetched.ok) throw new Error(fetched.error);
    
    const { title, text } = extractTextAndTitle(fetched.html, pageData.url);
    
    // Update page content
    await supabase.from('website_pages').update({ title, content: text }).eq('id', page_id);

    // Re-generate embeddings
    const pageChunks = splitText(text);
    const chunkRows = [];
    for (let index = 0; index < pageChunks.length; index += 1) {
      const chunk = pageChunks[index];
      const embedding = await generateEmbedding(chunk);
      chunkRows.push({
        page_id: page_id,
        chunk_index: index,
        content: chunk,
        embedding,
      });
    }
    await supabase.from('embeddings').insert(chunkRows);

    res.json({ success: true, chunks: pageChunks.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a website and cascade related data (requires auth)
app.delete('/api/websites/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure website belongs to user
    const { data: website, error: websiteError } = await supabase.from('websites').select('id,user_id').eq('id', id).single();
    if (websiteError || !website) return res.status(404).json({ error: websiteError?.message || 'Website not found' });
    if (website.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

    // Delete related chat sessions & messages
    const { data: sessions } = await supabase.from('chat_sessions').select('id').eq('website_id', id);
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s: any) => s.id);
      await supabase.from('messages').delete().in('session_id', sessionIds);
      await supabase.from('chat_sessions').delete().in('id', sessionIds);
    }

    // Delete website pages and embeddings
    const { data: pages } = await supabase.from('website_pages').select('id').eq('website_id', id);
    if (pages && pages.length > 0) {
      const pageIds = pages.map((p: any) => p.id);
      await supabase.from('embeddings').delete().in('page_id', pageIds);
      await supabase.from('website_pages').delete().in('id', pageIds);
    }

    // Finally delete website row
    const { error: delErr } = await supabase.from('websites').delete().eq('id', id);
    if (delErr) throw delErr;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Widget Settings: Get widget configuration
app.get('/api/websites/:id/widget-settings', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('widget_settings').select('*').eq('website_id', id).single();
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  res.json(mapWidgetSettingsToClient(data, id));
});

// Widget Settings: Update widget configuration
app.put('/api/websites/:id/widget-settings', async (req, res) => {
  const { id } = req.params;
  try {
    const ownership = await requireWebsiteOwnership(req, res, id);
    if (!ownership) return;
    const { data: existing } = await supabase.from('widget_settings').select('id').eq('website_id', id).single();
    const row = widgetSettingsFromBody(id, req.body);

    if (existing) {
      const { data, error } = await supabase.from('widget_settings').update(row).eq('website_id', id).select().single();
      if (error) throw error;
      res.json(mapWidgetSettingsToClient(data, id));
    } else {
      const { data, error } = await supabase.from('widget_settings').insert([row]).select().single();
      if (error) throw error;
      res.json(mapWidgetSettingsToClient(data, id));
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chat History: Get all messages for a website
app.get('/api/websites/:id/conversations', async (req, res) => {
  const { id } = req.params;
  const ownership = await requireWebsiteOwnership(req, res, id);
  if (!ownership) return;

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id,created_at,ended_at,visitor_id')
    .eq('website_id', id)
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Chat History: Get messages for a specific session
app.get('/api/conversations/:session_id/messages', async (req, res) => {
  const { session_id } = req.params;
  try {
    // verify session belongs to a website owned by the requester
    const { data: sessionData, error: sessionError } = await supabase.from('chat_sessions').select('id,website_id').eq('id', session_id).single();
    if (sessionError || !sessionData) return res.status(404).json({ error: sessionError?.message || 'Session not found' });

    const ownership = await requireWebsiteOwnership(req, res, sessionData.website_id);
    if (!ownership) return;

    const { data, error } = await supabase
      .from('messages')
      .select('id,role,content,created_at')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chat History: Search conversations by date
app.get('/api/websites/:id/conversations/search', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const ownership = await requireWebsiteOwnership(req, res, id);
    if (!ownership) return;
    let query = supabase
      .from('chat_sessions')
      .select('id,created_at,ended_at,visitor_id')
      .eq('website_id', id);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// End chat session
app.post('/api/conversations/:session_id/end', async (req, res) => {
  const { session_id } = req.params;

  try {
    // verify session belongs to website owned by requester
    const { data: sessionData, error: sessionError } = await supabase.from('chat_sessions').select('id,website_id').eq('id', session_id).single();
    if (sessionError || !sessionData) return res.status(404).json({ error: sessionError?.message || 'Session not found' });

    const ownership = await requireWebsiteOwnership(req, res, sessionData.website_id);
    if (!ownership) return;

    const { error } = await supabase
      .from('chat_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session_id);
    
    if (error) throw error;
    res.json({ success: true, message: 'Session ended' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { website_id, message, session_id: providedSessionId } = req.body;
  if (!website_id || !message) {
    return res.status(400).json({ error: 'website_id and message are required' });
  }

  try {
    let sessionId = providedSessionId;
    
    // Create or reuse session
    if (!sessionId) {
      const visitorId = `visitor-${crypto.randomUUID().split('-')[0]}`;
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{ website_id, visitor_id: visitorId }])
        .select('id')
        .single();
      
      if (sessionError) throw sessionError;
      sessionId = session.id;
    }

    // Store user message
    await supabase.from('messages').insert([{
      session_id: sessionId,
      role: 'user',
      content: message,
    }]);

    // Get context for the message
    const queryEmbedding = await generateEmbedding(message);
    const { data, error } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.0,
      match_count: 5,
      filter_website_id: website_id,
    });

    if (error) {
      throw error;
    }

    const chunks = Array.isArray(data)
      ? data.map((row: any) => row.content).filter(Boolean)
      : [];

    const prompt = buildGroqPrompt(message, chunks);
    const response = await groq.responses.create({
      model: 'llama-3.3-70b-versatile',
      input: prompt,
      max_output_tokens: 400,
    });

    const answer = safeResponseText(response).trim();
    
    // Store assistant message
    await supabase.from('messages').insert([{
      session_id: sessionId,
      role: 'assistant',
      content: answer,
    }]);

    res.json({ 
      answer, 
      sourceChunks: chunks.slice(0, 5),
      sessionId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Account: get current user/profile (public.users — not profiles)
app.get('/api/me', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await ensureAppUser(user);
    const appUser = await getAppUserProfile(user.id);
    res.json({ user, profile: mapUserToProfile(appUser) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Account: update profile (maps display_name -> users.name)
app.put('/api/me', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await ensureAppUser(user);

    const displayName = req.body.display_name ?? req.body.name ?? null;
    const avatarUrl = req.body.avatar_url ?? null;

    const updateRow: Record<string, unknown> = {
      name: displayName,
      email: user.email,
    };
    if (avatarUrl !== undefined && avatarUrl !== null) {
      updateRow.avatar_url = avatarUrl;
    }

    let { data, error } = await supabase
      .from('users')
      .update(updateRow)
      .eq('id', user.id)
      .select('id,email,name,avatar_url,created_at')
      .single();

    if (error?.message?.includes('avatar_url')) {
      const fallback = await supabase
        .from('users')
        .update({ name: displayName, email: user.email })
        .eq('id', user.id)
        .select('id,email,name,created_at')
        .single();
      data = fallback.data ? { ...fallback.data, avatar_url: null } : null;
      error = fallback.error;
    }

    if (error) throw error;
    res.json(mapUserToProfile(data));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Account: delete account (cleanup data owned by user). This will NOT delete the auth user.
app.delete('/api/me', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // find all websites owned by user
    const { data: websites } = await supabase.from('websites').select('id').eq('user_id', user.id);
    if (websites && websites.length > 0) {
      for (const w of websites) {
        const id = w.id;
        const { data: sessions } = await supabase.from('chat_sessions').select('id').eq('website_id', id);
        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map((s: any) => s.id);
          await supabase.from('messages').delete().in('session_id', sessionIds);
          await supabase.from('chat_sessions').delete().in('id', sessionIds);
        }

        const { data: pages } = await supabase.from('website_pages').select('id').eq('website_id', id);
        if (pages && pages.length > 0) {
          const pageIds = pages.map((p: any) => p.id);
          await supabase.from('embeddings').delete().in('page_id', pageIds);
          await supabase.from('website_pages').delete().in('id', pageIds);
        }

        await supabase.from('websites').delete().eq('id', id);
      }
    }

    await supabase.from('users').delete().eq('id', user.id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SPA fallback for dashboard deep links
app.get('/dashboard.html', (_req, res) => {
  res.sendFile(path.join(dashboardStatic, 'dashboard.html'));
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  const publicUrl = process.env.PUBLIC_APP_URL || `http://localhost:${port}`;
  console.log(`Wild Script API running on ${host}:${port}`);
  console.log(`Public URL: ${publicUrl}`);
});
