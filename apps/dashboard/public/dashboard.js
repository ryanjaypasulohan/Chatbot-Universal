import { Auth } from '/js/auth.js';

const apiBase = window.location.origin;
let allWebsites = [];
let selectedPosition = 'bottom-right';
let selectedPersonality = 'professional';
let analyticsChart = null;
let currentUser = null;

const $ = (id) => document.getElementById(id);

function showToast(message, type = 'success') {
  const container = $('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `ws-toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function showInline(el, message, type = 'info') {
  if (!el) return;
  el.innerHTML = message ? `<div class="ws-alert ws-alert-${type}">${message}</div>` : '';
}

function getAuthHeaders(isJson = true) {
  return Auth.getAuthHeaders(isJson);
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

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function renderWebsiteSkeleton() {
  const el = $('websiteList');
  if (!el) return;
  el.innerHTML = '<div class="ws-skeleton"></div><div class="ws-skeleton"></div><div class="ws-skeleton"></div>';
}

function renderEmptyWebsites() {
  $('websiteList').innerHTML = `
    <div class="ws-empty">
      <div class="ws-empty-icon">🌐</div>
      <p><strong>No websites yet</strong></p>
      <p>Add your first website above to get started.</p>
    </div>`;
}

async function fetchWebsites() {
  const websitesEl = $('websiteList');
  if (!websitesEl) return;

  renderWebsiteSkeleton();

  try {
    const res = await fetch(`${apiBase}/api/websites`, { headers: getAuthHeaders(false) });
    const payload = await res.json();
    const data = Array.isArray(payload) ? payload : payload.websites ?? [];
    const loadHint = Array.isArray(payload) ? null : payload.hint;

    if (res.status === 401) {
      Auth.clearToken();
      window.location.href = '/login.html';
      return;
    }

    if (!res.ok) {
      const hint =
        data.hint ||
        (data.error?.includes('user')
          ? 'Run SUPABASE_SCHEMA_SYNC_MIGRATION.sql in Supabase, then restart the API.'
          : '');
      websitesEl.innerHTML = `
        <div class="ws-alert ws-alert-error">${escapeHtml(data.error || data.reason || 'Failed to load websites.')}${hint ? `<br><small>${escapeHtml(hint)}</small>` : ''}</div>
        <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" id="retryWebsitesInline">Retry</button>`;
      $('retryWebsitesInline')?.addEventListener('click', fetchWebsites);
      return;
    }

    if (!Array.isArray(data)) {
      websitesEl.innerHTML = '<div class="ws-alert ws-alert-error">Unexpected response from server.</div>';
      return;
    }

    allWebsites = data;

    if (data.length === 0) {
      if (loadHint) {
        websitesEl.innerHTML = `<div class="ws-alert ws-alert-warning">${escapeHtml(loadHint)}</div>`;
      } else {
        renderEmptyWebsites();
      }
      updateWebsiteSelects();
      return;
    }

    websitesEl.innerHTML = data
      .map((ws) => `
    <div class="ws-accordion-item" data-id="${ws.id}">
      <div class="ws-accordion-header" data-id="${ws.id}">
        <div style="display:flex;gap:12px;align-items:center">
          <div>
            <strong>${escapeHtml(ws.domain)}</strong>
            <div class="ws-id" style="font-size:0.85rem;color:var(--ws-text-muted)">${escapeHtml(ws.id)}</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:0.85rem;color:var(--ws-text-muted)">Last crawled: ${ws.last_crawled_at ? new Date(ws.last_crawled_at).toLocaleString() : 'Never'}</div>
            <div class="ws-accordion-chevron">▾</div>
          </div>
        </div>
      </div>
      <div class="ws-accordion-content">
        <pre class="ws-code-block" style="font-size:0.75rem;margin-top:8px">${escapeHtml(createEmbedSnippet(ws.id))}</pre>
        <div class="ws-btn-group" style="margin-top:8px">
          <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" data-copy="${ws.id}">Copy Script</button>
          <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" data-view-knowledge="${ws.id}">Knowledge</button>
          <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" data-widget="${ws.id}">Widget</button>
          <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" data-duplicate="${ws.id}">Duplicate</button>
          <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" data-archive="${ws.id}">Archive</button>
          <button type="button" class="ws-btn ws-btn-danger ws-btn-sm" data-delete="${ws.id}">Delete</button>
        </div>
      </div>
    </div>`).join('');

    websitesEl.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-copy');
        $('embedSnippet').textContent = createEmbedSnippet(id);
        copyEmbedSnippet();
      });
    });
    websitesEl.querySelectorAll('[data-view-knowledge]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchTab('knowledge');
        $('contentWebsiteId').value = btn.getAttribute('data-view-knowledge');
        loadWebsitePages();
      });
    });
    websitesEl.querySelectorAll('[data-widget]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchTab('widget');
        $('widgetWebsiteId').value = btn.getAttribute('data-widget');
        loadWidgetSettings();
      });
    });
    websitesEl.querySelectorAll('[data-duplicate]').forEach((btn) => {
      btn.addEventListener('click', () => duplicateWebsite(btn.getAttribute('data-duplicate')));
    });
    websitesEl.querySelectorAll('[data-archive]').forEach((btn) => {
      btn.addEventListener('click', () => archiveWebsite(btn.getAttribute('data-archive')));
    });
    websitesEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteWebsite(btn.getAttribute('data-delete')));
    });

    // Accordion toggle handlers (collapsed by default)
    websitesEl.querySelectorAll('.ws-accordion-header').forEach((hdr) => {
      hdr.addEventListener('click', () => {
        const item = hdr.closest('.ws-accordion-item');
        if (!item) return;
        const isOpen = item.classList.toggle('open');
        const chevron = item.querySelector('.ws-accordion-chevron');
        if (chevron) chevron.textContent = isOpen ? '▴' : '▾';
      });
    });

    updateWebsiteSelects();
  } catch (err) {
    console.error(err);
    websitesEl.innerHTML = `
      <div class="ws-alert ws-alert-error">Network error. Check that the API is running.</div>
      <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" id="retryWebsitesInline">Retry</button>`;
    $('retryWebsitesInline')?.addEventListener('click', fetchWebsites);
  }
}

