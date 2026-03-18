document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const menuItems = document.querySelectorAll('.menu-item');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to logout?")) {
                try {
                    const sb = getSupabase();
                    await sb.auth.signOut();
                } catch(e) {}
                window.location.href = "index.html";
            }
        });
    }

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target === 'dashboard') window.location.href = 'dashboard.html';
            else if (target === 'chatbot') window.location.href = 'chatbot.html';
            else if (target === 'hospitals') window.location.href = 'hospitals.html';
            else if (target === 'articles') window.location.href = 'articles.html';
            else if (target === 'support') window.location.href = 'support.html';
        });
    });

    const path = window.location.pathname;
    menuItems.forEach(item => {
        item.classList.remove('active');
        const target = item.getAttribute('data-target');
        if (path.includes('dashboard.html') && target === 'dashboard') item.classList.add('active');
        if (path.includes('chatbot.html') && target === 'chatbot') item.classList.add('active');
        if (path.includes('hospitals.html') && target === 'hospitals') item.classList.add('active');
        if (path.includes('articles.html') && target === 'articles') item.classList.add('active');
        if (path.includes('support.html') && target === 'support') item.classList.add('active');
    });
});
