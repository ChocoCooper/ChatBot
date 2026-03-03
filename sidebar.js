document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const menuItems = document.querySelectorAll('.menu-item');

    // Toggle Sidebar
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to logout?")) {
                localStorage.removeItem("currentUser");
                window.location.href = "index.html"; 
            }
        });
    }

    // Navigation Logic
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target === 'dashboard') window.location.href = 'dashboard.html';
            else if (target === 'chatbot') window.location.href = 'chatbot.html';
            else if (target === 'hospitals') window.location.href = 'hospitals.html';
            else if (target === 'support') window.location.href = 'support.html';
            else alert("This feature is coming soon!");
        });
    });

    // Set Active State based on URL
    const path = window.location.pathname;
    menuItems.forEach(item => {
        item.classList.remove('active');
        const target = item.getAttribute('data-target');
        if (path.includes('dashboard.html') && target === 'dashboard') item.classList.add('active');
        if (path.includes('chatbot.html') && target === 'chatbot') item.classList.add('active');
        if (path.includes('hospitals.html') && target === 'hospitals') item.classList.add('active');
        if (path.includes('support.html') && target === 'support') item.classList.add('active');
    });
});