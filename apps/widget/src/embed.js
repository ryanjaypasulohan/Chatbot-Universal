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
    suggestedPrompts: [],
  };

  // Persistence helpers
  const storageKey = `ai_chatbot_${websiteId}`;
  let sessionId = null;
  let messagesArray = [];
  let isProcessing = false;
  let suggestionsRemoved = false;

  function saveConversation() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ sessionId, messages: messagesArray }));
    } catch (e) {}
  }

  function loadConversation() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed.sessionId) sessionId = parsed.sessionId;
      if (Array.isArray(parsed.messages)) {
        messagesArray = parsed.messages;
        return true;
      }
    } catch (e) {}
    return false;
  }

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
    return (text || '')
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
      try { return `<a href="${url}" target="_blank" class="cta-link">🔗 ${new URL(url).hostname}</a>`; } catch (e) { return url; }
    });
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    html = html.replace(emailRegex, (email) => `<a href="mailto:${email}" class="cta-link">📧 ${email}</a>`);
    const phoneRegex = /(\+?1?\s?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    html = html.replace(phoneRegex, (phone) => `<a href="tel:${phone.replace(/\D/g, '')}" class="cta-link">☎️ ${phone}</a>`);
    return html;
  }

  function removeSuggestions() {
    if (suggestionsRemoved) return;
    const suggestionsContainer = document.querySelector('#ai-chatbot-suggestions');
    if (suggestionsContainer) suggestionsContainer.style.display = 'none';
    const floatingSuggestions = document.querySelector('.ai-chatbot-floating-suggestions');
    if (floatingSuggestions) floatingSuggestions.style.display = 'none';
    suggestionsRemoved = true;
  }

  function initializeWidget(settings) {
    const style = document.createElement('style');
    style.textContent = `
      /* base widget container */
      .ai-chatbot-widget {
        position: fixed;
        ${Object.entries(getPositionStyles(settings.position)).map(([k, v]) => (k === 'transform' ? `${k}: ${v};` : `${k}: ${v};`)).join(' ')}
        max-width: calc(100vw - 32px);
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        z-index: 999999;
      }
      /* open button */
      .ai-chatbot-open-btn {
        background: ${settings.primaryColor};
        border: none;
        color: white;
        font-weight: 500;
        padding: 12px 20px;
        border-radius: 40px;
        font-size: 1rem;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        transition: all 0.2s ease;
        backdrop-filter: blur(4px);
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .ai-chatbot-open-btn:hover {
        transform: scale(1.02);
        box-shadow: 0 12px 24px rgba(0,0,0,0.2);
      }
      /* main panel */
      .ai-chatbot-panel {
        background: #ffffff;
        border-radius: 28px;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 600px;
        width: 380px;
        max-width: calc(100vw - 24px);
        transition: all 0.2s ease;
      }
      @media (max-width: 768px) {
        .ai-chatbot-panel {
          height: 70vh;
          width: 100%;
          border-radius: 24px;
        }
      }
      /* header */
      .ai-chatbot-header {
        background: ${settings.primaryColor};
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
      }
      .ai-chatbot-avatar {
        width: 44px;
        height: 44px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        overflow: hidden;
      }
      .ai-chatbot-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ai-chatbot-header-title {
        flex: 1;
        font-weight: 600;
        font-size: 1.1rem;
        letter-spacing: -0.2px;
      }
      .ai-chatbot-header button {
        background: rgba(255,255,255,0.15);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: 0.2s;
      }
      .ai-chatbot-header button:hover {
        background: rgba(255,255,255,0.3);
      }
      /* voice status area */
      .ai-voice-status-area {
        background: #f8fafc;
        border-bottom: 1px solid #eef2f6;
        padding: 12px 16px;
        display: none;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .ai-voice-circle {
        width: 40px;
        height: 40px;
        background: radial-gradient(circle at 30% 30%, rgba(0,229,255,0.2), transparent 70%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.1s;
      }
      .ai-voice-circle.speaking {
        animation: voicePulse 0.8s ease-in-out infinite;
      }
      @keyframes voicePulse {
        0% { transform: scale(1); opacity: 0.7; box-shadow: 0 0 0 0 rgba(0,229,255,0.4); }
        50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 0 8px rgba(0,229,255,0); }
        100% { transform: scale(1); opacity: 0.7; }
      }
      .ai-status-text {
        font-size: 0.85rem;
        color: #334155;
        font-weight: 500;
      }
      /* chat body */
      .ai-chatbot-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: #ffffff;
        scroll-behavior: smooth;
      }
      /* message bubbles */
      .message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 24px;
        line-height: 1.45;
        font-size: 0.95rem;
        word-wrap: break-word;
        animation: fadeInUp 0.2s ease;
      }
      .message.user {
        background: ${settings.primaryColor};
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 6px;
      }
      .message.bot {
        background: #f1f5f9;
        color: #0f172a;
        align-self: flex-start;
        border-bottom-left-radius: 6px;
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      /* typing indicator */
      .typing-indicator {
        display: flex;
        gap: 4px;
        align-items: center;
        background: #f1f5f9;
        padding: 12px 16px;
        border-radius: 24px;
        width: fit-content;
        border-bottom-left-radius: 6px;
      }
      .typing-dot {
        width: 8px;
        height: 8px;
        background: #94a3b8;
        border-radius: 50%;
        animation: typingAnim 1.2s infinite ease;
      }
      .typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typingAnim {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
      /* suggestions */
      .ai-chatbot-suggestions {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .suggestion {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 40px;
        padding: 10px 16px;
        text-align: left;
        font-size: 0.85rem;
        cursor: pointer;
        transition: 0.2s;
        color: #1e293b;
        font-weight: 500;
      }
      .suggestion:hover {
        background: #f8fafc;
        border-color: ${settings.primaryColor};
        transform: translateX(4px);
      }
      .floating-suggestions {
        position: fixed;
        background: white;
        border-radius: 24px;
        padding: 12px;
        box-shadow: 0 20px 35px -12px rgba(0,0,0,0.2);
        backdrop-filter: blur(4px);
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 280px;
        z-index: 999998;
      }
      .floating-suggestions .suggestion {
        border: none;
        background: #f8fafc;
      }
      /* input row */
      .ai-chatbot-input-row {
        display: flex;
        gap: 12px;
        padding: 16px 20px;
        background: white;
        border-top: 1px solid #edf2f7;
        align-items: center;
      }
      .ai-chatbot-input {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 40px;
        padding: 12px 18px;
        font-size: 0.95rem;
        transition: 0.2s;
        background: #ffffff;
      }
      .ai-chatbot-input:focus {
        outline: none;
        border-color: ${settings.primaryColor};
        box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
      }
      .ai-chatbot-send, .ai-chatbot-mic, .ai-chatbot-stop {
        background: ${settings.primaryColor};
        border: none;
        border-radius: 40px;
        padding: 10px 18px;
        font-weight: 600;
        cursor: pointer;
        transition: 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .ai-chatbot-send:disabled, .ai-chatbot-mic:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      .ai-chatbot-mic.recording {
        background: #ef4444;
        animation: micPulse 1s infinite;
      }
      @keyframes micPulse {
        0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
        70% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
      }
      /* cta links inside messages */
      .cta-link {
        display: inline-block;
        background: ${settings.primaryColor};
        color: white !important;
        border-radius: 20px;
        padding: 5px 12px;
        margin: 2px 4px 2px 0;
        text-decoration: none;
        font-size: 0.8rem;
        font-weight: 500;
      }
      .cta-link:hover {
        opacity: 0.85;
      }
      /* scrollbar */
      .ai-chatbot-body::-webkit-scrollbar {
        width: 5px;
      }
      .ai-chatbot-body::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      .ai-chatbot-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
    `;
    document.head.appendChild(style);

    // Build DOM
    const widget = document.createElement('div');
    widget.className = 'ai-chatbot-widget';
    widget.innerHTML = `
      <button class="ai-chatbot-open-btn" id="ai-chatbot-open">💬 Chat</button>
      <div class="ai-chatbot-panel" id="ai-chatbot-panel" style="display:none;">
        <div class="ai-chatbot-header">
          <div class="ai-chatbot-avatar">
            ${settings.avatarUrl ? `<img src="${settings.avatarUrl}" alt="Bot" />` : '🤖'}
          </div>
          <div class="ai-chatbot-header-title">Assistant</div>
          <div>
            <button id="ai-chatbot-mic" class="ai-chatbot-mic" title="Voice input">🎤</button>
            <button id="ai-chatbot-stop" class="ai-chatbot-stop" style="display:none;">⏹️</button>
            <button id="ai-chatbot-close" style="background:transparent;">✕</button>
          </div>
        </div>
        <div id="ai-chatbot-voice-status-area" class="ai-voice-status-area">
          <div class="ai-voice-circle"></div>
          <div class="ai-status-text">Ready</div>
        </div>
        <div class="ai-chatbot-body" id="ai-chatbot-body"></div>
        <div class="ai-chatbot-input-row">
          <input type="text" class="ai-chatbot-input" id="ai-chatbot-input" placeholder="Ask anything..." />
          <button class="ai-chatbot-send" id="ai-chatbot-send">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    const floatingSuggestions = document.createElement('div');
    floatingSuggestions.className = 'floating-suggestions';
    floatingSuggestions.style.display = 'none';
    document.body.appendChild(floatingSuggestions);

    const openButton = widget.querySelector('#ai-chatbot-open');
    const closeButton = widget.querySelector('#ai-chatbot-close');
    const panel = widget.querySelector('#ai-chatbot-panel');
    const bodyDiv = widget.querySelector('#ai-chatbot-body');
    const input = widget.querySelector('#ai-chatbot-input');
    const sendButton = widget.querySelector('#ai-chatbot-send');
    const micButton = widget.querySelector('#ai-chatbot-mic');
    const stopButton = widget.querySelector('#ai-chatbot-stop');
    const voiceStatusArea = widget.querySelector('#ai-chatbot-voice-status-area');
    const voiceCircle = voiceStatusArea.querySelector('.ai-voice-circle');
    const statusTextSpan = voiceStatusArea.querySelector('.ai-status-text');

    let voiceAnimInterval = null;
    let currentAudio = null;
    let currentAudioUrl = null;
    let currentAudioRevocable = false;

    function renderStoredMessages() {
      if (!messagesArray.length) return false;
      for (const msg of messagesArray) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${msg.role}`;
        msgDiv.innerHTML = detectAndRenderComponents(msg.text);
        bodyDiv.appendChild(msgDiv);
      }
      bodyDiv.scrollTop = bodyDiv.scrollHeight;
      return true;
    }

    function addMessage(text, role, skipSave = false) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `message ${role}`;
      msgDiv.innerHTML = detectAndRenderComponents(text);
      bodyDiv.appendChild(msgDiv);
      bodyDiv.scrollTop = bodyDiv.scrollHeight;
      if (!skipSave) {
        messagesArray.push({ role, text });
        saveConversation();
      }
    }

    const hasHistory = loadConversation();
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'ai-chatbot-suggestions';
    suggestionsContainer.className = 'ai-chatbot-suggestions';

    if (hasHistory) {
      renderStoredMessages();
      suggestionsRemoved = true;
      suggestionsContainer.style.display = 'none';
      floatingSuggestions.style.display = 'none';
    } else {
      addMessage(settings.greetingMessage, 'bot', false);
    }
    bodyDiv.appendChild(suggestionsContainer);

    // Typing indicator
    function showTyping() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'typing-indicator';
      typingDiv.id = 'ai-typing-indicator';
      typingDiv.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
      bodyDiv.appendChild(typingDiv);
      bodyDiv.scrollTop = bodyDiv.scrollHeight;
    }
    function hideTyping() {
      const el = document.getElementById('ai-typing-indicator');
      if (el) el.remove();
    }

    // Audio / voice animation
    function stopAudio() {
      try {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        if (currentAudioRevocable && currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
      } finally {
        currentAudio = null;
        currentAudioUrl = null;
        currentAudioRevocable = false;
        stopButton.style.display = 'none';
        stopVoiceAnimation();
      }
    }

    async function playAudio(url, revocable = false) {
      try {
        stopAudio();
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.playbackRate = 1.05;
        currentAudio = audio;
        currentAudioUrl = url;
        currentAudioRevocable = revocable;

        audio.addEventListener('play', () => startVoiceAnimation());
        audio.addEventListener('ended', () => stopAudio());
        audio.addEventListener('error', (e) => { console.error('Audio err', e); stopAudio(); });

        stopButton.style.display = 'inline-flex';
        await audio.play();
      } catch (err) {
        console.warn('Playback failed', err);
        stopAudio();
      }
    }

    stopButton.addEventListener('click', () => stopAudio());

    function startVoiceAnimation() {
      voiceCircle.classList.add('speaking');
      if (voiceAnimInterval) clearInterval(voiceAnimInterval);
      voiceAnimInterval = setInterval(() => {
        voiceCircle.style.transform = `scale(${0.98 + Math.random() * 0.2})`;
      }, 100);
    }

    function stopVoiceAnimation() {
      voiceCircle.classList.remove('speaking');
      if (voiceAnimInterval) clearInterval(voiceAnimInterval);
      voiceCircle.style.transform = '';
      voiceAnimInterval = null;
    }

    function setProcessing(state) {
      isProcessing = state;
      micButton.disabled = state;
      sendButton.disabled = state;
      input.disabled = state;
      if (state) {
        statusTextSpan.textContent = 'Thinking...';
        voiceStatusArea.style.display = 'flex';
      } else {
        if (!isRecording) voiceStatusArea.style.display = 'none';
      }
    }

    // Send text message
    async function sendTextMessage(messageToSend) {
      if (isProcessing || !messageToSend?.trim()) return;
      setProcessing(true);
      removeSuggestions();
      addMessage(messageToSend, 'user');
      showTyping();
      try {
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website_id: websiteId, message: messageToSend, session_id: sessionId }),
        });
        const data = await resp.json();
        if (!sessionId && data.sessionId) sessionId = data.sessionId, saveConversation();
        hideTyping();
        const botReply = data.answer || 'Sorry, I could not answer that.';
        addMessage(botReply, 'bot');
        if (data.tts_url) playAudio(data.tts_url, false);
        else stopVoiceAnimation();
      } catch (err) {
        hideTyping();
        addMessage('Unable to reach the server.', 'bot');
        console.error(err);
        stopVoiceAnimation();
      } finally {
        setProcessing(false);
      }
    }

    // Voice recording
    let mediaRecorder = null;
    let recordedChunks = [];
    let isRecording = false;

    async function startRecording() {
      if (isProcessing) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = (e) => e.data.size && recordedChunks.push(e.data);
        mediaRecorder.onstop = async () => {
          setProcessing(true);
          const blob = new Blob(recordedChunks, { type: 'audio/webm' });
          statusTextSpan.textContent = 'Transcribing...';
          try {
            const fd = new FormData();
            fd.append('website_id', websiteId);
            if (sessionId) fd.append('session_id', sessionId);
            fd.append('audio', blob, 'voice.webm');
            const resp = await fetch(apiUrl.replace('/api/chat','') + '/api/voice/respond', { method: 'POST', body: fd });
            if (!resp.ok) throw new Error('Voice failed');
            const data = await resp.json();
            if (!sessionId && data.sessionId) sessionId = data.sessionId, saveConversation();
            const transcription = data.transcription?.trim() || '';
            if (transcription.length < 2) {
              statusTextSpan.textContent = 'No speech detected.';
              setTimeout(() => { if (!isProcessing && !isRecording) voiceStatusArea.style.display = 'none'; }, 1500);
              setProcessing(false);
              return;
            }
            removeSuggestions();
            addMessage(transcription, 'user');
            if (data.answer) {
              addMessage(data.answer, 'bot');
              // TTS
              const ttsResp = await fetch(apiUrl.replace('/api/chat','') + '/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: data.answer })
              });
              if (ttsResp.ok) {
                const audioBuf = await ttsResp.arrayBuffer();
                const ttsBlob = new Blob([audioBuf], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(ttsBlob);
                playAudio(url, true);
              } else stopVoiceAnimation();
            } else stopVoiceAnimation();
          } catch (err) {
            statusTextSpan.textContent = 'Voice failed';
            console.error(err);
            stopVoiceAnimation();
          } finally {
            setProcessing(false);
            voiceStatusArea.style.display = 'none';
          }
        };
        mediaRecorder.start();
        isRecording = true;
        micButton.classList.add('recording');
        statusTextSpan.textContent = 'Recording... Click again to stop';
        voiceStatusArea.style.display = 'flex';
        startVoiceAnimation();
      } catch (err) {
        statusTextSpan.textContent = 'Microphone access denied';
        voiceStatusArea.style.display = 'flex';
      }
    }

    function stopRecording() {
      if (!mediaRecorder) return;
      mediaRecorder.stop();
      mediaRecorder.stream?.getTracks?.().forEach(t => t.stop());
      isRecording = false;
      micButton.classList.remove('recording');
      statusTextSpan.textContent = 'Processing...';
      stopVoiceAnimation();
    }

    micButton.addEventListener('click', () => {
      if (isProcessing) return;
      if (isRecording) stopRecording();
      else startRecording();
    });

    // Suggestions rendering
    function renderSuggestions(list) {
      suggestionsContainer.innerHTML = '';
      floatingSuggestions.innerHTML = '';
      const items = Array.isArray(list) ? list.slice(0, 10) : [];
      items.forEach(s => {
        const q = s.question || (typeof s === 'string' ? s : '');
        if (!q) return;
        const btn = document.createElement('button');
        btn.className = 'suggestion';
        btn.textContent = q;
        const clickHandler = () => {
          if (isProcessing) return;
          removeSuggestions();
          addMessage(q, 'user');
          if (s.answer) addMessage(s.answer, 'bot');
          else sendTextMessage(q);
          if (panel.style.display !== 'flex') {
            panel.style.display = 'flex';
            openButton.style.display = 'none';
            floatingSuggestions.style.display = 'none';
          }
        };
        btn.addEventListener('click', clickHandler);
        suggestionsContainer.appendChild(btn);
        const floatBtn = btn.cloneNode(true);
        floatBtn.addEventListener('click', clickHandler);
        floatingSuggestions.appendChild(floatBtn);
      });
      if (items.length && !suggestionsRemoved) positionFloatingSuggestions();
      else floatingSuggestions.style.display = 'none';
    }

    function positionFloatingSuggestions() {
      if (suggestionsRemoved) {
        floatingSuggestions.style.display = 'none';
        return;
      }
      const pos = getPositionStyles(settings.position);
      Object.assign(widget.style, pos);
      openButton.style.cssText = `position:fixed; ${Object.entries(pos).map(([k,v])=>`${k}:${v}`).join(';')}`;
      floatingSuggestions.style.top = pos.top || '';
      floatingSuggestions.style.bottom = pos.bottom || '';
      floatingSuggestions.style.left = pos.left || '';
      floatingSuggestions.style.right = pos.right || '';
      floatingSuggestions.style.transform = 'translateY(-110%)';
      floatingSuggestions.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    }

    renderSuggestions(settings.suggestedPrompts || []);

    // Event handlers
    openButton.addEventListener('click', () => {
      panel.style.display = 'flex';
      openButton.style.display = 'none';
      floatingSuggestions.style.display = 'none';
      input.focus();
    });
    closeButton.addEventListener('click', () => {
      stopAudio();
      panel.style.display = 'none';
      openButton.style.display = 'inline-flex';
      positionFloatingSuggestions();
    });
    sendButton.addEventListener('click', () => {
      const txt = input.value.trim();
      input.value = '';
      sendTextMessage(txt);
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const txt = input.value.trim();
        input.value = '';
        sendTextMessage(txt);
      }
    });

    function refreshPositioning() {
      const pos = getPositionStyles(settings.position);
      Object.assign(widget.style, pos);
      openButton.style.cssText = `position:fixed; ${Object.entries(pos).map(([k,v])=>`${k}:${v}`).join(';')}`;
      positionFloatingSuggestions();
    }
    window.addEventListener('resize', refreshPositioning);
    refreshPositioning();
  }
}