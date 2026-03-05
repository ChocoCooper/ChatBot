// auth.js — Supabase-powered authentication

document.addEventListener('DOMContentLoaded', async () => {
    const sb = getSupabase();

    // Check if already logged in
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        window.location.href = "dashboard.html";
        return;
    }

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegisterBtn = document.getElementById("show-register");
    const showLoginBtn = document.getElementById("show-login");
    const loginError = document.getElementById("login-error");
    const regError = document.getElementById("reg-error");
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");

    // Handle URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup') {
        loginForm.classList.add("hide");
        registerForm.classList.remove("hide");
    }

    // Toggle forms
    showRegisterBtn.addEventListener("click", () => {
        loginForm.classList.add("hide");
        registerForm.classList.remove("hide");
        loginError.innerText = "";
    });

    showLoginBtn.addEventListener("click", () => {
        registerForm.classList.add("hide");
        loginForm.classList.remove("hide");
        regError.innerText = "";
    });

    // Password visibility toggles
    document.querySelectorAll('.show-pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                btn.textContent = 'visibility';
            }
        });
    });

    // Password strength
    const regPwInput = document.getElementById('reg-password');
    if (regPwInput) {
        regPwInput.addEventListener('input', () => {
            const val = regPwInput.value;
            const bars = [document.getElementById('bar1'), document.getElementById('bar2'), document.getElementById('bar3'), document.getElementById('bar4')];
            bars.forEach(b => b.className = 'strength-bar');

            let score = 0;
            if (val.length >= 8) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const cls = score <= 1 ? 'weak' : score <= 2 ? 'medium' : 'strong';
            for (let i = 0; i < score; i++) bars[i].classList.add(cls);
        });
    }

    // Confirm password live validation
    const confirmPw = document.getElementById('reg-confirm-password');
    if (confirmPw) {
        confirmPw.addEventListener('input', () => {
            if (confirmPw.value && confirmPw.value !== regPwInput.value) {
                regError.innerText = "Passwords do not match.";
            } else {
                regError.innerText = "";
            }
        });
    }

    function setLoading(btn, isLoading, label) {
        btn.disabled = isLoading;
        btn.innerHTML = isLoading
            ? `<span class="loading-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;"></span>Please wait...`
            : label;
    }

    // REGISTER
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("reg-email").value.trim();
        const username = document.getElementById("reg-username").value.trim();
        const password = document.getElementById("reg-password").value;
        const confirm = document.getElementById("reg-confirm-password").value;

        regError.innerText = "";

        if (password !== confirm) {
            regError.innerText = "Passwords do not match. Please try again.";
            document.getElementById("reg-confirm-password").style.borderColor = "#ef4444";
            return;
        }
        if (password.length < 6) {
            regError.innerText = "Password must be at least 6 characters.";
            return;
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            regError.innerText = "Username: 3-20 chars, letters/numbers/underscore only.";
            return;
        }

        setLoading(registerBtn, true, "Create Account");

        // Check username uniqueness
        const { data: existing } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
        if (existing) {
            regError.innerText = "Username already taken. Choose another.";
            setLoading(registerBtn, false, "Create Account");
            return;
        }

        const { data, error } = await sb.auth.signUp({ email, password });

        if (error) {
            regError.innerText = error.message;
            setLoading(registerBtn, false, "Create Account");
            return;
        }

        // Insert profile
        if (data.user) {
            await sb.from('profiles').insert({
                id: data.user.id,
                username,
                email,
                created_at: new Date().toISOString()
            });
        }

        setLoading(registerBtn, false, "Create Account");
        alert("Account created! You can now log in.");
        showLoginBtn.click();
    });

    // LOGIN
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const identifier = document.getElementById("login-identifier").value.trim();
        const password = document.getElementById("login-password").value;

        loginError.innerText = "";
        setLoading(loginBtn, true, "Log In");

        let email = identifier;

        // If it doesn't look like an email, look up by username
        if (!identifier.includes('@')) {
            const { data: profile } = await sb.from('profiles').select('email').eq('username', identifier).maybeSingle();
            if (!profile) {
                loginError.innerText = "Username not found.";
                setLoading(loginBtn, false, "Log In");
                return;
            }
            email = profile.email;
        }

        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            loginError.innerText = "Invalid credentials. Please try again.";
            setLoading(loginBtn, false, "Log In");
            return;
        }

        window.location.href = "dashboard.html";
    });
});
