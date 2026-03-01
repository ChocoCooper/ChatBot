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

let isChatInitialized = false;

// Mock user database (in memory only)
let mockUsers = [
    {
        username: "demo",
        email: "demo@example.com",
        password: "password123"
    }
];

// Check for existing session on load
const checkMockSession = () => {
    const savedUser = localStorage.getItem("mockUser");
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            initializeSession(user);
        } catch (e) {
            localStorage.removeItem("mockUser");
        }
    } else {
        authContainer.classList.remove("hide");
        appContainer.classList.add("hide");
    }
};

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

// Handle Registration (Sign Up)
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const repeatPassword = document.getElementById("reg-repeat-password").value.trim();

    // Validation
    if (!username || !email || !password) {
        regError.innerText = "All fields are required.";
        return;
    }

    if (password !== repeatPassword) {
        regError.innerText = "Passwords do not match.";
        return;
    }

    if (password.length < 6) {
        regError.innerText = "Password must be at least 6 characters.";
        return;
    }

    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === email || u.username === username);
    if (existingUser) {
        regError.innerText = "User with this email or username already exists.";
        return;
    }

    // Create new user
    const newUser = {
        username,
        email,
        password
    };
    
    mockUsers.push(newUser);
    
    alert("Registration Successful! Please login.");
    registerForm.reset();
    showLoginBtn.click();
});

// Warn user when repeat password doesn't match while typing
let passwordTimeout;
const handlePasswordMatch = () => {
    clearTimeout(passwordTimeout);
    passwordTimeout = setTimeout(() => {
        const password = document.getElementById("reg-password").value.trim();
        const repeatPassword = document.getElementById("reg-repeat-password").value.trim();
        
        regError.innerText = (password && repeatPassword && password !== repeatPassword) ? "Passwords do not match." : "";
    }, 1000);
};

document.getElementById("reg-password").addEventListener("input", handlePasswordMatch);
document.getElementById("reg-repeat-password").addEventListener("input", handlePasswordMatch);

// Handle Login (Sign In)
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const emailOrUsername = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!emailOrUsername || !password) {
        loginError.innerText = "Please enter both email/username and password.";
        return;
    }

    // Find user by email or username
    const user = mockUsers.find(u => 
        (u.email === emailOrUsername || u.username === emailOrUsername) && 
        u.password === password
    );

    if (user) {
        // Create a safe user object (without password)
        const safeUser = {
            email: user.email,
            username: user.username,
            user_metadata: {
                username: user.username
            }
        };
        
        // Save session
        localStorage.setItem("mockUser", JSON.stringify(safeUser));
        initializeSession(safeUser);
    } else {
        loginError.innerText = "Invalid email/username or password";
    }
});

// Handle Logout
logoutBtn.addEventListener("click", async () => {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("mockUser");
        location.reload();
    }
});

function initializeSession(user) {
    authContainer.classList.add("hide");
    appContainer.classList.remove("hide");
    userGreeting.innerText = user.user_metadata?.username || user.username || user.email.split('@')[0];
    
    if (!isChatInitialized) {
        initChatApp();
        isChatInitialized = true;
    }
}

// Check for existing session on page load
checkMockSession();

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
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const YOUTUBE_API_KEY = CONFIG.YOUTUBE_API_KEY;

    // Scroll to bottom function
    const scrollToBottom = () => {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
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
        
        scrollToBottom();
    };

    const createMessageElement = (content, ...classes) => {
        const div = document.createElement("div");
        div.classList.add("message", ...classes);
        div.innerHTML = content;
        return div;
    };

    const showTypingEffect = (text, textElement, incomingMessageDiv, onComplete) => {
        const words = text.split(' ');
        let currentWordIndex = 0;
        
        const typingInterval = setInterval(() => {
            textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
            
            scrollToBottom();

            if (currentWordIndex === words.length) {
                clearInterval(typingInterval);
                isResponseGenerating = false;
                incomingMessageDiv.querySelector(".icon").classList.remove("hide");
                localStorage.setItem("saved-chats", chatContainer.innerHTML); 
                if (onComplete) onComplete();
            }
        }, 75);
    };

    // --- YOUTUBE RECOMMENDATION LOGIC ---
    const fetchYouTubeVideos = async (query) => {
        if (!query || query.length < 3) return;
        
        const skipWords = ["hi", "hello", "hey", "greetings", "thanks", "thank you"];
        if (skipWords.includes(query.toLowerCase().trim())) return;

        try {
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=2&q=${encodeURIComponent(query + " health condition")}&type=video&key=${YOUTUBE_API_KEY}`;
            
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                let videoHtml = `<div class="video-label">Recommended Videos:</div><div class="video-list">`;
                
                data.items.forEach(item => {
                    const title = item.snippet.title;
                    const thumb = item.snippet.thumbnails.medium.url;
                    const videoId = item.id.videoId;
                    
                    videoHtml += `<a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="video-card">
                                    <img src="${thumb}" alt="${title}">
                                    <div class="video-info"><p>${title}</p></div>
                                  </a>`;
                });
                videoHtml += `</div>`;

                const videoDiv = createMessageElement(videoHtml, "incoming", "video-message");
                chatContainer.appendChild(videoDiv);
                scrollToBottom();
                localStorage.setItem("saved-chats", chatContainer.innerHTML);
            }
        } catch (error) {
            console.error("Error fetching YouTube videos:", error);
        }
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
                body: JSON.stringify({ 
                    system_instruction: {
                        parts: [{ text: "You are Health Assist. Provide concise, crisp, and to-the-point medical information. Avoid long paragraphs. Use bullet points where possible. Do not be verbose." }]
                    },
                    contents: historyForAPI 
                }),
            });

            if (response.status === 429) throw new Error("⏳ Too fast! Wait 30s.");

            const data = await response.json();
            if (!response.ok) throw new Error(data.error.message || "Error!");

            const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
            
            chatHistory.push({ role: "user", parts: [{ text: userMessage || "[Image]" }] });
            chatHistory.push({ role: "model", parts: [{ text: apiResponse }] });

            selectedImage = null;
            fileInput.value = "";
            
            showTypingEffect(apiResponse, textElement, incomingMessageDiv, () => {
                fetchYouTubeVideos(userMessage);
            }); 
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
        
        scrollToBottom();
        
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
        
        scrollToBottom();
        
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

// Add CSS for loading animation if not present
const style = document.createElement('style');
style.textContent = `
    .loading-indicator {
        display: flex;
        gap: 5px;
        padding: 10px 0;
    }
    .loading-bar {
        width: 8px;
        height: 8px;
        background: var(--primary-accent);
        border-radius: 50%;
        animation: bounce 1.5s infinite;
    }
    .loading-bar:nth-child(2) { animation-delay: 0.2s; }
    .loading-bar:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-10px); }
    }
    .message.outgoing .text-wrapper {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
    }
    .attachment-thumb {
        max-width: 200px;
        max-height: 200px;
        border-radius: 8px;
    }
`;
document.head.appendChild(style);
