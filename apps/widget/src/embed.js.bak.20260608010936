var tt=window.AI_CHATBOT_WIDGET_CONFIG||{},et=document.currentScript||Array.from(document.getElementsByTagName("script")).find(m=>m.src&&m.src.includes("embed.js")),S=tt.websiteId||et?.dataset?.websiteId,L=tt.apiUrl||et?.dataset?.apiUrl;if(!S||!L)console.error("AI chatbot widget requires websiteId and apiUrl.");else{let F=function(e){let u=window.innerWidth<768?"bottom-left":e,r={"top-left":{top:"20px",left:"20px",bottom:"auto",right:"auto"},"top-right":{top:"20px",right:"20px",bottom:"auto",left:"auto"},"middle-left":{top:"50%",left:"20px",bottom:"auto",right:"auto",transform:"translateY(-50%)"},"middle-right":{top:"50%",right:"20px",bottom:"auto",left:"auto",transform:"translateY(-50%)"},"bottom-left":{bottom:"20px",left:"20px",top:"auto",right:"auto"},"bottom-right":{bottom:"20px",right:"20px",top:"auto",left:"auto"}};return r[u]||r["bottom-right"]},at=function(e){return e.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/\n- /g,"<br>\u2022 ").replace(/\n\d+\. /g,"<br>").replace(/\n/g,"<br>")},P=function(e){let s=at(e),u=/(https?:\/\/[^\s]+)/g;s=s.replace(u,o=>`<a href="${o}" target="_blank" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">\u{1F517} ${new URL(o).hostname}</a>`);let r=/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;s=s.replace(r,o=>`<a href="mailto:${o}" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">\u{1F4E7} ${o}</a>`);let l=/(\+?1?\s?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;return s=s.replace(l,o=>`<a href="tel:${o.replace(/\D/g,"")}" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">\u260E\uFE0F ${o}</a>`),s},W=function(e){let s=document.createElement("style");s.textContent=`
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
        color: ${e.primaryColor};
        border-bottom-color: ${e.primaryColor};
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
        background: ${e.primaryColor};
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
        background: ${e.primaryColor};
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
        background: ${e.primaryColor}dd;
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
        background: ${e.primaryColor};
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
        background: ${e.primaryColor}dd;
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
        background: ${e.primaryColor};
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
        background: ${e.primaryColor};
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
        border-color: ${e.primaryColor};
        box-shadow: 0 0 0 3px ${e.primaryColor}33;
      }

      .ai-chatbot-send-btn {
        padding: 12px 18px;
        background: ${e.primaryColor};
        color: white;
        border: none;
        border-radius: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .ai-chatbot-send-btn:hover {
        background: ${e.primaryColor}dd;
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
    `,document.head.appendChild(s);let u=F(e.position),r=document.createElement("button");r.className="ai-chatbot-open-btn",Object.assign(r.style,u),r.innerHTML="\u{1F4AC} Chat",r.id="ai-chatbot-open";let l=document.createElement("div");l.className="ai-chatbot-widget-container",Object.assign(l.style,u),l.style.width="320px",l.style.maxWidth="calc(100vw - 32px)";let o=document.createElement("div");o.className="ai-chatbot-panel",o.style.display="none",o.id="ai-chatbot-panel";let O=document.createElement("div");O.className="ai-chatbot-header",O.innerHTML=`
      <div class="ai-chatbot-avatar">
        ${e.avatarUrl?`<img src="${e.avatarUrl}" alt="Bot Avatar" onerror="this.parentElement.textContent='\u{1F916}'" />`:"\u{1F916}"}
      </div>
      <div class="ai-chatbot-title">Website Assistant</div>
      <button class="ai-chatbot-close-btn" id="ai-chatbot-close">\xD7</button>
    `;let T=document.createElement("div");T.className="ai-chatbot-tab-container";let N=document.createElement("button");N.className="ai-chatbot-tab active",N.textContent="\u{1F4AC} Chat",N.id="ai-chatbot-tab-chat";let $=document.createElement("button");$.className="ai-chatbot-tab",$.textContent="\u{1F3A4} Voice",$.id="ai-chatbot-tab-voice",T.appendChild(N),T.appendChild($);let y=document.createElement("div");y.className="ai-chatbot-body",y.id="ai-chatbot-body";let w=document.createElement("div");w.className="ai-chatbot-tab-content active",w.id="ai-chatbot-chat-content",w.style.flex="1";let d=document.createElement("div");d.className="ai-chatbot-body",d.id="ai-chatbot-messages",w.appendChild(d);let v=document.createElement("div");v.className="ai-chatbot-tab-content",v.id="ai-chatbot-voice-content",v.style.flex="1";let C=document.createElement("div");C.className="ai-chatbot-voice-container";let M=document.createElement("div");M.className="ai-chatbot-waveform",M.id="ai-chatbot-waveform";for(let t=0;t<5;t++){let a=document.createElement("div");a.className="ai-chatbot-waveform-bar",M.appendChild(a)}let z=document.createElement("button");z.className="ai-chatbot-mic-btn",z.id="ai-chatbot-mic",z.innerHTML="\u{1F3A4}";let I=document.createElement("div");I.className="ai-chatbot-voice-status",I.id="ai-chatbot-voice-status",I.textContent="Click to start recording",C.appendChild(M),C.appendChild(z),C.appendChild(I),v.appendChild(C),y.appendChild(w),y.appendChild(v);let g=document.createElement("div");g.className="ai-chatbot-input-row";let c=document.createElement("textarea");c.className="ai-chatbot-input",c.id="ai-chatbot-input",c.placeholder="Ask a question...",c.rows=1;let k=document.createElement("button");k.className="ai-chatbot-send-btn",k.id="ai-chatbot-send",k.textContent="Send",g.appendChild(c),g.appendChild(k),o.appendChild(O),o.appendChild(T),o.appendChild(y),o.appendChild(g),l.appendChild(o),document.body.appendChild(r),document.body.appendChild(l);let ot=o.querySelector("#ai-chatbot-close"),V=`ai_chatbot_${S}_conversation`,i=[],b=null;function H(){try{localStorage.setItem(V,JSON.stringify({sessionId:b,messages:i}))}catch(t){console.error("Failed to save conversation",t)}}function it(){try{let t=localStorage.getItem(V);if(!t)return!1;let a=JSON.parse(t);return!a||!Array.isArray(a.messages)?!1:(b=a.sessionId||null,i=a.messages||[],i.forEach(n=>{let h=document.createElement("div");h.className=`ai-chatbot-message ${n.role}`,h.innerHTML=P(n.text),d.appendChild(h)}),d.scrollTop=d.scrollHeight,!0)}catch(t){return console.error("Failed to load conversation",t),!1}}function A(t,a){let n=document.createElement("div");n.className=`ai-chatbot-message ${a}`,n.innerHTML=P(t),d.appendChild(n),d.scrollTop=d.scrollHeight,a==="bot"&&i.length>0&&i[i.length-1].role==="bot"&&i[i.length-1].text==="\u23F3 Thinking..."?i[i.length-1].text=t:i.push({role:a,text:t}),H()}it()||A(e.greetingMessage,"bot");function nt(){c.style.height="auto";let t=Math.min(c.scrollHeight,100);c.style.height=t+"px"}c.addEventListener("input",nt);async function J(){let t=c.value.trim();if(t){A(t,"user"),c.value="",c.style.height="auto",A("\u23F3 Thinking...","bot");try{let n=await(await fetch(L,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({website_id:S,message:t,session_id:b})})).json();!b&&n.sessionId&&(b=n.sessionId);let h=n.answer||n.error||"Sorry, I could not answer that.",x=d.querySelector(".ai-chatbot-message.bot:last-child");x&&(x.innerHTML=P(h)),i.length>0&&i[i.length-1].role==="bot"&&(i[i.length-1].text=h,H())}catch(a){let n=d.querySelector(".ai-chatbot-message.bot:last-child");n&&(n.textContent="Unable to reach the chat server.",i.length>0&&i[i.length-1].role==="bot"&&(i[i.length-1].text="Unable to reach the chat server.",H())),console.error("Chat error:",a)}}}let f,U=[],_=!1,E=o.querySelector("#ai-chatbot-mic"),p=o.querySelector("#ai-chatbot-voice-status");async function rt(){try{let t=await navigator.mediaDevices.getUserMedia({audio:!0});return f=new MediaRecorder(t,{mimeType:"audio/webm"}),f.ondataavailable=a=>{a.data.size>0&&U.push(a.data)},f.onstop=async()=>{let a=new Blob(U,{type:"audio/webm"});U=[],_=!1,E.classList.remove("recording");try{E.disabled=!0}catch{}p.textContent="Processing...",await ct(a);try{E.disabled=!1}catch{}},!0}catch(t){return console.error("Microphone permission denied:",t),p.textContent="Microphone permission denied",!1}}async function ct(t){try{if(!t||typeof t.size!="number"||t.size<300){console.warn("No audio captured or recording too small",t&&t.size),p.textContent="No audio captured. Please try again.";return}let a=new FormData;a.append("website_id",S),a.append("session_id",b||""),a.append("audio",t,"audio.webm");let n=L.replace("/api/chat","/api/voice/respond"),h=await fetch(n,{method:"POST",body:a});if(!h.ok)throw new Error("Voice API error: "+h.status);let x=await h.json();!b&&x.sessionId&&(b=x.sessionId);let Y=x.answer||"Sorry, I could not answer that.";A(Y,"bot"),p.textContent="Generating audio...";let st=L.replace("/api/chat","/api/tts"),B=await fetch(st,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:Y})});if(!B.ok)throw new Error("TTS API error: "+B.status);let lt=await B.blob(),Q=URL.createObjectURL(lt),j=new Audio(Q);p.textContent="Playing response...",j.onended=()=>{try{URL.revokeObjectURL(Q)}catch{}p.textContent="Click to start recording"},j.onerror=R=>{console.error("Audio playback error:",R),p.textContent="Error playing audio"},await j.play().catch(R=>{console.warn("Playback blocked, requiring user gesture",R),p.innerHTML='<button id="ai-chatbot-play-response">Play response</button>';let X=o.querySelector("#ai-chatbot-play-response");X&&X.addEventListener("click",()=>{j.play(),p.textContent="Playing response..."})})}catch(a){console.error("Voice message error:",a),p.textContent=a&&a.message?`Error: ${a.message}`:"Error processing audio"}}E.addEventListener("click",async t=>{t.preventDefault(),t.stopPropagation(),!(!f&&!await rt())&&(_?f.stop():(U=[],f.start(),_=!0,E.classList.add("recording"),p.textContent="Recording..."))});let q=o.querySelector("#ai-chatbot-tab-chat"),D=o.querySelector("#ai-chatbot-tab-voice"),G=o.querySelector("#ai-chatbot-chat-content"),Z=o.querySelector("#ai-chatbot-voice-content");function K(t){q.classList.remove("active"),D.classList.remove("active"),G.classList.remove("active"),Z.classList.remove("active"),t==="chat"?(q.classList.add("active"),G.classList.add("active"),g.style.display="flex"):(D.classList.add("active"),Z.classList.add("active"),g.style.display="none")}q.addEventListener("click",()=>K("chat")),D.addEventListener("click",()=>K("voice")),r.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),o.style.display="flex",r.style.display="none",setTimeout(()=>c.focus(),100)}),ot.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),o.style.display="none",r.style.display="inline-block"}),k.addEventListener("click",t=>{t.preventDefault(),J()}),c.addEventListener("keypress",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),J())}),window.addEventListener("resize",()=>{let t=F(e.position);Object.assign(r.style,t),Object.assign(l.style,t),l.style.width="320px",l.style.maxWidth="calc(100vw - 32px)"})},m={avatarUrl:null,greetingMessage:"Hello! How can I help you today?",position:"bottom-right",theme:"light",primaryColor:"#2563eb"};fetch(`${L.replace("/api/chat","")}/api/websites/${S}/widget-settings`).then(e=>e.json()).then(e=>{m=e,W(m)}).catch(e=>{console.error("Failed to load widget settings:",e),W(m)})}
