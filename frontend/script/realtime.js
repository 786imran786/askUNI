/**
 * askUNI — realtime.js
 * =====================
 * Centralized SSE (Server-Sent Events) manager.
 * 
 * Import this script BEFORE home.js / belikeminded.js.
 * It sets up ONE global EventSource connection and exposes
 * a simple listener registration API.
 *
 * Usage:
 *   AskUNIRealtime.onEvent('new_question', (data) => { ... });
 *   AskUNIRealtime.onEvent('new_answer',   (data) => { ... });
 *   AskUNIRealtime.onEvent('vote_update',  (data) => { ... });
 *   AskUNIRealtime.onForumMessage(forumId, (data) => { ... });
 */

window.AskUNIRealtime = (() => {
    // ── Config ────────────────────────────────────────────
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname) ||
                    location.hostname.startsWith('192.168.');
    const API_BASE = isLocal
        ? `http://${location.hostname}:5000`
        : 'https://askunibackend.onrender.com';

    // ── State ─────────────────────────────────────────────
    let _globalES = null;           // global feed EventSource
    let _forumES = null;            // forum chat EventSource
    let _currentForumId = null;     // which forum is currently open
    let _reconnectDelay = 1000;     // starts at 1s, backs off to 30s
    const MAX_RECONNECT_DELAY = 30000;

    // Registered handlers: { eventName: [fn, fn, ...] }
    const _handlers = {};

    // ── Private helpers ───────────────────────────────────

    function _dispatch(eventName, data) {
        const fns = _handlers[eventName] || [];
        fns.forEach(fn => {
            try { fn(data); }
            catch (e) { console.error(`[SSE] Handler error for "${eventName}":`, e); }
        });
    }

    function _connectGlobal() {
        if (_globalES && _globalES.readyState !== EventSource.CLOSED) return;

        const url = `${API_BASE}/api/sse/feed`;
        console.log('[SSE] Connecting to global feed:', url);

        _globalES = new EventSource(url, { withCredentials: true });

        // ── Connection open ───────────────────────────────
        _globalES.onopen = () => {
            console.log('[SSE] Global feed connected');
            _reconnectDelay = 1000; // reset backoff
            _dispatch('connected', { type: 'global' });
        };

        // ── Named events ─────────────────────────────────
        ['new_question', 'new_answer', 'vote_update'].forEach(eventName => {
            _globalES.addEventListener(eventName, (e) => {
                try {
                    const data = JSON.parse(e.data);
                    console.log(`[SSE] Event received: ${eventName}`, data);
                    _dispatch(eventName, data);
                } catch (err) {
                    console.error(`[SSE] Failed to parse ${eventName} event:`, err);
                }
            });
        });

        // Heartbeat — just keeps the connection alive, no action needed
        _globalES.addEventListener('heartbeat', () => {
            console.debug('[SSE] Heartbeat received');
        });

        // ── Error / reconnect ─────────────────────────────
        _globalES.onerror = (e) => {
            console.warn('[SSE] Global feed error, reconnecting in', _reconnectDelay, 'ms');
            _globalES.close();
            _globalES = null;
            setTimeout(() => {
                _reconnectDelay = Math.min(_reconnectDelay * 2, MAX_RECONNECT_DELAY);
                _connectGlobal();
            }, _reconnectDelay);
        };
    }

    function _connectForum(forumId) {
        // Close existing forum SSE if switching forums
        if (_forumES) {
            _forumES.close();
            _forumES = null;
        }
        _currentForumId = forumId;

        const url = `${API_BASE}/api/forums/${forumId}/sse`;
        console.log(`[SSE] Connecting to forum ${forumId}:`, url);

        _forumES = new EventSource(url, { withCredentials: true });

        _forumES.onopen = () => {
            console.log(`[SSE] Forum ${forumId} connected`);
            _dispatch('forum_connected', { forum_id: forumId });
        };

        _forumES.addEventListener('new_forum_message', (e) => {
            try {
                const data = JSON.parse(e.data);
                console.log(`[SSE] Forum message received:`, data);
                _dispatch('new_forum_message', data);
            } catch (err) {
                console.error('[SSE] Failed to parse forum message event:', err);
            }
        });

        _forumES.addEventListener('connected', () => {
            console.log(`[SSE] Forum ${forumId} SSE confirmed`);
        });

        _forumES.onerror = () => {
            console.warn(`[SSE] Forum ${forumId} error, will retry...`);
            _forumES.close();
            _forumES = null;
            // Reconnect only if this forum is still open
            if (_currentForumId === forumId) {
                setTimeout(() => _connectForum(forumId), 3000);
            }
        };
    }

    function _disconnectForum() {
        if (_forumES) {
            _forumES.close();
            _forumES = null;
        }
        _currentForumId = null;
        console.log('[SSE] Forum SSE disconnected');
    }

    // ── Public API ────────────────────────────────────────

    /**
     * Register a handler for a named SSE event.
     * @param {string} eventName  - 'new_question' | 'new_answer' | 'vote_update' | 'new_forum_message' | 'connected'
     * @param {function} handler  - called with parsed event data
     */
    function onEvent(eventName, handler) {
        if (!_handlers[eventName]) _handlers[eventName] = [];
        _handlers[eventName].push(handler);
    }

    /**
     * Remove a specific handler (or all handlers for an event).
     */
    function offEvent(eventName, handler) {
        if (!handler) {
            delete _handlers[eventName];
        } else if (_handlers[eventName]) {
            _handlers[eventName] = _handlers[eventName].filter(fn => fn !== handler);
        }
    }

    /**
     * Open forum SSE connection.
     * @param {number} forumId
     */
    function connectForum(forumId) {
        _connectForum(forumId);
    }

    /**
     * Close forum SSE connection (when leaving chat view).
     */
    function disconnectForum() {
        _disconnectForum();
    }

    /**
     * Get current connection status for debugging.
     */
    function status() {
        return {
            global: _globalES
                ? (_globalES.readyState === 0 ? 'CONNECTING' : _globalES.readyState === 1 ? 'OPEN' : 'CLOSED')
                : 'NOT_CREATED',
            forum: _forumES
                ? (_forumES.readyState === 0 ? 'CONNECTING' : _forumES.readyState === 1 ? 'OPEN' : 'CLOSED')
                : 'NOT_CREATED',
            currentForumId: _currentForumId,
        };
    }

    // ── Auto-start global connection ──────────────────────
    // Only start once the DOM is ready, to ensure auth cookies are set
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _connectGlobal);
    } else {
        _connectGlobal();
    }

    // Reconnect when tab becomes visible again (browser tab switching)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            if (!_globalES || _globalES.readyState === EventSource.CLOSED) {
                console.log('[SSE] Tab visible, reconnecting global feed...');
                _connectGlobal();
            }
        }
    });

    return { onEvent, offEvent, connectForum, disconnectForum, status };
})();
