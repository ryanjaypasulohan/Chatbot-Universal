const apiBase = window.location.origin;
const websitesEl = document.getElementById('websiteList');
const createResult = document.getElementById('createResult');
const crawlResult = document.getElementById('crawlResult');
const embedSnippet = document.getElementById('embedSnippet');
const widgetResult = document.getElementById('widgetResult');
const contentResult = document.getElementById('contentResult');

let allWebsites = [];
let selectedPosition = 'bottom-right';
let selectedConversationId = null;

function getAuthHeaders(isJson = true) {
  const headers = {};
  const token = localStorage.getItem('sb_access_token');
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function fetchWebsites() {
  const res = await fetch(`${apiBase}/api/websites`, { headers: getAuthHeaders(false) });
  const websites = await res.json();
  if (!Array.isArray(websites)) {
    websitesEl.innerText = 'Failed to load websites.';
    return;
  }

  allWebsites = websites;

  websitesEl.innerHTML = websites.map((ws) => `
    <div class="website">
      <strong>${ws.domain}</strong> <span style="color:#6b7280;">${ws.id}</span>
      <div>Embed code:
        <pre>${createEmbedSnippet(ws.id)}</pre>
      </div>
      <div>Last crawled: ${ws.last_crawled_at || 'never'}</div>
      <div style="margin-top:8px;">
        <button class="small secondary" onclick="location.href='/#content'; document.getElementById('contentWebsiteId').value='${ws.id}'; loadWebsitePages();">View Pages</button>
        <button class="small" onclick="document.getElementById('widgetWebsiteId').value='${ws.id}'; loadWidgetSettings();">Widget</button>
        <button class="small danger" onclick="deleteWebsite('${ws.id}')">Delete</button>
      </div>
    </div>
  `).join('');

  // Update dropdowns
  updateWebsiteSelects();
}

function updateWebsiteSelects() {
  const selects = ['contentWebsiteId', 'widgetWebsiteId', 'convWebsiteId'];
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = '<option value="">Choose a website...</option>' +
        allWebsites.map(ws => `<option value="${ws.id}">${ws.domain}</option>`).join('');
    }
  });
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
    headers: getAuthHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    createResult.innerText = data.error || 'Failed to create website.';
    return;
  }

  createResult.innerText = `Created website ${data.website.domain} (${data.website.id})`;
  embedSnippet.innerText = data.embedCode;
  document.getElementById('domain').value = '';
  document.getElementById('startUrl').value = '';
  await fetchWebsites();
}

