/* =========================================
   MOCK AUTHENTICATION LOGIC
   ========================================= */
const authContainer = document.getElementById("auth-container");
const appContainer = document.getElementById("app-container");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterBtn = document.getElementById("show-register");
const showLoginBtn = document.getElementById("show-login");
const logoutBtn = document.getElementById("logout-button");
const userGreeting = document.getElementById("user-greeting");

const loginError = document.getElementById("login-error");
const regError = document.getElementById("reg-error");

// Toggle between Login and Register forms
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

// Handle Registration
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

// Handle Login
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    const users = JSON.parse(localStorage.getItem("mockUsers")) || [];
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        initializeSession(user);
    } else {
        loginError.innerText = "Invalid username or password";
    }
});

// Handle Logout
logoutBtn.addEventListener("click", () => {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentUser");
        location.reload(); 
    }
});

function initializeSession(user) {
    authContainer.classList.add("hide");
    appContainer.classList.remove("hide");
    userGreeting.innerText = user.username; 
    initChatApp();
}

window.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser) {
        initializeSession(currentUser);
    } else {
        authContainer.classList.remove("hide");
        appContainer.classList.add("hide");
    }
});


/* =========================================
   CORE CHATBOT LOGIC
   ========================================= */

function initChatApp() {
    const typingForm = document.querySelector(".typing-form");
    const chatContainer = document.querySelector(".chat-list");
    const suggestions = document.querySelectorAll(".suggestion");
    const toggleThemeButton = document.querySelector("#theme-toggle-button");
    const deleteChatButton = document.querySelector("#delete-chat-button");
    const voiceInputButton = document.querySelector("#voice-input-button");

    const fileInput = document.querySelector("#file-input");
    const imageUploadButton = document.querySelector("#image-upload-button");
    const imagePreviewContainer = document.querySelector("#image-preview-container");
    const imagePreview = document.querySelector("#image-preview");
    const removeImageButton = document.querySelector("#remove-image-button");

    let userMessage = null;
    let isResponseGenerating = false;
    let isListening = false;
    let recognition = null;
    let chatHistory = [];
    let selectedImage = null; 

    const API_KEY = CONFIG.API_KEY; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    // --- FIX: ROBUST SCROLL FUNCTION ---
    const scrollToBottom = () => {
        // Use requestAnimationFrame to ensure DOM is updated before scrolling
        requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });
    }

    // --- IMAGE HANDLING ---
    imageUploadButton.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result.split(",")[1];
            selectedImage = {
                inline_data: {
                    mime_type: file.type,
                    data: base64String
                }
            };
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove("hide");
            typingForm.querySelector(".typing-input").focus();
        };
        reader.readAsDataURL(file);
    });

    removeImageButton.addEventListener("click", () => {
        selectedImage = null;
        fileInput.value = "";
        imagePreviewContainer.classList.add("hide");
    });

    // --- SPEECH RECOGNITION ---
    const initSpeechRecognition = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onstart = () => {
                isListening = true;
                voiceInputButton.classList.add('listening');
                voiceInputButton.innerHTML = 'mic';
                voiceInputButton.style.color = '#ef4444'; 
            };
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const typingInput = document.querySelector('.typing-input');
                typingInput.value = transcript;
                typingInput.focus();
            };
            
            recognition.onend = () => {
                isListening = false;
                voiceInputButton.classList.remove('listening');
                voiceInputButton.innerHTML = 'mic';
                voiceInputButton.style.color = '';
            };
        } else {
            voiceInputButton.style.display = 'none';
        }
    };

    const toggleVoiceRecognition = () => {
        if (!recognition) return;
        isListening ? recognition.stop() : recognition.start();
    };

    // --- UI HELPERS ---
    const loadDataFromLocalstorage = () => {
        const savedChats = localStorage.getItem("saved-chats");
        const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

        document.body.classList.toggle("light_mode", isLightMode);
        toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

        chatContainer.innerHTML = savedChats || '';
        document.body.classList.toggle("hide-header", savedChats);
        
        scrollToBottom(); // Scroll on load
    };

    const createMessageElement = (content, ...classes) => {
        const div = document.createElement("div");
        div.classList.add("message", ...classes);
        div.innerHTML = content;
        return div;
    };

    const showTypingEffect = (text, textElement, incomingMessageDiv) => {
        const words = text.split(' ');
        let currentWordIndex = 0;
        
        const typingInterval = setInterval(() => {
            textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
            
            // FIX: Force scroll on every new word
            scrollToBottom();

            if (currentWordIndex === words.length) {
                clearInterval(typingInterval);
                isResponseGenerating = false;
                incomingMessageDiv.querySelector(".icon").classList.remove("hide");
                localStorage.setItem("saved-chats", chatContainer.innerHTML); 
            }
        }, 75);
    };

    // --- API INTERACTION ---
    const generateAPIResponse = async (incomingMessageDiv) => {
        const textElement = incomingMessageDiv.querySelector(".text"); 
        const userRequestParts = [{ text: userMessage }];
        if (selectedImage) userRequestParts.push(selectedImage);

        const historyForAPI = [
            ...chatHistory.slice(-10), 
            { role: "user", parts: userRequestParts }
        ];

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: historyForAPI }),
            });

            if (response.status === 429) throw new Error("⏳ Too fast! Wait 30s.");

            const data = await response.json();
            if (!response.ok) throw new Error(data.error.message || "Error!");

            const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
            
            chatHistory.push({ role: "user", parts: [{ text: userMessage || "[Image]" }] });
            chatHistory.push({ role: "model", parts: [{ text: apiResponse }] });

            selectedImage = null;
            fileInput.value = "";
            
            showTypingEffect(apiResponse, textElement, incomingMessageDiv); 
        } catch (error) { 
            isResponseGenerating = false;
            textElement.innerText = error.message;
            textElement.parentElement.closest(".message").classList.add("error");
        } finally {
            incomingMessageDiv.classList.remove("loading");
        }
    };

    const showLoadingAnimation = () => {
        const html = `<div class="message-content">
                        <img class="avatar" src="gemini-avatar.png" alt="AI">
                        <p class="text"></p>
                        <div class="loading-indicator">
                            <div class="loading-bar"></div><div class="loading-bar"></div><div class="loading-bar"></div>
                        </div>
                      </div>
                      <span onClick="copyMessage(this)" class="icon material-symbols-rounded hide">content_copy</span>`;
        const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
        chatContainer.appendChild(incomingMessageDiv);
        
        scrollToBottom(); // Scroll when loading bubbles appear
        
        generateAPIResponse(incomingMessageDiv);
    };

    window.copyMessage = (copyButton) => {
        const messageText = copyButton.parentElement.querySelector(".text").innerText;
        navigator.clipboard.writeText(messageText);
        copyButton.innerText = "done"; 
        setTimeout(() => copyButton.innerText = "content_copy", 1000); 
    };

    const handleOutgoingChat = () => {
        userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
        if((!userMessage && !selectedImage) || isResponseGenerating) return; 

        isResponseGenerating = true;
        let messageHtml = '';
        
        if (selectedImage) {
            messageHtml = `<div class="message-content">
                            <div class="text-wrapper">
                                <img src="${imagePreview.src}" class="attachment-thumb">
                                <p class="text"></p>
                            </div>
                           </div>`;
        } else {
            messageHtml = `<div class="message-content">
                            <p class="text"></p>
                           </div>`;
        }

        const outgoingMessageDiv = createMessageElement(messageHtml, "outgoing");
        outgoingMessageDiv.querySelector(".text").innerText = userMessage;
        chatContainer.appendChild(outgoingMessageDiv);
        
        typingForm.reset(); 
        imagePreviewContainer.classList.add("hide");
        document.body.classList.add("hide-header");
        
        scrollToBottom(); // Scroll when user sends message
        
        setTimeout(showLoadingAnimation, 500); 
    };

    // --- EVENT LISTENERS ---
    toggleThemeButton.addEventListener("click", () => {
        const isLightMode = document.body.classList.toggle("light_mode");
        localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
        toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
    });

    deleteChatButton.addEventListener("click", () => {
        if (confirm("Delete all chats?")) {
            localStorage.removeItem("saved-chats");
            chatHistory = []; 
            loadDataFromLocalstorage();
        }
    });

    suggestions.forEach(suggestion => {
        suggestion.addEventListener("click", () => {
            userMessage = suggestion.querySelector(".text").innerText;
            handleOutgoingChat();
        });
    });

    typingForm.addEventListener("submit", (e) => {
        e.preventDefault(); 
        handleOutgoingChat();
    });

    voiceInputButton.addEventListener("click", toggleVoiceRecognition);

    initSpeechRecognition();
    loadDataFromLocalstorage();
}