function updateWebsiteSelects() {
  const selects = [
    'contentWebsiteId',
    'widgetWebsiteId',
    'convWebsiteId',
    'crawlWebsiteSelect',
    'aiWebsiteId',
    'analyticsWebsiteId',
  ];
  const options =
    '<option value="">Select Website...</option>' +
    allWebsites.map((ws) => `<option value="${ws.id}">${escapeHtml(ws.domain)}</option>`).join('');

  selects.forEach((id) => {
    const select = $(id);
    if (select) select.innerHTML = options;
  });
}

async function createWebsite() {
  const domain = $('domain').value.trim();
  const startUrl = $('startUrl').value.trim();
  if (!domain && !startUrl) {
    showInline($('createResult'), 'Provide a domain or start URL.', 'error');
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
    showInline($('createResult'), data.error || data.reason || 'Failed to add website.', 'error');
    return;
  }

  showInline($('createResult'), `Added website <strong>${escapeHtml(data.website.domain)}</strong>`, 'success');
  $('embedSnippet').textContent = data.embedCode || createEmbedSnippet(data.website.id);
  // Smooth-scroll to the embed snippet so users see the generated script
  try { document.getElementById('embedSnippet')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
  $('domain').value = '';
  $('startUrl').value = '';
  showToast('Website added successfully');
  await fetchWebsites();
}

async function crawlWebsite(mode = 'full') {
  const selectId = $('crawlWebsiteSelect')?.value;
  const manualId = $('crawlWebsiteId')?.value?.trim();
  const websiteId = selectId || manualId;
  const startUrl = $('crawlUrl')?.value?.trim();

  if (!websiteId) {
    showInline($('crawlResult'), 'Select a website to crawl.', 'error');
    return;
  }

  showInline($('crawlResult'), 'Crawling… This may take a minute.', 'info');

  const res = await fetch(`${apiBase}/api/crawl`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ website_id: websiteId, start_url: startUrl || undefined, mode }),
  });
  const data = await res.json();

  if (!res.ok) {
    const msg = data.reason || data.error || 'Crawl failed.';
    let detail = msg;
    if (data.errors?.length) {
      detail += '<ul style="margin:8px 0 0;padding-left:20px">' + data.errors.map((e) => `<li>${escapeHtml(e.error)}</li>`).join('') + '</ul>';
    }
    showInline($('crawlResult'), detail, 'error');
    return;
  }

  let msg = data.message || `Crawled ${data.crawled} page(s).`;
  if (data.errors?.length) {
    msg += ` (${data.errors.length} page(s) skipped)`;
  }
  showInline($('crawlResult'), msg, 'success');
  showToast(`Crawled ${data.crawled} page(s)`);
  await fetchWebsites();
}

