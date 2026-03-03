const landingLoginBtn = document.getElementById("landing-login-btn");
const landingSignupBtn = document.getElementById("landing-signup-btn");
const landingGetStartedBtn = document.getElementById("landing-get-started-btn");

// Check if already logged in
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (currentUser) {
    window.location.href = "dashboard.html";
}

if (landingLoginBtn) {
    landingLoginBtn.addEventListener("click", () => {
        window.location.href = "login.html?mode=login";
    });
}

if (landingSignupBtn) {
    landingSignupBtn.addEventListener("click", () => {
        window.location.href = "login.html?mode=signup";
    });
}

if (landingGetStartedBtn) {
    landingGetStartedBtn.addEventListener("click", () => {
        window.location.href = "login.html?mode=signup";
    });
}