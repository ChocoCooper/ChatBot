// dashboard.js — Supabase-powered dashboard

document.addEventListener('DOMContentLoaded', async () => {
    const sb = getSupabase();

    // Auth guard
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = "login.html"; return; }

    const userId = session.user.id;
    let profile = null;
    let selectedGender = null;

    // Fetch profile
    async function loadProfile() {
        const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
        profile = data;
        renderProfile();
        if (!profile?.age || !profile?.gender) {
            showProfileModal();
        }
        loadChatHistory();
    }

    function renderProfile() {
        if (!profile) return;
        document.getElementById('dash-username').textContent = profile.username || 'User';
        document.getElementById('stat-age').textContent = profile.age || '--';
        document.getElementById('stat-gender').textContent = profile.gender || '--';
        if (profile.age) document.getElementById('stat-age').classList.remove('muted');
        if (profile.gender) document.getElementById('stat-gender').classList.remove('muted');

        // Health status
        const status = profile.health_status;
        if (status) {
            const badge = document.getElementById('hs-badge');
            const text = document.getElementById('hs-text');
            badge.className = `hs-badge ${status.class}`;
            badge.textContent = status.label;
            text.textContent = status.summary || 'Based on your recent conversations.';
        }
    }

    // PROFILE MODAL
    function showProfileModal() {
        document.getElementById('profile-modal').classList.remove('hide');
    }
    function hideProfileModal() {
        document.getElementById('profile-modal').classList.add('hide');
    }

    // Gender buttons
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedGender = btn.dataset.gender;
        });
    });

    // Pre-select if editing
    function preselectGender(g) {
        if (!g) return;
        selectedGender = g;
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.gender === g);
        });
    }

    document.getElementById('save-profile-btn').addEventListener('click', async () => {
        const ageVal = parseInt(document.getElementById('modal-age').value);
        const errEl = document.getElementById('modal-error');
        errEl.textContent = '';

        if (!ageVal || ageVal < 1 || ageVal > 120) {
            errEl.textContent = 'Please enter a valid age (1-120).';
            return;
        }
        if (!selectedGender) {
            errEl.textContent = 'Please select a gender.';
            return;
        }

        const { error } = await sb.from('profiles').update({ age: ageVal, gender: selectedGender }).eq('id', userId);
        if (error) { errEl.textContent = 'Failed to save. Try again.'; return; }

        if (profile) { profile.age = ageVal; profile.gender = selectedGender; }
        renderProfile();
        hideProfileModal();
    });

    document.getElementById('skip-profile').addEventListener('click', hideProfileModal);
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        if (profile?.age) document.getElementById('modal-age').value = profile.age;
        preselectGender(profile?.gender);
        showProfileModal();
    });

    // CHAT HISTORY
    async function loadChatHistory() {
        const { data: chats } = await sb
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(8);

        const grid = document.getElementById('history-grid');
        const statChats = document.getElementById('stat-chats');
        const statLast = document.getElementById('stat-last');

        if (!chats || chats.length === 0) {
            grid.innerHTML = `
                <div class="history-empty">
                    <span class="material-symbols-rounded">chat_bubble_outline</span>
                    <p>No conversations yet. Start chatting with the AI!</p>
                    <a href="chatbot.html" class="go-chat-btn">
                        <span class="material-symbols-rounded" style="font-size:1rem">forum</span>
                        Open ChatBot
                    </a>
                </div>`;
            statChats.textContent = '0';
            return;
        }

        statChats.textContent = chats.length >= 8 ? '8+' : chats.length;
        statChats.classList.remove('muted');

        // Last active
        const lastDate = new Date(chats[0].created_at);
        const now = new Date();
        const diffHrs = Math.round((now - lastDate) / 3600000);
        statLast.textContent = diffHrs < 1 ? 'Just now' : diffHrs < 24 ? `${diffHrs}h ago` : `${Math.round(diffHrs/24)}d ago`;
        statLast.classList.remove('muted');

        grid.innerHTML = '';
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="hi-icon"><span class="material-symbols-rounded">forum</span></div>
                <div class="hi-content">
                    <div class="hi-question">${escHtml(chat.question)}</div>
                    <div class="hi-response">${escHtml(chat.answer?.substring(0, 120) || '')}…</div>
                </div>
                <div class="hi-time">${timeAgo(chat.created_at)}</div>`;
            item.addEventListener('click', () => { window.location.href = 'chatbot.html'; });
            grid.appendChild(item);
        });
    }

    function escHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function timeAgo(iso) {
        const d = new Date(iso);
        const diff = Math.round((Date.now() - d) / 60000);
        if (diff < 1) return 'just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.round(diff/60)}h ago`;
        return `${Math.round(diff/1440)}d ago`;
    }

    loadProfile();
});
