const apiBase = window.location.origin;
const websitesEl = document.getElementById('websiteList');
const createResult = document.getElementById('createResult');
const crawlResult = document.getElementById('crawlResult');
const embedSnippet = document.getElementById('embedSnippet');

async function fetchWebsites() {
  const res = await fetch(`${apiBase}/api/websites`);
  const websites = await res.json();
  if (!Array.isArray(websites)) {
    websitesEl.innerText = 'Failed to load websites.';
    return;
  }

  websitesEl.innerHTML = websites.map((ws) => `
    <div class="website">
      <strong>${ws.domain}</strong> <span style="color:#6b7280;">${ws.id}</span>
      <div>Embed code:
        <pre>${createEmbedSnippet(ws.id)}</pre>
      </div>
      <div>Last crawled: ${ws.last_crawled_at || 'never'}</div>
    </div>
  `).join('');
}

function createEmbedSnippet(websiteId) {
  return `<script>
window.AI_CHATBOT_WIDGET_CONFIG = {
  websiteId: '${websiteId}',
  apiUrl: '${apiBase}/api/chat'
};
</script>
<script type="module" src="${apiBase}/widget/embed.js"></script>`;
}

async function createWebsite() {
  const domain = document.getElementById('domain').value.trim();
  const startUrl = document.getElementById('startUrl').value.trim();
  if (!domain && !startUrl) {
    createResult.innerText = 'Provide a domain or a start URL.';
    return;
  }

  const body = domain ? { domain } : { startUrl };
  const res = await fetch(`${apiBase}/api/websites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    createResult.innerText = data.error || 'Failed to create website.';
    return;
  }

  createResult.innerText = `Created website ${data.website.domain} (${data.website.id})`;
  embedSnippet.innerText = data.embedCode;
  await fetchWebsites();
}

async function crawlWebsite() {
  const websiteId = document.getElementById('crawlWebsiteId').value.trim();
  const startUrl = document.getElementById('crawlUrl').value.trim();
  if (!websiteId) {
    crawlResult.innerText = 'Website ID is required.';
    return;
  }

  const res = await fetch(`${apiBase}/api/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website_id: websiteId, start_url: startUrl || undefined }),
  });
  const data = await res.json();
  if (!res.ok) {
    crawlResult.innerText = data.error || 'Crawl failed.';
    return;
  }

  crawlResult.innerText = `Crawled ${data.crawled} page(s).`;
  await fetchWebsites();
}

window.addEventListener('load', async () => {
  document.getElementById('createWebsite').addEventListener('click', createWebsite);
  document.getElementById('startCrawl').addEventListener('click', crawlWebsite);
  await fetchWebsites();
});
