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

      .ai-chatbot-tab-container {
        display: flex;
        gap: 0;
        border-bottom: 2px solid #e5e7eb;
        background: white;
        padding: 0;
      }

      .ai-chatbot-tab {
        flex: 1;
        padding: 12px 16px;
        background: white;
        border: none;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.9rem;
        color: #6b7280;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
      }

      .ai-chatbot-tab.active {
        color: ${settings.primaryColor};
        border-bottom-color: ${settings.primaryColor};
      }

      .ai-chatbot-tab-content {
        display: none;
        flex-direction: column;
      }

      .ai-chatbot-tab-content.active {
        display: flex;
      }

      .ai-chatbot-voice-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px;
        align-items: center;
        justify-content: center;
        flex: 1;
      }

      .ai-chatbot-waveform {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        height: 40px;
        min-width: 200px;
      }

      .ai-chatbot-waveform-bar {
        width: 3px;
        height: 8px;
        background: ${settings.primaryColor};
        border-radius: 2px;
        animation: waveform-pulse 0.5s ease-in-out infinite;
      }

      @keyframes waveform-pulse {
        0%, 100% { height: 8px; opacity: 0.4; }
        50% { height: 24px; opacity: 1; }
      }

      .ai-chatbot-waveform-bar:nth-child(1) { animation-delay: 0.1s; }
      .ai-chatbot-waveform-bar:nth-child(2) { animation-delay: 0.2s; }
      .ai-chatbot-waveform-bar:nth-child(3) { animation-delay: 0.3s; }
      .ai-chatbot-waveform-bar:nth-child(4) { animation-delay: 0.4s; }
      .ai-chatbot-waveform-bar:nth-child(5) { animation-delay: 0.5s; }

      .ai-chatbot-mic-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${settings.primaryColor};
        color: white;
        border: none;
        cursor: pointer;
        font-size: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.2s;
      }

      .ai-chatbot-mic-btn:hover {
        background: ${settings.primaryColor}dd;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .ai-chatbot-mic-btn:active {
        transform: scale(0.95);
      }

      .ai-chatbot-mic-btn.recording {
        background: #ef4444;
        animation: pulse-recording 1s ease-in-out infinite;
      }

      @keyframes pulse-recording {
        0%, 100% { box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
        50% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.8); }
      }

      .ai-chatbot-voice-status {
        font-size: 0.85rem;
        color: #6b7280;
        min-height: 20px;
        text-align: center;
      }

      .ai-chatbot-open-btn {
        position: fixed;
        z-index: 999999;
        padding: 12px 16px;
        background: ${settings.primaryColor};
        color: white;
        border: none;
        border-radius: 24px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.2s;
        font-size: 0.9rem;
      }

      .ai-chatbot-open-btn:hover {
        background: ${settings.primaryColor}dd;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .ai-chatbot-open-btn:active {
        transform: scale(0.98);
      }

      .ai-chatbot-panel {
        display: flex;
        flex-direction: column;
        background: white;
        border-radius: 12px;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
        overflow: hidden;
        height: 500px;
      }

      .ai-chatbot-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: ${settings.primaryColor};
        color: white;
      }

      .ai-chatbot-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
        overflow: hidden;
      }

      .ai-chatbot-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ai-chatbot-title {
        flex: 1;
        font-weight: bold;
        font-size: 0.95rem;
      }

      .ai-chatbot-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }

      .ai-chatbot-close-btn:hover {
        transform: scale(1.1);
      }

      .ai-chatbot-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
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

    const tabContainer = document.createElement('div');
    tabContainer.className = 'ai-chatbot-tab-container';
    
    const chatTab = document.createElement('button');
    chatTab.className = 'ai-chatbot-tab active';
    chatTab.textContent = '💬 Chat';
    chatTab.id = 'ai-chatbot-tab-chat';
    
    const voiceTab = document.createElement('button');
    voiceTab.className = 'ai-chatbot-tab';
    voiceTab.textContent = '🎤 Voice';
    voiceTab.id = 'ai-chatbot-tab-voice';
    
    tabContainer.appendChild(chatTab);
    tabContainer.appendChild(voiceTab);

    const body = document.createElement('div');
    body.className = 'ai-chatbot-body';
    body.id = 'ai-chatbot-body';

    // Chat content (text mode)
    const chatContent = document.createElement('div');
    chatContent.className = 'ai-chatbot-tab-content active';
    chatContent.id = 'ai-chatbot-chat-content';
    chatContent.style.flex = '1';

    const chatMessages = document.createElement('div');
    chatMessages.className = 'ai-chatbot-body';
    chatMessages.id = 'ai-chatbot-messages';
    chatContent.appendChild(chatMessages);

    // Voice content (voice mode)
    const voiceContent = document.createElement('div');
    voiceContent.className = 'ai-chatbot-tab-content';
    voiceContent.id = 'ai-chatbot-voice-content';
    voiceContent.style.flex = '1';

    const voiceContainer = document.createElement('div');
    voiceContainer.className = 'ai-chatbot-voice-container';

    const waveform = document.createElement('div');
    waveform.className = 'ai-chatbot-waveform';
    waveform.id = 'ai-chatbot-waveform';
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('div');
      bar.className = 'ai-chatbot-waveform-bar';
      waveform.appendChild(bar);
    }

    const micBtn = document.createElement('button');
    micBtn.className = 'ai-chatbot-mic-btn';
    micBtn.id = 'ai-chatbot-mic';
    micBtn.innerHTML = '🎤';

    const voiceStatus = document.createElement('div');
    voiceStatus.className = 'ai-chatbot-voice-status';
    voiceStatus.id = 'ai-chatbot-voice-status';
    voiceStatus.textContent = 'Click to start recording';

    voiceContainer.appendChild(waveform);
    voiceContainer.appendChild(micBtn);
    voiceContainer.appendChild(voiceStatus);
    voiceContent.appendChild(voiceContainer);

    body.appendChild(chatContent);
    body.appendChild(voiceContent);

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
    panel.appendChild(tabContainer);
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
          chatMessages.appendChild(msg);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
      chatMessages.appendChild(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // update memory and persist
      if (role === 'bot' && messagesArray.length > 0 && messagesArray[messagesArray.length - 1].role === 'bot' && messagesArray[messagesArray.length - 1].text === '⏳ Thinking...') {
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
        const lastMsg = chatMessages.querySelector('.ai-chatbot-message.bot:last-child');
        if (lastMsg) {
          lastMsg.innerHTML = detectAndRenderComponents(botText);
        }
        if (messagesArray.length > 0 && messagesArray[messagesArray.length - 1].role === 'bot') {
          messagesArray[messagesArray.length - 1].text = botText;
          saveConversationToStorage();
        }
      } catch (error) {
        const lastMsg = chatMessages.querySelector('.ai-chatbot-message.bot:last-child');
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

    // ==================== VOICE FUNCTIONALITY ====================
    let mediaRecorder;
    let recordedChunks = [];
    let isRecording = false;

    const micBtnElement = panel.querySelector('#ai-chatbot-mic');
    const voiceStatusElement = panel.querySelector('#ai-chatbot-voice-status');

    async function initializeVoiceRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
          recordedChunks = [];
          isRecording = false;
          micBtnElement.classList.remove('recording');
          voiceStatusElement.textContent = 'Processing...';

          await sendVoiceMessage(audioBlob);
        };

        return true;
      } catch (error) {
        console.error('Microphone permission denied:', error);
        voiceStatusElement.textContent = 'Microphone permission denied';
        return false;
      }
    }

    async function sendVoiceMessage(audioBlob) {
      try {
        const formData = new FormData();
        formData.append('website_id', websiteId);
        formData.append('session_id', sessionId || '');
        formData.append('audio', audioBlob, 'audio.webm');

        const voiceApiUrl = apiUrl.replace('/api/chat', '/api/voice/respond');
        const response = await fetch(voiceApiUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Voice API error: ' + response.status);
        }

        const data = await response.json();

        if (!sessionId && data.sessionId) {
          sessionId = data.sessionId;
        }

        const botText = data.answer || 'Sorry, I could not answer that.';
        
        // Add to chat history
        addMessage(botText, 'bot');

        // Play audio response using Web Speech API
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(botText);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
          voiceStatusElement.textContent = 'Playing response...';
          
          utterance.onend = () => {
            voiceStatusElement.textContent = 'Click to record';
          };
        }
      } catch (error) {
        console.error('Voice message error:', error);
        voiceStatusElement.textContent = 'Error processing audio';
      }
    }

    micBtnElement.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!mediaRecorder) {
        const initialized = await initializeVoiceRecording();
        if (!initialized) return;
      }

      if (!isRecording) {
        recordedChunks = [];
        mediaRecorder.start();
        isRecording = true;
        micBtnElement.classList.add('recording');
        voiceStatusElement.textContent = 'Recording...';
      } else {
        mediaRecorder.stop();
      }
    });

    // ==================== TAB SWITCHING ====================
    const chatTabBtn = panel.querySelector('#ai-chatbot-tab-chat');
    const voiceTabBtn = panel.querySelector('#ai-chatbot-tab-voice');
    const chatContentDiv = panel.querySelector('#ai-chatbot-chat-content');
    const voiceContentDiv = panel.querySelector('#ai-chatbot-voice-content');

    function switchTab(tab) {
      chatTabBtn.classList.remove('active');
      voiceTabBtn.classList.remove('active');
      chatContentDiv.classList.remove('active');
      voiceContentDiv.classList.remove('active');

      if (tab === 'chat') {
        chatTabBtn.classList.add('active');
        chatContentDiv.classList.add('active');
        inputRow.style.display = 'flex';
      } else {
        voiceTabBtn.classList.add('active');
        voiceContentDiv.classList.add('active');
        inputRow.style.display = 'none';
      }
    }

    chatTabBtn.addEventListener('click', () => switchTab('chat'));
    voiceTabBtn.addEventListener('click', () => switchTab('voice'));

    // ==================== EVENT HANDLERS ====================
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
