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
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

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
  const token = auth.split(' ')[1];
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Error verifying token', err);
    return null;
  }
}

async function requireWebsiteOwnership(req: any, res: any, websiteId: string) {
  const user = await getUserFromHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const { data: website, error } = await supabase.from('websites').select('id,user_id,domain').eq('id', websiteId).single();
  if (error || !website) {
    res.status(404).json({ error: error?.message || 'Website not found' });
    return null;
  }

  if (website.user_id !== user.id) {
    res.status(403).json({ error: 'Forbidden' });
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
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': 'WildScriptBot/1.0 (+https://wildscript.example)', 'Accept': 'text/plain' } });
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

async function createOrFindWebsite(domain: string, userId?: string) {
  const normalized = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const existing = await supabase.from('websites').select('*').eq('domain', normalized).maybeSingle();
  if (existing.error) {
    throw existing.error;
  }
  if (existing.data) {
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

async function crawlWebsite(websiteId: string, startUrl: string, maxPages = 100) {
  const visited = new Set<string>();
  const queue = [startUrl];
  const baseOrigin = new URL(startUrl).origin;
  const results: { url: string; chunks: number }[] = [];

  while (queue.length > 0 && results.length < maxPages) {
    const nextUrl = queue.shift();
    if (!nextUrl || visited.has(nextUrl)) continue;
    visited.add(nextUrl);

    try {
      const robotsCheck = await isAllowedByRobots(nextUrl);
      if (!robotsCheck.allowed) {
        console.warn('Robots blocked:', nextUrl, robotsCheck.reason);
        continue;
      }
        const response = await fetch(nextUrl, { headers: { 'User-Agent': 'WildScriptBot/1.0 (+https://wildscript.example)', 'Accept': 'text/html,application/xhtml+xml,application/xml' } });
      if (!response.ok) continue;
      const html = await response.text();
      const { title, text } = extractTextAndTitle(html, nextUrl);
      const chunkCount = await storePageAndEmbeddings(websiteId, nextUrl, title, text);
      results.push({ url: nextUrl, chunks: chunkCount });

      extractSameDomainLinks(html, nextUrl).forEach((link) => {
        if (!visited.has(link) && link.startsWith(baseOrigin)) {
          queue.push(link);
        }
      });
    } catch (error) {
      console.error('Crawl error for', nextUrl, error);
    }
  }

  await supabase.from('websites').update({ last_crawled_at: new Date().toISOString() }).eq('id', websiteId);
  return results;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'API running' });
});

app.get('/api/websites', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    let query = supabase.from('websites').select('id,domain,embed_code,created_at,last_crawled_at,user_id');
    if (user) query = query.eq('user_id', user.id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
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
    const website = await createOrFindWebsite(targetDomain, user?.id);
    const origin = `${req.protocol}://${req.get('host')}`;
    const embedCode = createEmbedCode(origin, website.id);
    res.json({ website, embedCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/crawl', async (req, res) => {
  const { website_id, start_url } = req.body;
  if (!website_id) {
    return res.status(400).json({ error: 'website_id is required' });
  }
  // require that the authenticated user owns this website
  const ownership = await requireWebsiteOwnership(req, res, website_id);
  if (!ownership) return;

  const url = start_url || `https://${ownership.website.domain}`;
  try {
    const results = await crawlWebsite(website_id, url, 100);
    res.json({ crawled: results.length, pages: results });
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

  const { data, error } = await supabase.from('website_pages').select('id,url,title,content,created_at').eq('website_id', id).order('created_at', { ascending: false });
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
    const response = await fetch(pageData.url);
    if (!response.ok) throw new Error(`Failed to fetch ${pageData.url}`);
    
    const html = await response.text();
    const { title, text } = extractTextAndTitle(html, pageData.url);
    
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
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    return res.status(500).json({ error: error.message });
  }
  
  // Return default settings if not found
  if (!data) {
    return res.json({
      websiteId: id,
      avatarUrl: null,
      greetingMessage: 'Hello! How can I help you today?',
      position: 'bottom-right',
      theme: 'light',
      primaryColor: '#2563eb',
    });
  }
  
  res.json(data);
});

// Widget Settings: Update widget configuration
app.put('/api/websites/:id/widget-settings', async (req, res) => {
  const { id } = req.params;
  const { avatarUrl, greetingMessage, position, theme, primaryColor } = req.body;

  try {
    const ownership = await requireWebsiteOwnership(req, res, id);
    if (!ownership) return;
    // Check if settings exist
    const { data: existing } = await supabase.from('widget_settings').select('id').eq('website_id', id).single();
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase.from('widget_settings').update({
        avatarUrl,
        greetingMessage,
        position,
        theme,
        primaryColor,
        updatedAt: new Date().toISOString(),
      }).eq('website_id', id).select().single();
      
      if (error) throw error;
      res.json(data);
    } else {
      // Insert new
      const { data, error } = await supabase.from('widget_settings').insert([{
        websiteId: id,
        avatarUrl,
        greetingMessage,
        position,
        theme,
        primaryColor,
        updatedAt: new Date().toISOString(),
      }]).select().single();
      
      if (error) throw error;
      res.json(data);
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

// Account: get current user/profile
app.get('/api/me', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    res.json({ user, profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Account: update profile
app.put('/api/me', async (req, res) => {
  try {
    const user = await getUserFromHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { display_name, avatar_url } = req.body;

    const { data: existing, error: existingErr } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (existingErr) throw existingErr;

    if (existing) {
      const { data, error } = await supabase.from('profiles').update({ display_name, avatar_url, updated_at: new Date().toISOString() }).eq('id', user.id).select().single();
      if (error) throw error;
      return res.json(data);
    }

    const { data, error } = await supabase.from('profiles').insert([{ id: user.id, email: user.email, display_name, avatar_url }]).select().single();
    if (error) throw error;
    res.json(data);
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

    // delete profile row
    await supabase.from('profiles').delete().eq('id', user.id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(dashboardStatic, 'index.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
