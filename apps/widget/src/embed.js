const config = window.AI_CHATBOT_WIDGET_CONFIG || {};
const scriptEl = document.currentScript || Array.from(document.getElementsByTagName('script')).find((tag) => tag.src && tag.src.includes('embed.js'));
const websiteId = config.websiteId || scriptEl?.dataset?.websiteId;
const apiUrl = config.apiUrl || scriptEl?.dataset?.apiUrl;

if (!websiteId || !apiUrl) {
  console.error('AI chatbot widget requires websiteId and apiUrl.');
} else {
  let widgetSettings = {
    avatarUrl: null,
    greetingMessage: 'Hello! How can I help you today?',
    position: 'bottom-right',
    theme: 'light',
    primaryColor: '#2563eb',
  };

  // Fetch widget settings from API
  fetch(`${apiUrl.replace('/api/chat', '')}/api/websites/${websiteId}/widget-settings`)
    .then(res => res.json())
    .then(settings => {
      widgetSettings = settings;
      initializeWidget(widgetSettings);
    })
    .catch(err => {
      console.error('Failed to load widget settings:', err);
      initializeWidget(widgetSettings);
    });

  function getPositionStyles(position) {
    const isMobile = window.innerWidth < 768;
    const mobilePosition = isMobile ? 'bottom-left' : position;
    
    const positions = {
      'top-left': { top: '20px', left: '20px', bottom: 'auto', right: 'auto' },
      'top-right': { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
      'middle-left': { top: '50%', left: '20px', bottom: 'auto', right: 'auto', transform: 'translateY(-50%)' },
      'middle-right': { top: '50%', right: '20px', bottom: 'auto', left: 'auto', transform: 'translateY(-50%)' },
      'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
      'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
    };
    return positions[mobilePosition] || positions['bottom-right'];
  }

  function parseMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n- /g, '<br>• ')
      .replace(/\n\d+\. /g, '<br>')
      .replace(/\n/g, '<br>');
  }

  function detectAndRenderComponents(text) {
    let html = parseMarkdown(text);
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    html = html.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">🔗 ${new URL(url).hostname}</a>`;
    });
    
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    html = html.replace(emailRegex, (email) => {
      return `<a href="mailto:${email}" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">📧 ${email}</a>`;
    });
    
    const phoneRegex = /(\+?1?\s?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    html = html.replace(phoneRegex, (phone) => {
      return `<a href="tel:${phone.replace(/\D/g, '')}" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">☎️ ${phone}</a>`;
    });
    
    return html;
  }

  function initializeWidget(settings) {
    const style = document.createElement('style');
    style.textContent = `
      .ai-chatbot-widget-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      }

      @media (max-width: 768px) {
        .ai-chatbot-widget-container {
          bottom: 10px !important;
          left: 8px !important;
          right: 8px !important;
          top: auto !important;
          width: calc(100vw - 16px) !important;
          max-width: calc(100vw - 16px) !important;
        }
      }

      .ai-chatbot-open-btn {
        position: fixed;
        z-index: 999999;
        padding: 12px 16px;
        background: ${settings.primaryColor};
        color: white;
        border: none;
        border-radius: 999px;
        font-size: 1rem;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.2s ease;
        display: inline-block;
      }

      .ai-chatbot-open-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .ai-chatbot-open-btn:active {
        transform: scale(0.98);
      }

      .ai-chatbot-panel {
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 520px;
        width: 320px;
        max-width: calc(100vw - 32px);
      }

      @media (max-width: 768px) {
        .ai-chatbot-panel {
          height: 60vh;
          max-height: 600px;
          width: calc(100vw - 16px);
          max-width: calc(100vw - 16px);
        }
      }

      .ai-chatbot-header {
        padding: 16px;
        background: ${settings.primaryColor};
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .ai-chatbot-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255,255,255,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
      }

      .ai-chatbot-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }

      .ai-chatbot-title {
        flex: 1;
        font-weight: 600;
      }

      .ai-chatbot-close-btn {
        width: 36px;
        height: 36px;
        padding: 0;
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .ai-chatbot-close-btn:hover {
        background: rgba(255,255,255,0.3);
      }

      .ai-chatbot-body {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #fafbfc;
      }

      .ai-chatbot-message {
        padding: 12px 14px;
        border-radius: 16px;
        max-width: 90%;
        word-wrap: break-word;
        line-height: 1.4;
      }

      .ai-chatbot-message.user {
        background: ${settings.primaryColor};
        align-self: flex-end;
        color: white;
      }

      .ai-chatbot-message.bot {
        background: white;
        align-self: flex-start;
        color: #1f2937;
        border: 1px solid #e5e7eb;
      }

      .ai-chatbot-input-row {
        display: flex;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
        align-items: flex-end;
      }

      .ai-chatbot-input {
        flex: 1;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid #cbd5e1;
        font-size: 0.95rem;
        font-family: inherit;
        resize: none;
        max-height: 100px;
        min-height: 44px;
        overflow-y: auto;
      }

      .ai-chatbot-input:focus {
        outline: none;
        border-color: ${settings.primaryColor};
        box-shadow: 0 0 0 3px ${settings.primaryColor}33;
      }

      .ai-chatbot-send-btn {
        padding: 12px 18px;
        background: ${settings.primaryColor};
        color: white;
        border: none;
        border-radius: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .ai-chatbot-send-btn:hover {
        background: ${settings.primaryColor}dd;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .ai-chatbot-send-btn:active {
        transform: scale(0.98);
      }

      @media (max-width: 768px) {
        .ai-chatbot-input-row {
          flex-wrap: wrap;
        }

        .ai-chatbot-input {
          width: 100%;
        }

        .ai-chatbot-send-btn {
          width: 100%;
        }
      }

      a {
        color: inherit;
      }
    `;
    document.head.appendChild(style);

    const positionStyles = getPositionStyles(settings.position);
    const openBtn = document.createElement('button');
    openBtn.className = 'ai-chatbot-open-btn';
    Object.assign(openBtn.style, positionStyles);
    openBtn.innerHTML = '💬 Chat';
    openBtn.id = 'ai-chatbot-open';

    const container = document.createElement('div');
    container.className = 'ai-chatbot-widget-container';
    Object.assign(container.style, positionStyles);
    container.style.width = '320px';
    container.style.maxWidth = 'calc(100vw - 32px)';

    const panel = document.createElement('div');
    panel.className = 'ai-chatbot-panel';
    panel.style.display = 'none';
    panel.id = 'ai-chatbot-panel';

    const header = document.createElement('div');
    header.className = 'ai-chatbot-header';
    header.innerHTML = `
      <div class="ai-chatbot-avatar">
        ${settings.avatarUrl 
          ? `<img src="${settings.avatarUrl}" alt="Bot Avatar" onerror="this.parentElement.textContent='🤖'" />` 
          : '🤖'
        }
      </div>
      <div class="ai-chatbot-title">Website Assistant</div>
      <button class="ai-chatbot-close-btn" id="ai-chatbot-close">×</button>
    `;

    const body = document.createElement('div');
    body.className = 'ai-chatbot-body';
    body.id = 'ai-chatbot-body';

    const inputRow = document.createElement('div');
    inputRow.className = 'ai-chatbot-input-row';

    const input = document.createElement('textarea');
    input.className = 'ai-chatbot-input';
    input.id = 'ai-chatbot-input';
    input.placeholder = 'Ask a question...';
    input.rows = 1;

    const sendBtn = document.createElement('button');
    sendBtn.className = 'ai-chatbot-send-btn';
    sendBtn.id = 'ai-chatbot-send';
    sendBtn.textContent = 'Send';

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(inputRow);

    container.appendChild(panel);

    document.body.appendChild(openBtn);
    document.body.appendChild(container);

    const closeBtn = panel.querySelector('#ai-chatbot-close');

    // conversation persistence
    const storageKey = `ai_chatbot_${websiteId}_conversation`;
    let messagesArray = [];
    let sessionId = null;

    function saveConversationToStorage() {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ sessionId, messages: messagesArray }));
      } catch (e) {
        console.error('Failed to save conversation', e);
      }
    }

    function loadConversationFromStorage() {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.messages)) return false;
        sessionId = parsed.sessionId || null;
        messagesArray = parsed.messages || [];
        messagesArray.forEach(m => {
          const msg = document.createElement('div');
          msg.className = `ai-chatbot-message ${m.role}`;
          msg.innerHTML = detectAndRenderComponents(m.text);
          body.appendChild(msg);
        });
        body.scrollTop = body.scrollHeight;
        return true;
      } catch (e) {
        console.error('Failed to load conversation', e);
        return false;
      }
    }

    function addMessage(text, role) {
      const msg = document.createElement('div');
      msg.className = `ai-chatbot-message ${role}`;
      msg.innerHTML = detectAndRenderComponents(text);
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;

      // update memory and persist
      if (role === 'bot' && messagesArray.length > 0 && messagesArray[messagesArray.length - 1].role === 'bot' && messagesArray[messagesArray.length - 1].text === '⏳ Thinking...') {
        // replace placeholder bot message
        messagesArray[messagesArray.length - 1].text = text;
      } else {
        messagesArray.push({ role, text });
      }
      saveConversationToStorage();
    }

    const hadStored = loadConversationFromStorage();
    if (!hadStored) addMessage(settings.greetingMessage, 'bot');

    function autoExpandInput() {
      input.style.height = 'auto';
      const newHeight = Math.min(input.scrollHeight, 100);
      input.style.height = newHeight + 'px';
    }

    input.addEventListener('input', autoExpandInput);

    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;

      addMessage(message, 'user');
      input.value = '';
      input.style.height = 'auto';
      addMessage('⏳ Thinking...', 'bot');

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website_id: websiteId, message, session_id: sessionId }),
        });

        const data = await response.json();

        if (!sessionId && data.sessionId) {
          sessionId = data.sessionId;
        }

        const botText = data.answer || data.error || 'Sorry, I could not answer that.';
        const lastMsg = body.querySelector('.ai-chatbot-message.bot:last-child');
        if (lastMsg) {
          lastMsg.innerHTML = detectAndRenderComponents(botText);
        }
        // update stored conversation
        if (messagesArray.length > 0 && messagesArray[messagesArray.length - 1].role === 'bot') {
          messagesArray[messagesArray.length - 1].text = botText;
          saveConversationToStorage();
        }
      } catch (error) {
        const lastMsg = body.querySelector('.ai-chatbot-message.bot:last-child');
        if (lastMsg) {
          lastMsg.textContent = 'Unable to reach the chat server.';
          if (messagesArray.length > 0 && messagesArray[messagesArray.length - 1].role === 'bot') {
            messagesArray[messagesArray.length - 1].text = 'Unable to reach the chat server.';
            saveConversationToStorage();
          }
        }
        console.error('Chat error:', error);
      }
    }

    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.style.display = 'flex';
      openBtn.style.display = 'none';
      setTimeout(() => input.focus(), 100);
    });

    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.style.display = 'none';
      openBtn.style.display = 'inline-block';
    });

    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage();
    });

    input.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    window.addEventListener('resize', () => {
      const newStyles = getPositionStyles(settings.position);
      Object.assign(openBtn.style, newStyles);
      Object.assign(container.style, newStyles);
      container.style.width = '320px';
      container.style.maxWidth = 'calc(100vw - 32px)';
    });
  }
}
