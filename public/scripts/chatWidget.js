(() => {
  // Do not render chat widget on admin pages
  if (window.location && window.location.pathname && window.location.pathname.startsWith('/admin')) {
    return;
  }
  const socket = window.io ? io() : null;

  const state = { open: false };

  const box = document.createElement('div');
  box.id = 'chat-widget-box';
  box.innerHTML = `
    <style>
      #chat-widget-box { position: fixed; right: 20px; bottom: 20px; width: 320px; z-index: 9999; font-family: inherit; }
      #chat-widget-toggle { background:#000; color:#fff; border-radius:24px; padding:10px 14px; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 6px 18px rgba(0,0,0,.2); }
      #chat-widget-panel { display:none; background:#fff; border:1px solid #ddd; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,.2); }
      #chat-header { background:#111; color:#fff; padding:10px 12px; }
      #chat-messages { height:280px; overflow:auto; padding:10px; }
      #chat-input { display:flex; gap:8px; padding:10px; border-top:1px solid #eee; }
      #chat-input input { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; }
      #chat-input button { padding:8px 12px; background:#111; color:#fff; border:none; border-radius:8px; }
      .chat-msg { margin:6px 0; max-width:75%; padding:8px 10px; border-radius:10px; }
      .chat-me { background:#e6f3ff; margin-left:auto; }
      .chat-admin { background:#f3f3f3; margin-right:auto; }
    </style>
    <div id="chat-widget-toggle">💬 Hỗ trợ trực tuyến</div>
    <div id="chat-widget-panel">
      <div id="chat-header">Chat với Admin</div>
      <div id="chat-messages"></div>
      <div id="chat-input">
        <input id="chat-text" type="text" placeholder="Nhập tin nhắn..." />
        <button id="chat-send">Gửi</button>
      </div>
    </div>
  `;
  document.body.appendChild(box);

  const toggle = box.querySelector('#chat-widget-toggle');
  const panel = box.querySelector('#chat-widget-panel');
  const messagesEl = box.querySelector('#chat-messages');
  const inputEl = box.querySelector('#chat-text');
  const sendBtn = box.querySelector('#chat-send');

  const renderMsg = (msg, mine) => {
    const div = document.createElement('div');
    div.className = `chat-msg ${mine ? 'chat-me' : 'chat-admin'}`;
    div.textContent = msg.content;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  toggle.addEventListener('click', () => {
    state.open = !state.open;
    panel.style.display = state.open ? 'block' : 'none';
  });

  const sessionUser = window.__USER__ || null; // optional: inject from server template
  if (socket && sessionUser && sessionUser._id) {
    socket.emit('join', { userId: sessionUser._id, role: 'user' });
  }

  if (socket) {
    socket.on('chat:message', (msg) => {
      console.log('[chatWidget] chat:message', msg);
      const mine = msg.senderModel === 'User';
      renderMsg(msg, mine);
    });
  }

  const send = () => {
    const content = inputEl.value.trim();
    if (!content) return;
    inputEl.value = '';
    renderMsg({ content }, true);
    if (socket && sessionUser && sessionUser._id) {
      socket.emit('chat:message', { fromUserId: sessionUser._id, content, senderRole: 'user' });
    } else {
      // fallback via REST
      fetch('/chat/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
    }
  };

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
})();
