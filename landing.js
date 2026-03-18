document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in via Supabase
    if (typeof getSupabase === 'function') {
        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        if (session) { window.location.href = "/dashboard"; return; }
    }

    const landingLoginBtn = document.getElementById("landing-login-btn");
    const landingSignupBtn = document.getElementById("landing-signup-btn");
    const landingGetStartedBtn = document.getElementById("landing-get-started-btn");

    if (landingLoginBtn) landingLoginBtn.addEventListener("click", () => { window.location.href = "/login?mode=login"; });
    if (landingSignupBtn) landingSignupBtn.addEventListener("click", () => { window.location.href = "/login?mode=signup"; });
    if (landingGetStartedBtn) landingGetStartedBtn.addEventListener("click", () => { window.location.href = "/login?mode=signup"; });
});
