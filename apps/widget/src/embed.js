const config = window.AI_CHATBOT_WIDGET_CONFIG || {};
const scriptEl = document.currentScript || Array.from(document.getElementsByTagName('script')).find((tag) => tag.src && tag.src.includes('embed.js'));
const websiteId = config.websiteId || scriptEl?.dataset?.websiteId;
const apiUrl = config.apiUrl || scriptEl?.dataset?.apiUrl;

if (!websiteId || !apiUrl) {
  console.error('AI chatbot widget requires websiteId and apiUrl.');
} else {
  const style = document.createElement('style');
  style.textContent = `
    .ai-chatbot-widget { position: fixed; bottom: 20px; right: 20px; width: 320px; max-width: calc(100vw - 32px); font-family: Arial, sans-serif; z-index: 999999; }
    .ai-chatbot-widget button { border: none; background: #2563eb; color: white; cursor: pointer; border-radius: 999px; padding: 10px 16px; }
    .ai-chatbot-widget .panel { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18); overflow: hidden; display: flex; flex-direction: column; height: 520px; }
    .ai-chatbot-widget .header { padding: 16px; background: #2563eb; color: white; display: flex; justify-content: space-between; align-items: center; }
    .ai-chatbot-widget .body { padding: 16px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .ai-chatbot-widget .message { padding: 12px 14px; border-radius: 16px; max-width: 100%; white-space: pre-wrap; }
    .ai-chatbot-widget .message.user { background: #e0f2fe; align-self: flex-end; color: #2563eb;}
    .ai-chatbot-widget .message.bot { background: #f8fafc; align-self: flex-start; color:#000;}
    .ai-chatbot-widget .input-row { display: flex; gap: 8px; padding: 16px; border-top: 1px solid #e5e7eb; }
    .ai-chatbot-widget .input-row input { flex: 1; padding: 12px 14px; border-radius: 14px; border: 1px solid #cbd5e1; }
    .ai-chatbot-widget .input-row button { padding: 12px 18px; }
  `;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.className = 'ai-chatbot-widget';
  widget.innerHTML = `
    <button id="ai-chatbot-open">Chat with AI</button>
    <div class="panel" id="ai-chatbot-panel" style="display:none;">
      <div class="header">
        <div>Website AI Assistant</div>
        <button id="ai-chatbot-close">×</button>
      </div>
      <div class="body" id="ai-chatbot-body"></div>
      <div class="input-row">
        <input id="ai-chatbot-input" placeholder="Ask a question..." />
        <button id="ai-chatbot-send">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  const openButton = widget.querySelector('#ai-chatbot-open');
  const closeButton = widget.querySelector('#ai-chatbot-close');
  const panel = widget.querySelector('#ai-chatbot-panel');
  const body = widget.querySelector('#ai-chatbot-body');
  const input = widget.querySelector('#ai-chatbot-input');
  const sendButton = widget.querySelector('#ai-chatbot-send');

  function addMessage(text, role) {
    const message = document.createElement('div');
    message.className = `message ${role}`;
    message.textContent = text;
    body.appendChild(message);
    body.scrollTop = body.scrollHeight;
  }

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;
    addMessage(message, 'user');
    input.value = '';
    addMessage('Thinking...', 'bot');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_id: websiteId, message }),
      });
      const data = await response.json();
      const botText = data.answer || data.error || 'Sorry, I could not answer that.';
      const lastBot = body.querySelector('.message.bot:last-child');
      if (lastBot) lastBot.textContent = botText;
    } catch (error) {
      const lastBot = body.querySelector('.message.bot:last-child');
      if (lastBot) lastBot.textContent = 'Unable to reach the chat server.';
      console.error(error);
    }
  }

  openButton.addEventListener('click', () => {
    panel.style.display = 'flex';
    openButton.style.display = 'none';
  });

  closeButton.addEventListener('click', () => {
    panel.style.display = 'none';
    openButton.style.display = 'inline-flex';
  });

  sendButton.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });
}
