/* =========================================
   SUPABASE AUTHENTICATION LOGIC
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

let supabase = null;
let isChatInitialized = false;
let supabaseLoading = false;

// Function to initialize Supabase directly (without dynamic loading)
const initSupabase = () => {
    // Check if Supabase is already available globally
    if (window.supabase) {
        try {
            const { createClient } = window.supabase;
            supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            console.log("Supabase initialized successfully");
            checkSession();
            return true;
        } catch (err) {
            console.error("Supabase initialization failed:", err);
            loginError.innerText = "System error. Please refresh the page.";
            return false;
        }
    }
    return false;
};

// Try to initialize Supabase immediately
if (!initSupabase()) {
    // If not available, load it dynamically
    supabaseLoading = true;
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.onload = () => {
        supabaseLoading = false;
        initSupabase();
    };
    script.onerror = () => {
        supabaseLoading = false;
        console.error("Failed to load Supabase script.");
        loginError.innerText = "Connection error. Failed to load system.";
        regError.innerText = "Connection error. Failed to load system.";
    };
    document.head.appendChild(script);
}

const checkSession = async () => {
    if (!supabase) {
        console.log("Supabase not initialized yet");
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data && data.session) {
            initializeSession(data.session.user);
        } else {
            authContainer.classList.remove("hide");
            appContainer.classList.add("hide");
        }
    } catch (error) {
        console.error("Error checking session:", error);
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
    
    if (supabaseLoading) {
        regError.innerText = "System initializing, please wait...";
        return;
    }
    
    if (!supabase) {
        regError.innerText = "System not initialized. Please refresh the page.";
        return;
    }
    
    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const repeatPassword = document.getElementById("reg-repeat-password").value.trim();

    if (password !== repeatPassword) {
        regError.innerText = "Passwords do not match.";
        return;
    }

    if (email && password && username) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { username: username }
                }
            });
            if (error) throw error;
            alert("Registration Successful! Please login.");
            showLoginBtn.click();
        } catch (error) {
            regError.innerText = error.message;
        }
    }
});

// Warn user when repeat password doesn't match while stop typing
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
    
    if (supabaseLoading) {
        loginError.innerText = "System initializing, please wait...";
        return;
    }
    
    if (!supabase) {
        loginError.innerText = "System not initialized. Please refresh the page.";
        return;
    }
    
    const email = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        initializeSession(data.user);
    } catch (error) {
        loginError.innerText = "Invalid email or password";
    }
});

// Handle Logout
logoutBtn.addEventListener("click", async () => {
    if (!supabase) return;
    if(confirm("Are you sure you want to logout?")) {
        await supabase.auth.signOut();
        location.reload(); 
    }
});

function initializeSession(user) {
    authContainer.classList.add("hide");
    appContainer.classList.remove("hide");
    userGreeting.innerText = user.user_metadata?.username || user.email.split('@')[0]; 
    if (!isChatInitialized) {
        initChatApp();
        isChatInitialized = true;
    }
}

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
