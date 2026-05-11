/**
 * askUNI — belikeminded.js
 * Discussion Forum Logic (Backend Connected)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // --- Environment & Auth ---
    const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
    const API_BASE_URL = isLocalEnv ? "http://" + window.location.hostname + ":5000" : "https://askunibackend.onrender.com";

    function getToken() {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
        if (authCookie) return authCookie.split('=')[1];
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token') || localStorage.getItem('auth_token');
    }

    const token = getToken();
    if (!token) {
        window.location.href = 'login_signup.html';
        return;
    }

    // --- State ---
    let currentUser = null;
    let forums = [];
    let joinRequests = [];
    let activeTab = 'global';
    let currentForumId = null;

    // --- DOM Elements ---
    const tabs = document.querySelectorAll('.forum-tab');
    const forumsContainer = document.getElementById('forums-container');
    const requestsContainer = document.getElementById('requests-container');
    
    const forumListView = document.getElementById('forum-list-view');
    const forumRequestsView = document.getElementById('forum-requests-view');
    const forumChatView = document.getElementById('forum-chat-view');

    const requestsBadge = document.getElementById('requestsBadge');

    const createForumBtn = document.getElementById('createForumBtn');
    const createForumBtnMobile = document.getElementById('createForumBtnMobile');
    const createForumModal = document.getElementById('createForumModal');
    const closeCreateForumModal = document.getElementById('closeCreateForumModal');
    const cancelCreateForumBtn = document.getElementById('cancelCreateForumBtn');
    const createForumForm = document.getElementById('createForumForm');

    const customAlert = document.getElementById('customAlert');
    const customAlertMessage = document.getElementById('customAlertMessage');
    const customAlertBtn = document.getElementById('customAlertBtn');

    function showAlert(msg) {
        customAlertMessage.textContent = msg;
        customAlert.classList.add('show');
    }

    customAlertBtn.addEventListener('click', () => {
        customAlert.classList.remove('show');
    });

    // --- Init user ---
    async function initUser() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/verify-token`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                currentUser = { id: data.user_id, name: data.email };
            } else {
                window.location.href = 'login_signup.html';
            }
        } catch (e) {
            console.error("Auth check failed:", e);
        }
    }

    // --- Fetch Data ---
    async function fetchForums() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forums`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                forums = data.forums;
            }
        } catch (e) {
            console.error("Failed to fetch forums", e);
        }
    }

    async function fetchRequests() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forums/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                joinRequests = data.requests;
                updateBadge();
            }
        } catch (e) {
            console.error("Failed to fetch requests", e);
        }
    }

    // --- Tab Logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.dataset.tab;
            
            if (activeTab === 'requests') {
                forumListView.classList.remove('active');
                forumChatView.classList.remove('active');
                forumRequestsView.classList.add('active');
                await fetchRequests();
                renderRequests();
            } else {
                forumRequestsView.classList.remove('active');
                forumChatView.classList.remove('active');
                forumListView.classList.add('active');
                await fetchForums();
                renderForums();
            }
        });
    });

    // --- Render Forums ---
    function renderForums() {
        forumsContainer.innerHTML = '';
        
        let filteredForums = forums;
        if (activeTab === 'global') {
            filteredForums = forums.filter(f => f.visibility === 'global');
        } else if (activeTab === 'college') {
            filteredForums = forums.filter(f => f.visibility === 'college');
        } else if (activeTab === 'my-forums') {
            filteredForums = forums.filter(f => f.joined || f.admin_id === currentUser.id);
        }

        if (filteredForums.length === 0) {
            forumsContainer.innerHTML = '<p style="color: var(--text-3); grid-column: 1/-1; text-align: center; padding: 2rem;">No forums found in this category.</p>';
            return;
        }

        filteredForums.forEach(forum => {
            const card = document.createElement('div');
            card.className = 'forum-card';
            
            const isMember = forum.joined || forum.admin_id === currentUser.id;
            const actionBtn = isMember ? 
                `<button class="btn btn-ghost open-forum-btn" data-id="${forum.id}">Open Chat</button>` : 
                `<button class="btn btn-primary join-forum-btn" data-id="${forum.id}">Request to Join</button>`;

            card.innerHTML = `
                <div class="forum-card-header">
                    <h3 class="forum-card-title">${forum.title}</h3>
                    <span class="forum-visibility-tag ${forum.visibility}">${forum.visibility === 'global' ? 'Global' : 'College'}</span>
                </div>
                <p class="forum-card-desc">${forum.description}</p>
                <div class="forum-card-footer">
                    <span class="forum-members"><i class="fas fa-users"></i> ${forum.members || 0} members</span>
                    ${actionBtn}
                </div>
            `;
            forumsContainer.appendChild(card);
        });

        document.querySelectorAll('.join-forum-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                try {
                    const res = await fetch(`${API_BASE_URL}/api/forums/${id}/join`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        showAlert(data.message);
                        await fetchForums();
                        renderForums();
                    } else {
                        showAlert(data.message);
                    }
                } catch(err) {
                    console.error(err);
                }
            });
        });

        document.querySelectorAll('.open-forum-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                openChat(id);
            });
        });
    }

    // --- Render Requests ---
    function updateBadge() {
        if (joinRequests.length > 0) {
            requestsBadge.style.display = 'inline-block';
            requestsBadge.textContent = joinRequests.length;
        } else {
            requestsBadge.style.display = 'none';
        }
    }

    function renderRequests() {
        requestsContainer.innerHTML = '';

        if (joinRequests.length === 0) {
            requestsContainer.innerHTML = '<p style="color: var(--text-3); text-align: center; padding: 2rem;">No pending join requests.</p>';
            return;
        }

        joinRequests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'request-item';
            item.innerHTML = `
                <div class="request-info">
                    <div class="request-user">${req.user_name}</div>
                    <div class="request-meta">Wants to join <strong>${req.forum_title}</strong></div>
                </div>
                <div class="request-actions">
                    <button class="btn btn-ghost reject-req-btn" data-id="${req.id}">Reject</button>
                    <button class="btn btn-primary approve-req-btn" data-id="${req.id}">Approve</button>
                </div>
            `;
            requestsContainer.appendChild(item);
        });

        document.querySelectorAll('.approve-req-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleRequestAction(e.target.dataset.id, 'approve'));
        });

        document.querySelectorAll('.reject-req-btn').forEach(btn => {
            btn.addEventListener('click', (e) => handleRequestAction(e.target.dataset.id, 'reject'));
        });
    }

    async function handleRequestAction(reqId, action) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forums/requests/${reqId}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.success) {
                showAlert(`Request ${action}d successfully`);
                await fetchRequests();
                renderRequests();
            } else {
                showAlert(data.message);
            }
        } catch(e) {
            console.error(e);
        }
    }

    // --- Chat Logic ---
    const chatForumTitle = document.getElementById('chatForumTitle');
    const chatForumMembers = document.getElementById('chatForumMembers');
    const chatMessages = document.getElementById('chatMessages');
    const backToForumsBtn = document.getElementById('backToForumsBtn');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');

    let messagePollInterval = null;
    let lastMessageCount = 0;
    let _sseForumHandler = null; // track our SSE handler so we can remove it

    async function openChat(forumId) {
        currentForumId = forumId;
        lastMessageCount = 0;
        const forum = forums.find(f => f.id === forumId);
        
        chatForumTitle.textContent = forum.title;
        chatForumMembers.textContent = `${forum.members || 0} members`;
        
        forumListView.classList.remove('active');
        forumRequestsView.classList.remove('active');
        forumChatView.classList.add('active');

        // Initial message load
        await fetchAndRenderMessages();

        // ── Replace polling with SSE ─────────────────────────────
        // Clear old poll interval if any (legacy fallback)
        if (messagePollInterval) {
            clearInterval(messagePollInterval);
            messagePollInterval = null;
        }

        // Remove previous SSE handler for this page
        if (_sseForumHandler && window.AskUNIRealtime) {
            AskUNIRealtime.offEvent('new_forum_message', _sseForumHandler);
        }

        if (window.AskUNIRealtime) {
            // Connect to forum-specific SSE stream
            AskUNIRealtime.connectForum(forumId);

            // Register handler — appends the message card instantly
            _sseForumHandler = (data) => {
                // Only handle messages for the currently open forum
                if (data.forum_id !== forumId && String(data.forum_id) !== String(forumId)) return;

                const isMine = String(data.authorId) === String(currentUser?.id);

                // Avoid duplicates (poster already sees it via optimistic UI)
                if (document.querySelector(`[data-msg-id="${data.id}"]`)) return;

                _appendMessage(data, isMine);
                console.log('[SSE] Forum message received:', data.id);
            };

            AskUNIRealtime.onEvent('new_forum_message', _sseForumHandler);
            console.log('[SSE] Forum SSE listener registered for forum:', forumId);
        } else {
            // Fallback to polling if realtime.js not loaded
            console.warn('[SSE] AskUNIRealtime not available, falling back to 3s poll');
            messagePollInterval = setInterval(fetchAndRenderMessages, 3000);
        }
    }

    backToForumsBtn.addEventListener('click', () => {
        currentForumId = null;

        // Clean up SSE and polling on exit
        if (messagePollInterval) {
            clearInterval(messagePollInterval);
            messagePollInterval = null;
        }
        if (_sseForumHandler && window.AskUNIRealtime) {
            AskUNIRealtime.offEvent('new_forum_message', _sseForumHandler);
            AskUNIRealtime.disconnectForum();
            _sseForumHandler = null;
        }

        forumChatView.classList.remove('active');
        if (activeTab === 'requests') {
            forumRequestsView.classList.add('active');
        } else {
            forumListView.classList.add('active');
            renderForums();
        }
    });

    async function fetchAndRenderMessages() {
        if (!currentForumId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/forums/${currentForumId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                renderMessages(data.messages);
            }
        } catch (e) {
            console.error("Failed to load messages", e);
        }
    }

    function renderMessages(msgs) {
        // Prevent unnecessary re-renders that cause flickering
        const msgsString = JSON.stringify(msgs);
        if (msgsString === chatMessages.dataset.lastMsgs) {
            return;
        }
        chatMessages.dataset.lastMsgs = msgsString;

        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 10;

        chatMessages.innerHTML = '';
        
        if (msgs.length === 0) {
            chatMessages.innerHTML = '<p style="color: var(--text-3); text-align: center; padding: 2rem;">No messages yet. Be the first to say hello!</p>';
            return;
        }

        msgs.forEach(msg => {
            const isMine = msg.authorId === currentUser.id;
            _appendMessage(msg, isMine);
        });

        if (isScrolledToBottom || lastMessageCount === 0) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        lastMessageCount = msgs.length;
    }

    /**
     * Append a single message bubble to the chat.
     * Used both by renderMessages (initial load) and SSE handler (realtime).
     */
    function _appendMessage(msg, isMine) {
        // Guard against duplicates
        if (document.querySelector(`[data-msg-id="${msg.id}"]`)) return;

        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 10;

        const el = document.createElement('div');
        el.className = `chat-message ${isMine ? 'mine' : ''}`;
        el.dataset.msgId = msg.id; // used for dedup check
        const likeClass = msg.likedByMe ? 'liked' : '';
        
        el.innerHTML = `
            <div class="message-avatar">${msg.author ? msg.author.charAt(0).toUpperCase() : 'U'}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${msg.author}</span>
                    <span class="message-time">${msg.time}</span>
                </div>
                <div class="message-text">${msg.text}</div>
                <div class="message-actions">
                    <button class="btn-like ${likeClass}" data-id="${msg.id}">
                        <i class="${msg.likedByMe ? 'fas' : 'far'} fa-heart"></i> <span class="like-count">${msg.likes || 0}</span>
                    </button>
                </div>
            </div>
        `;
        chatMessages.appendChild(el);

        // Attach like handler
        el.querySelector('.btn-like').addEventListener('click', async (e) => {
            const btnEl = e.target.closest('.btn-like');
            await toggleLike(btnEl.dataset.id, btnEl);
        });

        // Auto-scroll if user was at the bottom
        if (isScrolledToBottom) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        lastMessageCount++;
    }

    async function toggleLike(msgId, btnEl) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/forums/messages/${msgId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const isLiked = data.action === 'liked';
                const likeCountSpan = btnEl.querySelector('.like-count');
                const currentLikes = parseInt(likeCountSpan.textContent);
                
                if (isLiked) {
                    btnEl.classList.add('liked');
                    btnEl.querySelector('i').className = 'fas fa-heart';
                    likeCountSpan.textContent = currentLikes + 1;
                } else {
                    btnEl.classList.remove('liked');
                    btnEl.querySelector('i').className = 'far fa-heart';
                    likeCountSpan.textContent = currentLikes - 1;
                }
            }
        } catch (e) {
            console.error("Like failed", e);
        }
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text || !currentForumId) return;

        chatInput.value = ''; // clear immediately for UX

        // Optimistic UI: show the message immediately for the poster
        // The SSE event will handle delivery to other users
        const optimisticMsg = {
            id: `optimistic-${Date.now()}`,
            text,
            author: currentUser?.name || 'Me',
            authorId: currentUser?.id,
            likes: 0,
            likedByMe: false,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        _appendMessage(optimisticMsg, true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/forums/${currentForumId}/messages`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: text })
            });
            const data = await res.json();
            if (!data.success) {
                showAlert('Failed to send message: ' + data.message);
                // Remove optimistic message on failure
                const optEl = document.querySelector(`[data-msg-id="${optimisticMsg.id}"]`);
                if (optEl) optEl.remove();
            }
            // On success: SSE will deliver the real message to other users.
            // The poster already sees it via optimistic UI.
        } catch(e) {
            console.error('Message send failed', e);
            showAlert('Failed to send message. Please check your connection.');
        }
    });

    // --- Create Forum Modal ---
    function openModal() { createForumModal.classList.remove('hidden'); }
    function closeModal() { createForumModal.classList.add('hidden'); createForumForm.reset(); }

    if (createForumBtn) createForumBtn.addEventListener('click', openModal);
    if (createForumBtnMobile) createForumBtnMobile.addEventListener('click', openModal);
    if (document.getElementById('createForumBtnInner')) document.getElementById('createForumBtnInner').addEventListener('click', openModal);
    closeCreateForumModal.addEventListener('click', closeModal);
    cancelCreateForumBtn.addEventListener('click', closeModal);

    createForumForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('forumTitle').value.trim();
        const description = document.getElementById('forumDescription').value.trim();
        const visibility = document.getElementById('forumVisibility').value;

        try {
            const res = await fetch(`${API_BASE_URL}/api/forums`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, description, visibility })
            });
            const data = await res.json();
            
            if (data.success) {
                closeModal();
                showAlert('Forum created successfully!');
                
                await fetchForums();
                // Switch to My Forums
                document.querySelector('[data-tab="my-forums"]').click();
            } else {
                showAlert(data.message);
            }
        } catch(err) {
            console.error("Forum creation failed", err);
            showAlert("Failed to create forum.");
        }
    });

    // --- Initialization ---
    await initUser();
    if (currentUser) {
        await fetchForums();
        await fetchRequests();
        renderForums();
    }

    // Theme toggle
    const themeToggleHeader = document.getElementById('themeToggleHeader');
    if (themeToggleHeader) {
        themeToggleHeader.addEventListener('click', () => {
            document.body.classList.toggle('light');
        });
    }
});