async function duplicateWebsite(websiteId) {
  const res = await fetch(`${apiBase}/api/websites/${websiteId}/duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || 'Duplicate failed', 'error');
    return;
  }
  showToast('Website duplicated');
  await fetchWebsites();
}

async function archiveWebsite(websiteId) {
  if (!confirm('Archive this website? You can restore it later from support.')) return;
  const res = await fetch(`${apiBase}/api/websites/${websiteId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ archived: true }),
  });
  if (!res.ok) {
    showToast('Archive failed', 'error');
    return;
  }
  showToast('Website archived');
  await fetchWebsites();
}

async function deleteWebsite(websiteId) {
  if (!confirm('Delete this website and all data? This cannot be undone.')) return;
  const res = await fetch(`${apiBase}/api/websites/${websiteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || data.reason || 'Delete failed', 'error');
    return;
  }
  showToast('Website deleted');
  await fetchWebsites();
}

async function loadWebsitePages() {
  const websiteId = $('contentWebsiteId')?.value;
  const pagesList = $('pagesList');
  if (!websiteId) {
    if (pagesList) pagesList.innerHTML = '';
    return;
  }

  showInline($('contentResult'), 'Loading knowledge…', 'info');

  try {
    const res = await fetch(`${apiBase}/api/websites/${websiteId}/pages`, { headers: getAuthHeaders(false) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showInline($('contentResult'), data.error || data.reason || 'Failed to load pages.', 'error');
      return;
    }

    let pages = await res.json();
    if (!Array.isArray(pages)) {
      showInline($('contentResult'), 'Unexpected response.', 'error');
      return;
    }

    const q = $('knowledgeSearch')?.value?.trim().toLowerCase();
    if (q) {
      pages = pages.filter((p) => (p.title || '').toLowerCase().includes(q) || (p.url || '').toLowerCase().includes(q));
    }

    showInline($('contentResult'), `${pages.length} document(s) indexed`, 'success');

    if (pages.length === 0) {
      pagesList.innerHTML = `
        <div class="ws-empty">
          <div class="ws-empty-icon">📄</div>
          <p>No indexed content yet. Crawl your website from the Websites tab.</p>
        </div>`;
      return;
    }

    pagesList.innerHTML = pages
      .map(
        (page) => `
      <div class="ws-chatbot-card">
        <strong>${escapeHtml(page.title || page.url)}</strong>
        <div class="ws-id" style="word-break:break-all">${escapeHtml(page.url)}</div>
        <div class="ws-btn-group">
          <button type="button" class="ws-btn ws-btn-secondary ws-btn-sm" data-recrawl="${page.id}">Re-crawl</button>
          <button type="button" class="ws-btn ws-btn-danger ws-btn-sm" data-delpage="${page.id}">Delete</button>
        </div>
      </div>`,
      )
      .join('');

    pagesList.querySelectorAll('[data-recrawl]').forEach((btn) => {
      btn.addEventListener('click', () => recrawlPage(websiteId, btn.getAttribute('data-recrawl')));
    });
    pagesList.querySelectorAll('[data-delpage]').forEach((btn) => {
      btn.addEventListener('click', () => deletePage(websiteId, btn.getAttribute('data-delpage')));
    });
  } catch (err) {
    showInline($('contentResult'), 'Network error loading pages.', 'error');
  }
}

async function deletePage(websiteId, pageId) {
  if (!confirm('Delete this document from the knowledge base?')) return;
  const res = await fetch(`${apiBase}/api/websites/${websiteId}/pages/${pageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  });
  if (!res.ok) {
    showToast('Delete failed', 'error');
    return;
  }
  showToast('Document removed');
  await loadWebsitePages();
}

