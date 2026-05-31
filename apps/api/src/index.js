import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parse } from 'node-html-parser';
import * as shared from '@ai-chatbot/shared';
import { generateEmbedding } from '@ai-chatbot/embeddings';
validateEnv();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const groq = new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardStatic = path.resolve(__dirname, '../../dashboard/public');
const widgetStatic = path.resolve(__dirname, '../../widget/src');
app.use('/widget', express.static(widgetStatic));
app.use(express.static(dashboardStatic));
function createEmbedCode(host, websiteId) {
    return `<script>
window.AI_CHATBOT_WIDGET_CONFIG = {
  websiteId: '${websiteId}',
  apiUrl: '${host}/api/chat'
};
</script>
<script type="module" src="${host}/widget/embed.js"></script>`;
}
function safeResponseText(response) {
    if (!response)
        return '';
    if (typeof response.output_text === 'string')
        return response.output_text;
    if (Array.isArray(response.output)) {
        return response.output
            .map((item) => {
            if (Array.isArray(item?.content)) {
                return item.content.map((c) => c?.text ?? '').join('');
            }
            return item?.text ?? '';
        })
            .join(' ');
    }
    return String(response);
}
function buildGroqPrompt(question, contextChunks) {
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
function splitText(text, maxLength = 900, overlap = 100) {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const chunks = [];
    let current = '';
    for (const word of words) {
        if ((current + ' ' + word).trim().length > maxLength) {
            chunks.push(current.trim());
            const overlapText = current.slice(-overlap);
            current = `${overlapText} ${word}`;
        }
        else {
            current = `${current} ${word}`;
        }
    }
    if (current.trim()) {
        chunks.push(current.trim());
    }
    return chunks;
}
function extractTextAndTitle(html, fallbackUrl) {
    const root = parse(html);
    root.querySelectorAll('script,style,noscript').forEach((node) => node.remove());
    const title = root.querySelector('title')?.text.trim() || fallbackUrl;
    const text = root.text.replace(/\s+/g, ' ').trim();
    return { title, text };
}
function extractSameDomainLinks(html, baseUrl) {
    const root = parse(html);
    const base = new URL(baseUrl);
    const links = new Set();
    root.querySelectorAll('a').forEach((anchor) => {
        const href = anchor.getAttribute('href');
        if (!href)
            return;
        try {
            const resolved = new URL(href, base).toString();
            if (new URL(resolved).origin === base.origin) {
                links.add(resolved.split('#')[0]);
            }
        }
        catch {
            // ignore invalid URLs
        }
    });
    return Array.from(links);
}
async function createOrFindWebsite(domain) {
    const normalized = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const existing = await supabase.from('websites').select('*').eq('domain', normalized).maybeSingle();
    if (existing.error) {
        throw existing.error;
    }
    if (existing.data) {
        return existing.data;
    }
    const embedCode = `widget-${crypto.randomUUID().split('-')[0]}`;
    const { data, error } = await supabase.from('websites').insert([{ domain: normalized, embed_code: embedCode }]).select().single();
    if (error) {
        throw error;
    }
    return data;
}
async function storePageAndEmbeddings(websiteId, url, title, text) {
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
async function crawlWebsite(websiteId, startUrl, maxPages = 5) {
    const visited = new Set();
    const queue = [startUrl];
    const baseOrigin = new URL(startUrl).origin;
    const results = [];
    while (queue.length > 0 && results.length < maxPages) {
        const nextUrl = queue.shift();
        if (!nextUrl || visited.has(nextUrl))
            continue;
        visited.add(nextUrl);
        try {
            const response = await fetch(nextUrl);
            if (!response.ok)
                continue;
            const html = await response.text();
            const { title, text } = extractTextAndTitle(html, nextUrl);
            const chunkCount = await storePageAndEmbeddings(websiteId, nextUrl, title, text);
            results.push({ url: nextUrl, chunks: chunkCount });
            extractSameDomainLinks(html, nextUrl).forEach((link) => {
                if (!visited.has(link) && link.startsWith(baseOrigin)) {
                    queue.push(link);
                }
            });
        }
        catch (error) {
            console.error('Crawl error for', nextUrl, error);
        }
    }
    await supabase.from('websites').update({ last_crawled_at: new Date().toISOString() }).eq('id', websiteId);
    return results;
}
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, message: 'API running' });
});
app.get('/api/websites', async (_req, res) => {
    const { data, error } = await supabase.from('websites').select('id,domain,embed_code,created_at,last_crawled_at');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});
app.get('/api/websites/:id/pages', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('website_pages').select('id,url,title,content').eq('website_id', id);
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});
app.post('/api/websites', async (req, res) => {
    const { domain, startUrl } = req.body;
    if (!domain && !startUrl) {
        return res.status(400).json({ error: 'domain or startUrl is required' });
    }
    const targetDomain = domain || new URL(startUrl).hostname;
    try {
        const website = await createOrFindWebsite(targetDomain);
        const origin = `${req.protocol}://${req.get('host')}`;
        const embedCode = createEmbedCode(origin, website.id);
        res.json({ website, embedCode });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/crawl', async (req, res) => {
    const { website_id, start_url } = req.body;
    if (!website_id) {
        return res.status(400).json({ error: 'website_id is required' });
    }
    const { data: website, error: websiteError } = await supabase.from('websites').select('id,domain').eq('id', website_id).single();
    if (websiteError || !website) {
        return res.status(400).json({ error: websiteError?.message || 'Website not found' });
    }
    const url = start_url || `https://${website.domain}`;
    try {
        const results = await crawlWebsite(website_id, url, 5);
        res.json({ crawled: results.length, pages: results });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/chat', async (req, res) => {
    const { website_id, message } = req.body;
    if (!website_id || !message) {
        return res.status(400).json({ error: 'website_id and message are required' });
    }
    try {
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
            ? data.map((row) => row.content).filter(Boolean)
            : [];
        const prompt = buildGroqPrompt(message, chunks);
        const response = await groq.responses.create({
            model: 'gpt-4o-mini',
            input: prompt,
            max_output_tokens: 400,
        });
        const answer = safeResponseText(response).trim();
        res.json({ answer, sourceChunks: chunks.slice(0, 5) });
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map