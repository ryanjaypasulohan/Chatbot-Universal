var dt=window.AI_CHATBOT_WIDGET_CONFIG||{},pt=document.currentScript||Array.from(document.getElementsByTagName("script")).find(C=>C.src&&C.src.includes("embed.js")),A=dt.websiteId||pt?.dataset?.websiteId,I=dt.apiUrl||pt?.dataset?.apiUrl;if(!A||!I)console.error("AI chatbot widget requires websiteId and apiUrl.");else{let ot=function(o){let y=window.innerWidth<768?"bottom-left":o,c={"top-left":{top:"20px",left:"20px",bottom:"auto",right:"auto"},"top-right":{top:"20px",right:"20px",bottom:"auto",left:"auto"},"middle-left":{top:"50%",left:"20px",bottom:"auto",right:"auto",transform:"translateY(-50%)"},"middle-right":{top:"50%",right:"20px",bottom:"auto",left:"auto",transform:"translateY(-50%)"},"bottom-left":{bottom:"20px",left:"20px",top:"auto",right:"auto"},"bottom-right":{bottom:"20px",right:"20px",top:"auto",left:"auto"}};return c[y]||c["bottom-right"]},bt=function(o){return o.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/\n- /g,"<br>\u2022 ").replace(/\n\d+\. /g,"<br>").replace(/\n/g,"<br>")},F=function(o){let s=bt(o),y=/(https?:\/\/[^\s]+)/g;s=s.replace(y,e=>`<a href="${e}" target="_blank" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">\u{1F517} ${new URL(e).hostname}</a>`);let c=/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;s=s.replace(c,e=>`<a href="mailto:${e}" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">\u{1F4E7} ${e}</a>`);let u=/(\+?1?\s?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;return s=s.replace(u,e=>`<a href="tel:${e.replace(/\D/g,"")}" style="color: #2563eb; text-decoration: underline; cursor: pointer; font-weight: bold;">\u260E\uFE0F ${e}</a>`),s},W=function(o){let s=document.createElement("style");s.textContent=`
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
        color: ${o.primaryColor};
        border-bottom-color: ${o.primaryColor};
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
        background: ${o.primaryColor};
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
        background: ${o.primaryColor};
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

      .ai-chatbot-stop-btn {
        margin-left: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        background: #ef4444;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 0.85rem;
        display: inline-block;
        min-width: 64px;
      }

      .ai-chatbot-mic-btn:hover {
        background: ${o.primaryColor}dd;
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
        background: ${o.primaryColor};
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
        background: ${o.primaryColor}dd;
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
        background: ${o.primaryColor};
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
        background: ${o.primaryColor};
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
        border-color: ${o.primaryColor};
        box-shadow: 0 0 0 3px ${o.primaryColor}33;
      }

      .ai-chatbot-send-btn {
        padding: 12px 18px;
        background: ${o.primaryColor};
        color: white;
        border: none;
        border-radius: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .ai-chatbot-send-btn:hover {
        background: ${o.primaryColor}dd;
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
    `,document.head.appendChild(s);let y=ot(o.position),c=document.createElement("button");c.className="ai-chatbot-open-btn",Object.assign(c.style,y),c.innerHTML="\u{1F4AC} Chat",c.id="ai-chatbot-open";let u=document.createElement("div");u.className="ai-chatbot-widget-container",Object.assign(u.style,y),u.style.width="320px",u.style.maxWidth="calc(100vw - 32px)";let e=document.createElement("div");e.className="ai-chatbot-panel",e.style.display="none",e.id="ai-chatbot-panel";let V=document.createElement("div");V.className="ai-chatbot-header",V.innerHTML=`
      <div class="ai-chatbot-avatar">
        ${o.avatarUrl?`<img src="${o.avatarUrl}" alt="Bot Avatar" onerror="this.parentElement.textContent='\u{1F916}'" />`:"\u{1F916}"}
      </div>
      <div class="ai-chatbot-title">Website Assistant</div>
      <button class="ai-chatbot-close-btn" id="ai-chatbot-close">\xD7</button>
    `;let R=document.createElement("div");R.className="ai-chatbot-tab-container";let z=document.createElement("button");z.className="ai-chatbot-tab active",z.textContent="\u{1F4AC} Chat",z.id="ai-chatbot-tab-chat";let j=document.createElement("button");j.className="ai-chatbot-tab",j.textContent="\u{1F3A4} Voice",j.id="ai-chatbot-tab-voice",R.appendChild(z),R.appendChild(j);let U=document.createElement("div");U.className="ai-chatbot-body",U.id="ai-chatbot-body";let B=document.createElement("div");B.className="ai-chatbot-tab-content active",B.id="ai-chatbot-chat-content",B.style.flex="1";let m=document.createElement("div");m.className="ai-chatbot-body",m.id="ai-chatbot-messages",B.appendChild(m);let N=document.createElement("div");N.className="ai-chatbot-tab-content",N.id="ai-chatbot-voice-content",N.style.flex="1";let E=document.createElement("div");E.className="ai-chatbot-voice-container";let O=document.createElement("div");O.className="ai-chatbot-waveform",O.id="ai-chatbot-waveform";for(let t=0;t<5;t++){let a=document.createElement("div");a.className="ai-chatbot-waveform-bar",O.appendChild(a)}let _=document.createElement("button");_.className="ai-chatbot-mic-btn",_.id="ai-chatbot-mic",_.innerHTML="\u{1F3A4}";let $=document.createElement("button");$.className="ai-chatbot-stop-btn",$.id="ai-chatbot-stop",$.textContent="\u23F9 Stop",$.style.display="none";let P=document.createElement("div");P.className="ai-chatbot-voice-status",P.id="ai-chatbot-voice-status",P.textContent="Click to start recording",E.appendChild(O),E.appendChild(_),E.appendChild($),E.appendChild(P),N.appendChild(E),U.appendChild(B),U.appendChild(N);let S=document.createElement("div");S.className="ai-chatbot-input-row";let h=document.createElement("textarea");h.className="ai-chatbot-input",h.id="ai-chatbot-input",h.placeholder="Ask a question...",h.rows=1;let M=document.createElement("button");M.className="ai-chatbot-send-btn",M.id="ai-chatbot-send",M.textContent="Send",S.appendChild(h),S.appendChild(M),e.appendChild(V),e.appendChild(R),e.appendChild(U),e.appendChild(S),u.appendChild(e),document.body.appendChild(c),document.body.appendChild(u);let ht=e.querySelector("#ai-chatbot-close"),at=`ai_chatbot_${A}_conversation`,i=[],w=null;function J(){try{localStorage.setItem(at,JSON.stringify({sessionId:w,messages:i}))}catch(t){console.error("Failed to save conversation",t)}}function ut(){try{let t=localStorage.getItem(at);if(!t)return!1;let a=JSON.parse(t);return!a||!Array.isArray(a.messages)?!1:(w=a.sessionId||null,i=a.messages||[],i.forEach(p=>{let f=document.createElement("div");f.className=`ai-chatbot-message ${p.role}`,f.innerHTML=F(p.text),m.appendChild(f)}),m.scrollTop=m.scrollHeight,!0)}catch(t){return console.error("Failed to load conversation",t),!1}}function H(t,a){let p=document.createElement("div");p.className=`ai-chatbot-message ${a}`,p.innerHTML=F(t),m.appendChild(p),m.scrollTop=m.scrollHeight,a==="bot"&&i.length>0&&i[i.length-1].role==="bot"&&i[i.length-1].text==="\u23F3 Thinking..."?i[i.length-1].text=t:i.push({role:a,text:t}),J()}ut()||H(o.greetingMessage,"bot");function mt(){h.style.height="auto";let t=Math.min(h.scrollHeight,100);h.style.height=t+"px"}h.addEventListener("input",mt);async function nt(){let t=h.value.trim();if(t){H(t,"user"),h.value="",h.style.height="auto",H("\u23F3 Thinking...","bot");try{let p=await(await fetch(I,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({website_id:A,message:t,session_id:w})})).json();!w&&p.sessionId&&(w=p.sessionId);let f=p.answer||p.error||"Sorry, I could not answer that.",T=m.querySelector(".ai-chatbot-message.bot:last-child");T&&(T.innerHTML=F(f)),i.length>0&&i[i.length-1].role==="bot"&&(i[i.length-1].text=f,J())}catch(a){let p=m.querySelector(".ai-chatbot-message.bot:last-child");p&&(p.textContent="Unable to reach the chat server.",i.length>0&&i[i.length-1].role==="bot"&&(i[i.length-1].text="Unable to reach the chat server.",J())),console.error("Chat error:",a)}}}let v=null,G=!1;function ft(){try{let t=window.AudioContext||window.webkitAudioContext;if(!t)return;v=v||new t,v.state==="suspended"?v.resume().then(()=>{G=!0}).catch(()=>{}):G=!0}catch(t){console.warn("Audio unlock failed",t)}}let l=null,k=null,g=!1;function yt(){try{if(k){try{k.stop()}catch{}try{k.disconnect&&k.disconnect()}catch{}k=null}if(l){try{l.pause(),l.currentTime=0}catch{}try{l._blobUrl&&URL.revokeObjectURL(l._blobUrl)}catch{}l=null}}finally{g=!1;let t=e.querySelector("#ai-chatbot-stop");t&&(t.style.display="none"),d&&(d.textContent="Click to record")}}let L,D=[],Z=!1,K=e.querySelector("#ai-chatbot-mic"),d=e.querySelector("#ai-chatbot-voice-status"),it=e.querySelector("#ai-chatbot-stop");it&&it.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),yt()});async function gt(){try{let t=await navigator.mediaDevices.getUserMedia({audio:!0});return L=new MediaRecorder(t,{mimeType:"audio/webm"}),L.ondataavailable=a=>{a.data.size>0&&D.push(a.data)},L.onstop=async()=>{let a=new Blob(D,{type:"audio/webm"});D=[],Z=!1,K.classList.remove("recording"),d.textContent="Processing...",await xt(a)},!0}catch(t){return console.error("Microphone permission denied:",t),d.textContent="Microphone permission denied",!1}}async function xt(t){try{let a=new FormData;a.append("website_id",A),a.append("session_id",w||""),a.append("audio",t,"audio.webm");let p=I.replace("/api/chat","/api/voice/respond"),f=await fetch(p,{method:"POST",body:a});if(!f.ok)throw new Error("Voice API error: "+f.status);let T=await f.json();!w&&T.sessionId&&(w=T.sessionId);let lt=T.answer||"Sorry, I could not answer that.";H(lt,"bot");try{d.textContent="Generating audio...";let X=I.replace("/api/chat","/api/tts"),tt=await fetch(X,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:lt})});if(!tt.ok)throw new Error("TTS API error: "+tt.status);let et=await tt.blob(),wt=(x,b)=>new Promise((n,r)=>{try{x.decodeAudioData(b,n,r)}catch(q){r(q)}});if(v&&G)try{let x=await et.arrayBuffer(),b=await wt(v,x),n=v.createBufferSource();n.buffer=b,n.connect(v.destination),n.start(0),k=n,g=!0;let r=e.querySelector("#ai-chatbot-stop");r&&(r.style.display="inline-block"),d.textContent="Playing response...",n.onended=()=>{k=null,g=!1,r&&(r.style.display="none"),d.textContent="Click to record"}}catch{let b=URL.createObjectURL(et),n=new Audio(b);n.crossOrigin="anonymous",l=n,l._blobUrl=b,n.play().then(()=>{g=!0;let r=e.querySelector("#ai-chatbot-stop");r&&(r.style.display="inline-block"),d.textContent="Playing response..."}).catch(()=>{d.innerHTML='<button id="ai-chatbot-play-response">Play response</button>';let r=e.querySelector("#ai-chatbot-play-response");r&&r.addEventListener("click",()=>{n.play(),l=n,l._blobUrl=b;let q=e.querySelector("#ai-chatbot-stop");q&&(q.style.display="inline-block"),g=!0,r.remove()})}),n.onended=()=>{d.textContent="Click to record";try{URL.revokeObjectURL(b)}catch{}l=null,g=!1;let r=e.querySelector("#ai-chatbot-stop");r&&(r.style.display="none")}}else{let x=URL.createObjectURL(et),b=new Audio(x);b.crossOrigin="anonymous",l=b,l._blobUrl=x,b.play().then(()=>{g=!0;let n=e.querySelector("#ai-chatbot-stop");n&&(n.style.display="inline-block"),d.textContent="Playing response..."}).catch(()=>{d.innerHTML='<button id="ai-chatbot-play-response">Play response</button>';let n=e.querySelector("#ai-chatbot-play-response");n&&n.addEventListener("click",()=>{b.play(),l=b,l._blobUrl=x;let r=e.querySelector("#ai-chatbot-stop");r&&(r.style.display="inline-block"),g=!0,n.remove()})}),b.onended=()=>{d.textContent="Click to record";try{URL.revokeObjectURL(x)}catch{}l=null,g=!1;let n=e.querySelector("#ai-chatbot-stop");n&&(n.style.display="none")}}}catch(X){console.error("TTS playback error:",X),d.textContent="Click to record"}}catch(a){console.error("Voice message error:",a),d.textContent="Error processing audio"}}K.addEventListener("click",async t=>{t.preventDefault(),t.stopPropagation(),ft(),!(!L&&!await gt())&&(Z?L.stop():(D=[],L.start(),Z=!0,K.classList.add("recording"),d.textContent="Recording..."))});let Y=e.querySelector("#ai-chatbot-tab-chat"),Q=e.querySelector("#ai-chatbot-tab-voice"),rt=e.querySelector("#ai-chatbot-chat-content"),ct=e.querySelector("#ai-chatbot-voice-content");function st(t){Y.classList.remove("active"),Q.classList.remove("active"),rt.classList.remove("active"),ct.classList.remove("active"),t==="chat"?(Y.classList.add("active"),rt.classList.add("active"),S.style.display="flex"):(Q.classList.add("active"),ct.classList.add("active"),S.style.display="none")}Y.addEventListener("click",()=>st("chat")),Q.addEventListener("click",()=>st("voice")),c.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),e.style.display="flex",c.style.display="none",setTimeout(()=>h.focus(),100)}),ht.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation(),e.style.display="none",c.style.display="inline-block"}),M.addEventListener("click",t=>{t.preventDefault(),nt()}),h.addEventListener("keypress",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),nt())}),window.addEventListener("resize",()=>{let t=ot(o.position);Object.assign(c.style,t),Object.assign(u.style,t),u.style.width="320px",u.style.maxWidth="calc(100vw - 32px)"})},C={avatarUrl:null,greetingMessage:"Hello! How can I help you today?",position:"bottom-right",theme:"light",primaryColor:"#2563eb"};fetch(`${I.replace("/api/chat","")}/api/websites/${A}/widget-settings`).then(async o=>{if(!o.ok){console.warn("Widget disabled for website",A,o.status),W(C);let s=document.getElementById("ai-chatbot-panel");if(s){let y=s.querySelector("#ai-chatbot-body")||s.querySelector(".ai-chatbot-body");y&&(y.innerHTML='<div style="padding:24px;text-align:center"><strong>Chatbot removed</strong><p style="margin-top:8px;color:#6b7280">This chatbot has been removed or disabled by the site owner. The embed script remains on this site but the assistant is no longer available.</p></div>');let c=s.querySelector(".ai-chatbot-input-row");c&&(c.style.display="none")}throw new Error("widget disabled")}return o.json()}).then(o=>{C=o,W(C)}).catch(o=>{o&&o.message==="widget disabled"||(console.error("Failed to load widget settings:",o),W(C))})}