async function recrawlPage(websiteId, pageId) {
  showInline($('contentResult'), 'Re-crawling…', 'info');
  const res = await fetch(`${apiBase}/api/websites/${websiteId}/pages/${pageId}/recrawl`, {
    method: 'POST',
    headers: getAuthHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) {
    showInline($('contentResult'), data.error || data.reason || 'Re-crawl failed.', 'error');
    return;
  }
  showInline($('contentResult'), `Re-crawled with ${data.chunks} chunk(s).`, 'success');
  await loadWebsitePages();
}

async function loadWidgetSettings() {
  const websiteId = $('widgetWebsiteId')?.value;
  if (!websiteId) return;

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/widget-settings`, { headers: getAuthHeaders(false) });
  const settings = await res.json();

  $('avatarUrl').value = settings.avatarUrl || settings.avatar_url || '';
  $('greetingMessage').value = settings.greetingMessage || settings.greeting_message || 'Hello! How can I help you today?';
  $('theme').value = settings.theme || 'dark';
  $('primaryColor').value = settings.primaryColor || settings.primary_color || '#00E5FF';
  selectedPosition = settings.position || 'bottom-right';
  $('selectedPosition').value = selectedPosition;

  document.querySelectorAll('.position-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.getAttribute('data-pos') === selectedPosition);
  });

  // Load suggested prompts (structured) into the widget settings UI
  try {
    const suggestions = Array.isArray(settings.suggestedPrompts) ? settings.suggestedPrompts : [];
    const container = document.getElementById('suggestionsContainer');
    if (container) {
      container.innerHTML = '';
      const ensure = Math.max(3, suggestions.length || 3);
      for (let i = 0; i < ensure; i += 1) {
        const s = suggestions[i] || { question: '', answer: '' };
        addSuggestionRow(s.question || '', s.answer || '');
      }
    }
  } catch (e) {
    // Non-fatal: keep existing suggestion rows
    console.warn('Failed to populate suggested prompts', e);
  }
}

function selectPosition(position) {
  selectedPosition = position;
  $('selectedPosition').value = position;
  document.querySelectorAll('.position-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.getAttribute('data-pos') === position);
  });
}

function addSuggestionRow(question = '', answer = '') {
  const container = $('suggestionsContainer');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'suggestion-row';
  row.innerHTML = `
    <input class="suggestion-question" placeholder="Question" value="${escapeHtml(question)}" />
    <textarea class="suggestion-answer" placeholder="Optional specific answer (leave empty for AI to answer)">${escapeHtml(answer)}</textarea>
    <button type="button" class="remove-suggestion ws-btn ws-btn-secondary ws-btn-sm" style="margin-left:8px;">Remove</button>
  `;
  container.appendChild(row);
  row.querySelector('.remove-suggestion')?.addEventListener('click', () => row.remove());
}

async function saveWidgetSettings() {
  const websiteId = $('widgetWebsiteId')?.value;
  if (!websiteId) {
    showInline($('widgetResult'), 'Select a website first.', 'error');
    return;
  }

  const settings = {
    avatarUrl: $('avatarUrl').value || null,
    greetingMessage: $('greetingMessage').value,
    position: selectedPosition,
    theme: $('theme').value,
    primaryColor: $('primaryColor').value,
  };

  // Collect structured suggested prompts from the UI
  try {
    const suggestionRows = Array.from(document.querySelectorAll('#suggestionsContainer .suggestion-row'));
    const suggestedPrompts = suggestionRows
      .map((row) => {
        const q = row.querySelector('.suggestion-question')?.value?.trim() || '';
        const a = row.querySelector('.suggestion-answer')?.value?.trim() || '';
        return q ? { question: q, answer: a || null } : null;
      })
      .filter(Boolean);
    // Always include the property so the API can persist an empty array if admin removed all
    settings.suggestedPrompts = suggestedPrompts;
  } catch (e) {
    console.warn('Failed to collect suggested prompts', e);
  }

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/widget-settings`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    const data = await res.json();
    showInline($('widgetResult'), data.error || 'Save failed.', 'error');
    return;
  }

  showInline($('widgetResult'), 'Widget settings saved.', 'success');
  showToast('Widget settings saved');
}

