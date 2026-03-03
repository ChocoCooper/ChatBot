const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterBtn = document.getElementById("show-register");
const showLoginBtn = document.getElementById("show-login");
const loginError = document.getElementById("login-error");
const regError = document.getElementById("reg-error");

// Check if already logged in
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (currentUser) {
    window.location.href = "dashboard.html";
}

// Handle URL params for mode
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');

if (mode === 'signup') {
    loginForm.classList.add("hide");
    registerForm.classList.remove("hide");
}

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

registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value.trim();

    if (username && password) {
        const users = JSON.parse(localStorage.getItem("mockUsers")) || [];
        if (users.find(u => u.username === username)) {
            regError.innerText = "Username already exists!";
            return;
        }

        users.push({ username, password });
        localStorage.setItem("mockUsers", JSON.stringify(users));
        
        alert("Registration Successful! Please login.");
        showLoginBtn.click(); 
    }
});

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    const users = JSON.parse(localStorage.getItem("mockUsers")) || [];
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        window.location.href = "dashboard.html";
    } else {
        loginError.innerText = "Invalid username or password";
    }
});