(() => {
  const socket = io();
  socket.on('connect', () => console.log('[adminChat] socket connected', socket.id));
  socket.emit('join', { role: 'admin' });

  const convList = document.getElementById('conv-list');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-text');
  const sendBtn = document.getElementById('chat-send');
  const headerEl = document.getElementById('chat-header');

  let currentUser = null;

  const loadConversations = async () => {
    const res = await fetch('/chat/conversations');
    const data = await res.json();
    convList.innerHTML = '';
    (data.conversations || []).forEach(({ user, lastMessageAt }) => {
      const li = document.createElement('li');
      li.style.padding = '10px';
      li.style.cursor = 'pointer';
      li.style.borderBottom = '1px solid #eee';
      li.textContent = `${user?.name || user?.email || user?._id} — ${new Date(lastMessageAt).toLocaleString()}`;
      li.addEventListener('click', () => selectUser(user));
      convList.appendChild(li);
    });
  };

  const selectUser = async (user) => {
    currentUser = user;
    headerEl.textContent = `Đang chat với: ${user?.name || user?.email || user?._id}`;
    messagesEl.innerHTML = '';
    const res = await fetch(`/chat/conversation/${user._id}`);
    const data = await res.json();
    (data.messages || []).forEach((m) => renderMsg(m, m.senderModel === 'Admin'));
  };

  const renderMsg = (msg, mine) => {
    const div = document.createElement('div');
    div.className = `chat-msg ${mine ? 'chat-me' : 'chat-admin'}`;
    div.style.margin = '6px 0';
    div.style.maxWidth = '75%';
    div.style.padding = '8px 10px';
    div.style.borderRadius = '10px';
    div.style.background = mine ? '#e6f3ff' : '#f3f3f3';
    div.style.marginLeft = mine ? 'auto' : '0';
    div.textContent = msg.content;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const send = async () => {
    const content = inputEl.value.trim();
    if (!content || !currentUser) return;
    inputEl.value = '';
    renderMsg({ content }, true);
    const admin = window.__ADMIN__;
    socket.emit('chat:message', { fromAdminId: admin?._id, toUserId: currentUser._id, content, senderRole: 'admin' });
  };

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  });

  socket.on('chat:message', (msg) => {
    console.log('[adminChat] chat:message', msg);
    if (!currentUser || String(msg.senderModel) === 'Admin') return;
    if (String(msg.senderId) === String(currentUser._id) || String(msg.recipientId) === String(currentUser._id)) {
      renderMsg(msg, false);
    }
  });

  loadConversations();
})();