async function loadAiConfig() {
  const websiteId = $('aiWebsiteId')?.value;
  if (!websiteId) return;

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/ai-config`, { headers: getAuthHeaders(false) });
  if (!res.ok) return;
  const ai = await res.json();

  selectedPersonality = ai.personality || 'professional';
  document.querySelectorAll('#personalityChips .ws-chip').forEach((chip) => {
    chip.classList.toggle('selected', chip.getAttribute('data-value') === selectedPersonality);
  });
  $('aiTemperature').value = ai.temperature ?? 0.7;
  $('tempValue').textContent = $('aiTemperature').value;
  $('responseLength').value = ai.responseLength || 'medium';
  $('aiLanguage').value = ai.language || 'en';

  // Load suggested prompts (structured)
  const suggestions = settings.suggestedPrompts || [];
  const container = document.getElementById('suggestionsContainer');
  if (container) {
    // Clear existing rows and ensure at least 3 slots
    container.innerHTML = '';
    const ensure = Math.max(3, suggestions.length || 3);
    for (let i = 0; i < ensure; i += 1) {
      const s = suggestions[i] || { question: '', answer: '' };
      addSuggestionRow(s.question || '', s.answer || '');
    }
  }
  $('aiTone').value = ai.tone || 'helpful';
}

async function saveAiConfig() {
  const websiteId = $('aiWebsiteId')?.value;
  if (!websiteId) {
    showInline($('aiConfigResult'), 'Select a website first.', 'error');
    return;
  }

  const body = {
    personality: selectedPersonality,
    temperature: parseFloat($('aiTemperature').value),
    responseLength: $('responseLength').value,
    language: $('aiLanguage').value,
    tone: $('aiTone').value,
  };

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/ai-config`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json();
    showInline($('aiConfigResult'), data.error || 'Save failed.', 'error');
    return;
  }

  showInline($('aiConfigResult'), 'AI settings saved.', 'success');
  showToast('AI configuration saved');
}