async function crawlWebsite() {
  const websiteId = document.getElementById('crawlWebsiteId').value.trim();
  const startUrl = document.getElementById('crawlUrl').value.trim();
  if (!websiteId) {
    crawlResult.innerText = 'Website ID is required.';
    return;
  }

  crawlResult.innerText = 'Crawling...';
  const res = await fetch(`${apiBase}/api/crawl`, {
    method: 'POST',
    headers: getAuthHeaders(true),
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

// TAB SWITCHING
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  const btn = document.querySelector(`.tab-btn[onclick*="switchTab('${tabName}')"]`);
  if (btn) btn.classList.add('active');
}

// CONTENT MANAGEMENT
async function loadWebsitePages() {
  const websiteId = document.getElementById('contentWebsiteId').value;
  if (!websiteId) {
    document.getElementById('pagesList').innerHTML = '';
    return;
  }
  contentResult.innerText = 'Loading pages...';
  try {
    const res = await fetch(`${apiBase}/api/websites/${websiteId}/pages`, { headers: getAuthHeaders(false) });
    if (!res.ok) {
      contentResult.innerText = 'Failed to load pages. Check browser console for details.';
      console.error('API response:', res.status, res.statusText);
      return;
    }

    const pages = await res.json();
    if (!Array.isArray(pages)) {
      contentResult.innerText = 'No pages found or error occurred.';
      console.error('Unexpected response:', pages);
      return;
    }

    contentResult.innerText = `Found ${pages.length} page(s)`;

    if (pages.length === 0) {
      document.getElementById('pagesList').innerHTML = '<p>No pages have been crawled yet. Go to the Websites tab and crawl this website first.</p>';
      return;
    }

    document.getElementById('pagesList').innerHTML = pages.map(page => `
      <div class="website" style="margin-top: 12px;">
        <strong>${page.title || page.url}</strong>
        <div style="font-size: 0.875rem; color: #6b7280; word-break: break-all;">${page.url}</div>
        <div style="margin-top: 8px;">
          <button class="small secondary" onclick="recrawlPage('${websiteId}', '${page.id}')">Re-crawl</button>
          <button class="small danger" onclick="deletePage('${websiteId}', '${page.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    contentResult.innerText = 'Failed to load pages.';
    console.error(err);
  }
}

async function deletePage(websiteId, pageId) {
  if (!confirm('Are you sure you want to delete this page?')) return;
  
  const res = await fetch(`${apiBase}/api/websites/${websiteId}/pages/${pageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });
  
  if (!res.ok) {
    const data = await res.json();
    contentResult.innerText = data.error || 'Failed to delete page.';
    return;
  }

  contentResult.innerText = 'Page deleted successfully.';
  await loadWebsitePages();
}

async function recrawlPage(websiteId, pageId) {
  contentResult.innerText = 'Re-crawling page...';
  const res = await fetch(`${apiBase}/api/websites/${websiteId}/pages/${pageId}/recrawl`, {
    method: 'POST',
    headers: getAuthHeaders(false),
  });
  const data = await res.json();
  
  if (!res.ok) {
    contentResult.innerText = data.error || 'Failed to re-crawl page.';
    return;
  }

  contentResult.innerText = `Re-crawled page with ${data.chunks} chunk(s).`;
  await loadWebsitePages();
}

// WIDGET SETTINGS
async function loadWidgetSettings() {
  const websiteId = document.getElementById('widgetWebsiteId').value;
  if (!websiteId) return;

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/widget-settings`, { headers: getAuthHeaders(false) });
  const settings = await res.json();

  document.getElementById('avatarUrl').value = settings.avatarUrl || '';
  document.getElementById('greetingMessage').value = settings.greetingMessage || 'Hello! How can I help you today?';
  document.getElementById('theme').value = settings.theme || 'light';
  document.getElementById('primaryColor').value = settings.primaryColor || '#2563eb';
  selectedPosition = settings.position || 'bottom-right';

  // Update position buttons
  document.querySelectorAll('.position-btn').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`.position-btn[onclick="selectPosition('${selectedPosition}')"]`)?.classList.add('selected');
}

function selectPosition(position) {
  selectedPosition = position;
  document.getElementById('selectedPosition').value = position;
  document.querySelectorAll('.position-btn').forEach(btn => btn.classList.remove('selected'));
  const btn = document.querySelector(`.position-btn[onclick*="selectPosition('${position}')"]`);
  if (btn) btn.classList.add('selected');
}

async function saveWidgetSettings() {
  const websiteId = document.getElementById('widgetWebsiteId').value;
  if (!websiteId) {
    widgetResult.innerText = 'Please select a website first.';
    return;
  }

  const settings = {
    avatarUrl: document.getElementById('avatarUrl').value || null,
    greetingMessage: document.getElementById('greetingMessage').value,
    position: selectedPosition,
    theme: document.getElementById('theme').value,
    primaryColor: document.getElementById('primaryColor').value,
  };

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/widget-settings`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(settings),
  });

  const data = await res.json();
  if (!res.ok) {
    widgetResult.innerText = data.error || 'Failed to save settings.';
    return;
  }

  widgetResult.innerText = 'Widget settings saved successfully!';
}

// CONVERSATIONS & CHAT HISTORY
async function loadConversations() {
  const websiteId = document.getElementById('convWebsiteId').value;
  if (!websiteId) {
    document.getElementById('conversationsList').innerHTML = '';
    return;
  }

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/conversations`, { headers: getAuthHeaders(false) });
  const conversations = await res.json();
  

  if (!Array.isArray(conversations)) {
    document.getElementById('conversationsList').innerHTML = 'Failed to load conversations.';
    return;
  }

  if (conversations.length === 0) {
    document.getElementById('conversationsList').innerHTML = 'No conversations yet.';
    return;
  }

  document.getElementById('conversationsList').innerHTML = conversations.map(conv => `
    <div class="conversation-item" onclick="loadConversationMessages('${conv.id}')">
      <strong>Session ${conv.id.substring(0, 8)}</strong>
      <div style="font-size: 0.875rem; color: #6b7280;">
        Started: ${new Date(conv.created_at).toLocaleString()}
      </div>
      ${conv.ended_at ? `<div style="font-size: 0.875rem; color: #6b7280;">Ended: ${new Date(conv.ended_at).toLocaleString()}</div>` : ''}
    </div>
  `).join('');
}

async function loadConversationMessages(sessionId) {
  selectedConversationId = sessionId;
  const res = await fetch(`${apiBase}/api/conversations/${sessionId}/messages`, { headers: getAuthHeaders(false) });
  const messages = await res.json();

  if (!Array.isArray(messages)) {
    document.getElementById('messagesList').innerHTML = 'Failed to load messages.';
    return;
  }

  if (messages.length === 0) {
    document.getElementById('messagesList').innerHTML = 'No messages in this conversation.';
    return;
  }

  document.getElementById('messagesList').innerHTML = messages.map(msg => `
    <div class="message-item ${msg.role}">
      <strong>${msg.role === 'user' ? 'User' : 'Assistant'}:</strong>
      <div style="margin-top: 8px;">${escapeHtml(msg.content)}</div>
      <div class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

async function searchConversations() {
  const websiteId = document.getElementById('convWebsiteId').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!websiteId) {
    alert('Please select a website first.');
    return;
  }

  if (!startDate || !endDate) {
    alert('Please select both start and end dates.');
    return;
  }

  const query = new URLSearchParams({
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
  });

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/conversations/search?${query}`, { headers: getAuthHeaders(false) });
  const conversations = await res.json();

  if (!Array.isArray(conversations)) {
    document.getElementById('conversationsList').innerHTML = 'Failed to search conversations.';
    return;
  }

  document.getElementById('conversationsList').innerHTML = conversations.length > 0
    ? conversations.map(conv => `
      <div class="conversation-item" onclick="loadConversationMessages('${conv.id}')">
        <strong>Session ${conv.id.substring(0, 8)}</strong>
        <div style="font-size: 0.875rem; color: #6b7280;">
          ${new Date(conv.created_at).toLocaleString()}
        </div>
      </div>
    `).join('')
    : 'No conversations found in the selected date range.';

}

// Delete a website (will attempt cascade cleanup)
async function deleteWebsite(websiteId) {
  if (!confirm('Delete this website and all associated data? This cannot be undone.')) return;
  const res = await fetch(`${apiBase}/api/websites/${websiteId}`, { method: 'DELETE', headers: getAuthHeaders(false) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    alert(data.error || 'Failed to delete website.');
    return;
  }
  await fetchWebsites();
  
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

window.addEventListener('load', async () => {
  document.getElementById('createWebsite').addEventListener('click', createWebsite);
  document.getElementById('startCrawl').addEventListener('click', crawlWebsite);
  document.getElementById('copyEmbedBtn')?.addEventListener('click', copyEmbedSnippet);

  // Check auth and initialize
  await checkAuthAndInit();
});

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${apiBase}/api/me`, { headers: getAuthHeaders(false) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function checkAuthAndInit() {
  const authEl = document.getElementById('authControls');
  const accountInfo = document.getElementById('accountInfo');
  const profileSaveBtn = document.getElementById('saveProfile');
  const deleteBtn = document.getElementById('deleteAccount');

  const me = await fetchCurrentUser();
  if (!me) {
    if (authEl) authEl.innerHTML = `<a href="/login.html" style="padding:8px 12px;border-radius:8px;background:#fff;border:1px solid #d1d5db;color:#111;text-decoration:none">Sign in</a>`;
    if (accountInfo) accountInfo.innerHTML = 'Not signed in. Please <a href="/login.html">sign in</a> to manage your account and websites.';
    return;
  }

  // Show profile in header
  if (authEl) {
    authEl.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><div style="font-weight:600">${me.user.email}</div><button id="signOutBtn" style="padding:6px 10px;border-radius:8px;border:none;background:#ef4444;color:#fff">Sign out</button></div>`;
    document.getElementById('signOutBtn').addEventListener('click', () => { localStorage.removeItem('sb_access_token'); location.reload(); });
  }

  // Populate account fields
  if (accountInfo) accountInfo.innerHTML = `<div><strong>Email:</strong> ${me.user.email}</div>`;
  if (document.getElementById('displayName')) document.getElementById('displayName').value = me.profile?.display_name || '';
  if (document.getElementById('accountAvatar')) document.getElementById('accountAvatar').value = me.profile?.avatar_url || '';

  if (profileSaveBtn) profileSaveBtn.addEventListener('click', saveProfile);
  if (deleteBtn) deleteBtn.addEventListener('click', deleteAccount);

  // Now load websites and other data
  await fetchWebsites();
  }

async function saveProfile() {
  const displayName = document.getElementById('displayName').value.trim();
  const avatarUrl = document.getElementById('accountAvatar').value.trim();
  const res = await fetch(`${apiBase}/api/me`, { method: 'PUT', headers: getAuthHeaders(true), body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl }) });
  const data = await res.json();
  const accountResult = document.getElementById('accountResult');
  if (!res.ok) {
    accountResult.innerText = data.error || 'Failed to update profile.';
    return;
  }
  accountResult.innerText = 'Profile updated.';
}

async function copyEmbedSnippet() {
  try {
    const code = embedSnippet?.innerText || '';
    if (!code) {
      document.getElementById('embedMsg').innerText = 'No embed code to copy.';
      setTimeout(()=> document.getElementById('embedMsg').innerText = '', 2500);
      return;
    }
    await navigator.clipboard.writeText(code);
    const msgEl = document.getElementById('embedMsg');
    if (msgEl) {
      msgEl.innerText = '✅ Script copied successfully';
      setTimeout(() => { msgEl.innerText = ''; }, 2500);
    }
  } catch (err) {
    console.error('Copy failed', err);
    document.getElementById('embedMsg').innerText = 'Failed to copy.';
    setTimeout(()=> document.getElementById('embedMsg').innerText = '', 2500);
  }
}

async function deleteAccount() {
  if (!confirm('Delete your account data (websites, pages, conversations)? This will NOT remove your auth user. Proceed?')) return;
  const res = await fetch(`${apiBase}/api/me`, { method: 'DELETE', headers: getAuthHeaders(false) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    alert(data.error || 'Failed to delete account');
    return;
  }
  localStorage.removeItem('sb_access_token');
  alert('Account data removed. You will need to delete your auth user in Supabase if desired.');
  location.href = '/';
}
