(() => {
  const socket = io();
  socket.on('connect', () => console.log('[adminChat] socket connected', socket.id));
  socket.emit('join', { role: 'admin' });

  const convList = document.getElementById('conv-list');
  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-text');
  const sendBtn = document.getElementById('chat-send');
  const imageInput = document.getElementById('chat-image');
  const imageBtn = document.getElementById('chat-send-image');
  const headerEl = document.getElementById('chat-header');

  let currentUser = null;
  // Track conversations locally for faster UI updates and unread badges
  // Map<userId, { user, lastMessageAt, unread }>
  const conversations = new Map();

  const renderConvList = () => {
    // Sort by lastMessageAt desc
    const items = Array.from(conversations.values()).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    convList.innerHTML = '';
    items.forEach(({ user, lastMessageAt, unread }) => {
      const li = document.createElement('li');
      li.style.padding = '10px';
      li.style.cursor = 'pointer';
      li.style.borderBottom = '1px solid #eee';
      li.dataset.userId = String(user?._id);
      const label = `${user?.name || user?.email || user?._id} — ${new Date(lastMessageAt).toLocaleString()}`;
      // Build row with optional unread badge
      const nameSpan = document.createElement('span');
      nameSpan.textContent = label;
      li.appendChild(nameSpan);
      if (unread && unread > 0 && (!currentUser || String(currentUser._id) !== String(user?._id))) {
        const badge = document.createElement('span');
        badge.textContent = ` ${unread}`;
        badge.style.background = '#e53935';
        badge.style.color = '#fff';
        badge.style.borderRadius = '10px';
        badge.style.fontSize = '12px';
        badge.style.padding = '2px 6px';
        badge.style.marginLeft = '8px';
        li.appendChild(badge);
      }
      // Highlight selected user
      if (currentUser && String(currentUser._id) === String(user?._id)) {
        li.style.background = '#f9f9f9';
        li.style.fontWeight = '600';
      }
      li.addEventListener('click', () => selectUser(user));
      convList.appendChild(li);
    });
  };

  const loadConversations = async () => {
    const res = await fetch('/chat/conversations');
    const data = await res.json();
    conversations.clear();
    (data.conversations || []).forEach(({ user, lastMessageAt }) => {
      conversations.set(String(user?._id), { user, lastMessageAt, unread: 0 });
    });
    renderConvList();
  };

  const selectUser = async (user) => {
    currentUser = user;
    headerEl.textContent = `Đang chat với: ${user?.name || user?.email || user?._id}`;
    messagesEl.innerHTML = '';
    // Reset unread for selected user
    const entry = conversations.get(String(user._id));
    if (entry) {
      entry.unread = 0;
      conversations.set(String(user._id), entry);
      renderConvList();
    }
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
    // Update conversations list for new incoming user messages
    const isUserMsg = String(msg.senderModel) === 'User';
    const senderId = String(msg.senderId || '');
    const recipientId = String(msg.recipientId || '');
    const ts = msg.createdAt || Date.now();

    // If message from a user, bump convo and set unread when not focused
    if (isUserMsg) {
      const existing = conversations.get(senderId);
      if (existing) {
        existing.lastMessageAt = ts;
        // Increment unread unless viewing this user
        if (!currentUser || String(currentUser._id) !== senderId) {
          existing.unread = (existing.unread || 0) + 1;
        }
        conversations.set(senderId, existing);
        renderConvList();
      } else {
        // Unknown user (new conversation): refresh list from server
        loadConversations();
      }
    }

    // Render into the active chat pane if it belongs to the selected user
    if (currentUser && (senderId === String(currentUser._id) || recipientId === String(currentUser._id))) {
      // Do not double-render admin's own messages here
      if (isUserMsg) {
        renderMsg(msg, false);
        // Clear unread since user is active
        const entry = conversations.get(senderId);
        if (entry) {
          entry.unread = 0;
          conversations.set(senderId, entry);
          renderConvList();
        }
      }
    }
  });

  const sendImage = async () => {
    if (!currentUser || !imageInput || !imageInput.files || imageInput.files.length === 0) return;
    const file = imageInput.files[0];
    const fd = new FormData();
    fd.append('image', file);
    fd.append('toUserId', currentUser._id);
    const res = await fetch('/chat/admin/message/image', { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      renderMsg(data.message, true);
      imageInput.value = '';
    }
  };

  // No explicit send-image button; auto-send on selection
  if (imageInput) imageInput.addEventListener('change', sendImage);

  loadConversations();
})();