async function loadAnalytics() {
  const websiteId = $('analyticsWebsiteId')?.value;
  const statsEl = $('analyticsStats');
  if (!websiteId || !statsEl) {
    statsEl.innerHTML = '<p class="ws-card-desc">Select a website to view analytics.</p>';
    return;
  }

  statsEl.innerHTML = '<div class="ws-skeleton"></div>'.repeat(4);

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/analytics`, { headers: getAuthHeaders(false) });
  if (!res.ok) {
    statsEl.innerHTML = '<div class="ws-alert ws-alert-error">Failed to load analytics.</div>';
    return;
  }

  const data = await res.json();

  statsEl.innerHTML = `
    <div class="ws-stat-card"><div class="ws-stat-value">${data.totalConversations}</div><div class="ws-stat-label">Conversations</div></div>
    <div class="ws-stat-card"><div class="ws-stat-value">${data.totalMessages}</div><div class="ws-stat-label">Messages</div></div>
    <div class="ws-stat-card"><div class="ws-stat-value">${data.activeUsers}</div><div class="ws-stat-label">Active users</div></div>
    <div class="ws-stat-card"><div class="ws-stat-value">${data.knowledgePages}</div><div class="ws-stat-label">Knowledge pages</div></div>
  `;

  const ctx = $('analyticsChart')?.getContext('2d');
  if (!ctx || typeof Chart === 'undefined') return;

  if (analyticsChart) analyticsChart.destroy();

  const labels = (data.trend || []).map((t) => t.date);
  const values = (data.trend || []).map((t) => t.messages);

  analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [
        {
          label: 'Messages',
          data: values.length ? values : [0],
          borderColor: '#00E5FF',
          backgroundColor: 'rgba(0, 229, 255, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
    },
  });
}

async function loadConversations() {
  const websiteId = $('convWebsiteId')?.value;
  const listEl = $('conversationsList');
  if (!websiteId) {
    listEl.innerHTML = 'Select a website to load conversations.';
    return;
  }

  listEl.innerHTML = 'Loading…';
  const res = await fetch(`${apiBase}/api/websites/${websiteId}/conversations`, { headers: getAuthHeaders(false) });
  const conversations = await res.json();

  if (!Array.isArray(conversations)) {
    listEl.innerHTML = '<div class="ws-alert ws-alert-error">Failed to load conversations.</div>';

  // collect suggestions
  const suggestionRows = Array.from(document.querySelectorAll('#suggestionsContainer .suggestion-row'));
  const suggestedPrompts = suggestionRows
    .map((row) => {
      const q = row.querySelector('.suggestion-question')?.value?.trim() || '';
      const a = row.querySelector('.suggestion-answer')?.value?.trim() || '';
      return q ? { question: q, answer: a || null } : null;
    })
    .filter(Boolean);

  if (suggestedPrompts.length) settings.suggestedPrompts = suggestedPrompts;
    return;
  }

  if (conversations.length === 0) {
    listEl.innerHTML = '<div class="ws-empty"><p>No conversations yet.</p></div>';
    return;
  }

  listEl.innerHTML = conversations
    .map(
      (conv) => `
    <div class="conversation-item" data-session="${conv.id}">
      <strong>Session ${conv.id.substring(0, 8)}</strong>
      <div class="timestamp">${new Date(conv.created_at).toLocaleString()}</div>
    </div>`,
    )
    .join('');

  listEl.querySelectorAll('.conversation-item').forEach((item) => {
    item.addEventListener('click', () => loadConversationMessages(item.getAttribute('data-session')));
  });
}

async function loadConversationMessages(sessionId) {
  const res = await fetch(`${apiBase}/api/conversations/${sessionId}/messages`, { headers: getAuthHeaders(false) });
  const messages = await res.json();
  const listEl = $('messagesList');

  if (!Array.isArray(messages)) {
    listEl.innerHTML = 'Failed to load messages.';
    return;
  }

  if (messages.length === 0) {
    listEl.innerHTML = 'No messages in this conversation.';
    return;
  }

  listEl.innerHTML = messages
    .map(
      (msg) => `
    <div class="message-item ${msg.role}">
      <strong>${msg.role === 'user' ? 'Visitor' : 'Assistant'}</strong>
      <div style="margin-top:8px">${escapeHtml(msg.content)}</div>
      <div class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</div>
    </div>`,
    )
    .join('');
}

async function searchConversations() {
  const websiteId = $('convWebsiteId')?.value;
  const startDate = $('startDate')?.value;
  const endDate = $('endDate')?.value;

  if (!websiteId || !startDate || !endDate) {
    showToast('Select website and date range', 'warning');
    return;
  }

  const query = new URLSearchParams({
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
  });

  const res = await fetch(`${apiBase}/api/websites/${websiteId}/conversations/search?${query}`, {
    headers: getAuthHeaders(false),
  });
  const conversations = await res.json();
  const listEl = $('conversationsList');

  if (!Array.isArray(conversations)) {
    listEl.innerHTML = 'Search failed.';
    return;
  }

  listEl.innerHTML =
    conversations.length > 0
      ? conversations
          .map(
            (conv) => `
      <div class="conversation-item" data-session="${conv.id}">
        <strong>Session ${conv.id.substring(0, 8)}</strong>
        <div class="timestamp">${new Date(conv.created_at).toLocaleString()}</div>
      </div>`,
          )
          .join('')
      : '<div class="ws-empty"><p>No conversations in this range.</p></div>';

  listEl.querySelectorAll('.conversation-item').forEach((item) => {
    item.addEventListener('click', () => loadConversationMessages(item.getAttribute('data-session')));
  });
}

async function copyEmbedSnippet() {
  const code = $('embedSnippet')?.textContent || '';
  if (!code || code.includes('Create a chatbot')) {
    showToast('No embed code to copy', 'warning');
    return;
  }
  try {
    await navigator.clipboard.writeText(code);
    showToast('Script copied successfully');
    showInline($('embedMsg'), 'Script copied successfully', 'success');
  } catch {
    showToast('Copy failed — select and copy manually', 'error');
  }
}

async function saveProfile() {
  const res = await fetch(`${apiBase}/api/me`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify({
      display_name: $('displayName').value.trim(),
      avatar_url: $('accountAvatar').value.trim(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    showInline($('accountResult'), data.error || 'Update failed.', 'error');
    return;
  }
  showInline($('accountResult'), 'Profile updated.', 'success');
  showToast('Profile updated');
}

async function deleteAccount() {
  if (!confirm('Delete all your websites, pages, and conversations? Auth login remains in Supabase.')) return;
  const res = await fetch(`${apiBase}/api/me`, { method: 'DELETE', headers: getAuthHeaders(false) });
  if (!res.ok) {
    showToast('Delete failed', 'error');
    return;
  }
  Auth.signOut();
}

const TAB_TITLES = {
  chatbots: 'Websites',
  knowledge: 'Knowledge Base',
  training: 'AI Configuration',
  widget: 'Widget',
  analytics: 'Analytics',
  conversations: 'Conversations',
  howitworks: 'How It Works',
  account: 'Account',
};

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.ws-nav-item').forEach((el) => el.classList.remove('active'));

  $(tabName)?.classList.add('active');
  document.querySelector(`.ws-nav-item[data-tab="${tabName}"]`)?.classList.add('active');

  const title = $('pageTitle');
  if (title) title.textContent = TAB_TITLES[tabName] || 'Dashboard';

  if (tabName === 'analytics') loadAnalytics();
  if (tabName === 'account' && currentUser) populateAccount(currentUser);

  history.replaceState(null, '', `#${tabName}`);
}

