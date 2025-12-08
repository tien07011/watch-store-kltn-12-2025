(() => {
  // Do not render chat widget on admin pages
  if (window.location && window.location.pathname && window.location.pathname.startsWith('/admin')) {
    return;
  }
  const socket = window.io ? io() : null;

  const state = { open: false, loaded: false, seenIds: new Set() };

  const box = document.createElement('div');
  box.id = 'chat-widget-box';
  box.innerHTML = `
    <style>
      #chat-widget-box { position: fixed; right: 20px; bottom: 20px; width: 320px; z-index: 9999; font-family: inherit; }
      #chat-widget-toggle { background:#000; color:#fff; border-radius:24px; padding:10px 14px; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 6px 18px rgba(0,0,0,.2); }
      #chat-widget-panel { display:none; background:#fff; border:1px solid #ddd; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,.2); }
      #chat-header { background:#111; color:#fff; padding:10px 12px; }
      #chat-messages { height:280px; overflow:auto; padding:10px; }
      #chat-input { display:flex; gap:8px; padding:10px; border-top:1px solid #eee; align-items:center; }
      #chat-input input[type="text"] { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; }
      #chat-input button { padding:8px 12px; background:#111; color:#fff; border:none; border-radius:8px; }
      #chat-input .outline { background:#fff; color:#111; border:1px solid #ddd; }
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
        <input id="chat-image" type="file" accept="image/*" style="display:none;" />
        <label for="chat-image" class="outline" style="padding:8px 12px; border-radius:8px; cursor:pointer; width:42px; height:38px; display:flex; align-items:center; justify-content:center;">📷</label>
        <button id="chat-send" type="button">Gửi</button>
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
      if (msg.imageUrl) {
        const img = document.createElement('img');
        img.src = msg.imageUrl;
        img.alt = 'image';
        img.style.maxWidth = '240px';
        img.style.borderRadius = '8px';
        div.appendChild(img);
      } else {
        div.textContent = msg.content;
      }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  toggle.addEventListener('click', () => {
    state.open = !state.open;
    panel.style.display = state.open ? 'block' : 'none';

    // Enforce login requirement: show notice if not logged in
    if (state.open && !sessionUser) {
      const div = document.createElement('div');
      div.className = 'chat-msg chat-admin';
      div.textContent = 'Vui lòng đăng nhập để sử dụng hỗ trợ trực tuyến.';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }

    // Load conversation history on first open
    if (state.open && sessionUser && !state.loaded) {
      fetch(`/chat/conversation/me?limit=50`)
        .then((r) => r.ok ? r.json() : Promise.reject(r))
        .then((data) => {
          if (data && data.ok && Array.isArray(data.messages)) {
            messagesEl.innerHTML = '';
            data.messages.forEach((msg) => {
              const mine = msg.senderModel === 'User';
              renderMsg(msg, mine);
            });
            state.loaded = true;
          }
        })
        .catch(() => {
          const err = document.createElement('div');
          err.className = 'chat-msg chat-admin';
          err.textContent = 'Không thể tải lịch sử chat.';
          messagesEl.appendChild(err);
        });
    }
  });

  const sessionUser = window.__USER__ || null;
  if (socket && sessionUser && sessionUser._id) {
    socket.emit('join', { userId: sessionUser._id, role: 'user' });
  }

  if (socket) {
    socket.on('chat:message', (msg) => {
      console.log('[chatWidget] chat:message', msg);
      // Deduplicate if server provides message id
      if (msg && msg._id) {
        if (state.seenIds.has(String(msg._id))) return;
        state.seenIds.add(String(msg._id));
      }
      const mine = msg.senderModel === 'User';
      renderMsg(msg, mine);
    });
  }

  let sending = false;
  let lastSendAt = 0;
  let lastContent = '';

  const send = () => {
    const content = inputEl.value.trim();
    if (!content) return;
    const now = Date.now();
    if (sending && now - lastSendAt < 300) return;
    if (content === lastContent && now - lastSendAt < 1000) return;
    lastContent = content;
    lastSendAt = now;
    sending = true;
    setTimeout(() => { sending = false; }, 300);
    inputEl.value = '';
    if (socket && sessionUser && sessionUser._id) {
      socket.emit('chat:message', { fromUserId: sessionUser._id, content, senderRole: 'user' });
    } else {
      // Not logged in: prompt user
      const warn = document.createElement('div');
      warn.className = 'chat-msg chat-admin';
      warn.textContent = 'Bạn cần đăng nhập trước khi gửi tin nhắn.';
      messagesEl.appendChild(warn);
    }
  };

    // Image sending elements (if present in DOM)
    const imageInput = box.querySelector('#chat-image');
    const imageBtn = null;
    const sendImage = async () => {
      if (!imageInput || !imageInput.files || imageInput.files.length === 0) return;
      if (!socket || !sessionUser || !sessionUser._id) {
        const warn = document.createElement('div');
        warn.className = 'chat-msg chat-admin';
        warn.textContent = 'Bạn cần đăng nhập trước khi gửi hình ảnh.';
        messagesEl.appendChild(warn);
        return;
      }
      const file = imageInput.files[0];
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/chat/message/image', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        renderMsg(data.message, true);
        imageInput.value = '';
      }
    };
    // No explicit send-image button; auto-send on selection
    if (imageInput) imageInput.addEventListener('change', sendImage);

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  });
})();
