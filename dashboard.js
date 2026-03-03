const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const dashUsername = document.getElementById("dash-username");

// Check Session
if (!currentUser) {
    window.location.href = "login.html";
} else {
    if (dashUsername) dashUsername.innerText = currentUser.username;
}