window.switchTab = switchTab;

function populateAccount(me) {
  $('accountInfo').innerHTML = `<p><strong>Email:</strong> ${escapeHtml(me.user.email)}</p>`;
  $('displayName').value = me.profile?.display_name || me.profile?.name || '';
  $('accountAvatar').value = me.profile?.avatar_url || '';
}

async function initDashboard() {
  Auth.captureOAuthToken();
  currentUser = await Auth.requireAuth('/login.html');
  if (!currentUser) return;

  Auth.renderNav($('authControls'), currentUser);
  populateAccount(currentUser);

  const hash = (location.hash || '#chatbots').replace('#', '');
  if ($(hash)) switchTab(hash);
  else switchTab('chatbots');

  await fetchWebsites();
}

document.addEventListener('DOMContentLoaded', () => {
  $('createWebsite')?.addEventListener('click', createWebsite);
  $('startCrawlFull')?.addEventListener('click', () => crawlWebsite('full'));
  $('startCrawlSingle')?.addEventListener('click', () => crawlWebsite('single'));
  $('copyEmbedBtn')?.addEventListener('click', copyEmbedSnippet);
  $('retryWebsites')?.addEventListener('click', fetchWebsites);
  $('refreshPages')?.addEventListener('click', loadWebsitePages);
  $('knowledgeSearch')?.addEventListener('input', loadWebsitePages);
  $('contentWebsiteId')?.addEventListener('change', loadWebsitePages);
  $('widgetWebsiteId')?.addEventListener('change', loadWidgetSettings);
  $('saveWidgetSettings')?.addEventListener('click', saveWidgetSettings);
  $('addSuggestion')?.addEventListener('click', () => addSuggestionRow());
  document.querySelectorAll('.remove-suggestion').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const row = btn.closest('.suggestion-row');
      row?.remove();
    });
  });
  $('aiWebsiteId')?.addEventListener('change', loadAiConfig);
  $('saveAiConfig')?.addEventListener('click', saveAiConfig);
  $('analyticsWebsiteId')?.addEventListener('change', loadAnalytics);
  $('convWebsiteId')?.addEventListener('change', loadConversations);
  $('searchConvBtn')?.addEventListener('click', searchConversations);
  $('clearConvBtn')?.addEventListener('click', loadConversations);
  $('saveProfile')?.addEventListener('click', saveProfile);
  $('deleteAccount')?.addEventListener('click', deleteAccount);
  $('crawlWebsiteSelect')?.addEventListener('change', (e) => {
    $('crawlWebsiteId').value = e.target.value;
  });

  $('aiTemperature')?.addEventListener('input', (e) => {
    $('tempValue').textContent = e.target.value;
  });

  document.querySelectorAll('#personalityChips .ws-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      selectedPersonality = chip.getAttribute('data-value');
      document.querySelectorAll('#personalityChips .ws-chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  document.querySelectorAll('.position-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectPosition(btn.getAttribute('data-pos')));
  });

  document.querySelectorAll('.ws-nav-item[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  $('menuToggle')?.addEventListener('click', () => {
    $('sidebar')?.classList.toggle('open');
  });

  initDashboard();
});
