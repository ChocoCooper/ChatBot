/* =========================================
   CHATBOT SESSION LOGIC
   ========================================= */
const userGreeting = document.getElementById("user-greeting");
let currentUserId = null;
let currentUsername = null;

async function initSession() {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = "login.html"; return; }

    currentUserId = session.user.id;
    const { data: profile } = await sb.from('profiles').select('username').eq('id', currentUserId).single();
    currentUsername = profile?.username || 'User';
    if (userGreeting) userGreeting.innerText = currentUsername;
    initChatApp();
}

window.addEventListener("DOMContentLoaded", initSession);


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
    const sendMessageButton = document.querySelector("#send-message-button");

    let userMessage = null;
    let isResponseGenerating = false;
    let abortController = null;
    let typingIntervalId = null;
    let isListening = false;
    let recognition = null;
    let chatHistory = [];
    let selectedImage = null;

    const API_URL = `/.netlify/functions/getGemini`;
    const YOUTUBE_API_URL = `/.netlify/functions/getYoutube`;

    const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

    // --- IMAGE HANDLING ---
    imageUploadButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImage = { inline_data: { mime_type: file.type, data: e.target.result.split(",")[1] } };
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove("hide");
            typingForm.querySelector(".typing-input").focus();
        };
        reader.readAsDataURL(file);
    });
    removeImageButton.addEventListener("click", () => {
        selectedImage = null; fileInput.value = "";
        imagePreviewContainer.classList.add("hide");
    });

    // --- SPEECH RECOGNITION ---
    const initSpeechRecognition = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';
            recognition.onstart = () => { isListening = true; voiceInputButton.style.color = '#ef4444'; };
            recognition.onresult = (event) => {
                typingForm.querySelector('.typing-input').value = event.results[0][0].transcript;
            };
            recognition.onend = () => { isListening = false; voiceInputButton.style.color = ''; };
        } else { voiceInputButton.style.display = 'none'; }
    };
    const toggleVoiceRecognition = () => { if (!recognition) return; isListening ? recognition.stop() : recognition.start(); };

    // --- APP STATE & CLOUD SYNC ---
    const loadAppInitialState = async () => {
        // Theme
        const isLightMode = localStorage.getItem("themeColor") === "light_mode";
        document.body.classList.toggle("light_mode", isLightMode);
        toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

        // Cloud Chat Sync
        if (!currentUserId) {
            if (window.hidePreloader) window.hidePreloader();
            return;
        }
        const sb = getSupabase();
        try {
            const { data: chats, error } = await sb
                .from('chat_history')
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: true });
                
            if (error) throw error;
            
            chatContainer.innerHTML = '';
            chatHistory = [];

            if (chats && chats.length > 0) {
                document.body.classList.add("hide-header");
                chats.forEach(chat => {
                    // Update context history
                    chatHistory.push({ role: "user", parts: [{ text: chat.question }] });
                    chatHistory.push({ role: "model", parts: [{ text: chat.answer }] });

                    // Render Outgoing
                    let userHtml = `<div class="message-content"><p class="text">${chat.question.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>`;
                    const outgoingDiv = createMessageElement(userHtml, "outgoing");
                    chatContainer.appendChild(outgoingDiv);

                    // Render Incoming
                    let processedAnswer = chat.answer.replace(/\[CHECK\]/g, `<span class="material-symbols-rounded" style="color: var(--secondary-accent); vertical-align: -6px;">check_circle</span>`)
                                         .replace(/\[WARNING\]/g, `<span class="material-symbols-rounded" style="color: #ef4444; vertical-align: -6px;">warning</span>`)
                                         .replace(/\n/g, "<br>");
                    
                    const aiHtml = `<div class="message-content">
                                        <img class="avatar" src="gemini-avatar.png" alt="AI">
                                        <p class="text">${processedAnswer}</p>
                                    </div>
                                    <div class="action-icons" style="display:flex; gap:8px; margin-top:8px; margin-left: 54px;">
                                        <span onClick="copyMessage(this)" class="material-symbols-rounded" style="cursor:pointer; font-size: 1.1rem; color: var(--placeholder-color); transition:0.2s;" onmouseover="this.style.color='var(--primary-accent)'" onmouseout="this.style.color='var(--placeholder-color)'" title="Copy Text">content_copy</span>
                                        <span onClick="speakMessage(this)" class="material-symbols-rounded speak-btn" style="cursor:pointer; font-size: 1.1rem; color: var(--placeholder-color); transition:0.2s;" onmouseover="this.style.color='var(--primary-accent)'" onmouseout="this.style.color='var(--placeholder-color)'" title="Read Aloud">volume_up</span>
                                    </div>`;
                    const incomingDiv = createMessageElement(aiHtml, "incoming");
                    chatContainer.appendChild(incomingDiv);

                    // Restore YouTube recommendations for historical messages
                    if (chat.question && chat.question !== '[Image]') {
                        fetchYouTubeVideos(chat.question).then(videos => {
                            const vc = renderVideoRecommendations(videos);
                            if (vc) { incomingDiv.appendChild(vc); scrollToBottom(); }
                        });
                    }
                });
                scrollToBottom();
            }
            if (window.hidePreloader) window.hidePreloader();
        } catch (e) {
            console.error("Failed to load chat history:", e);
            if (window.hidePreloader) window.hidePreloader();
        }
    };

    const createMessageElement = (content, ...classes) => {
        const div = document.createElement("div");
        div.classList.add("message", ...classes);
        div.innerHTML = content;
        return div;
    };

    const showTypingEffect = (text, textElement, incomingMessageDiv) => {
        let processedText = text.replace(/\[CHECK\]/g, "___CHECK___").replace(/\[WARNING\]/g, "___WARNING___");
        const words = processedText.split(/(___CHECK___|___WARNING___|\s+)/).filter(w => w && w.length > 0);
        let currentWordIndex = 0;
        typingIntervalId = setInterval(() => {
            if (currentWordIndex >= words.length) {
                clearInterval(typingIntervalId);
                isResponseGenerating = false;
                sendMessageButton.innerText = "send";
                const actions = incomingMessageDiv.querySelector(".action-icons");
                if (actions) actions.classList.remove("hide");
                return;
            }
            let word = words[currentWordIndex++];
            if (word === "___CHECK___") {
                textElement.innerHTML += `<span class="material-symbols-rounded" style="color: var(--secondary-accent); vertical-align: -6px;">check_circle</span>`;
            } else if (word === "___WARNING___") {
                textElement.innerHTML += `<span class="material-symbols-rounded" style="color: #ef4444; vertical-align: -6px;">warning</span>`;
            } else {
                textElement.innerHTML += word.replace(/\n/g, "<br>");
            }
            scrollToBottom();
        }, 25);
    };

    // --- YOUTUBE ---
    const fetchYouTubeVideos = async (query) => {
        if (!query) return [];
        const skipPatterns = /^(hi|hello|hey|greetings|good\s(morning|afternoon|evening)|thanks|thank\syou|ok|okay|bye|goodbye|who\sare\syou|what\sis\syour\sname)(\s(there|bot|healthassist))?[\.!]?$/i;
        if (skipPatterns.test(query.trim())) return [];
        
        const normalizedQuery = query.trim().toLowerCase();
        const cacheKey = `yt_cache_${normalizedQuery}`;
        const sb = getSupabase();

        // 1. Check Supabase Cloud Cache
        try {
            const { data: cacheRow, error } = await sb.from('youtube_cache')
                .select('data')
                .eq('query', normalizedQuery)
                .maybeSingle();
            
            if (cacheRow && cacheRow.data) {
                try { localStorage.setItem(cacheKey, JSON.stringify(cacheRow.data)); } catch(e) {}
                return cacheRow.data;
            }
        } catch (e) {
            console.warn("Supabase cache read failed:", e);
        }

        // 2. Check Local Storage Fallback
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) { try { return JSON.parse(cachedData); } catch(e) {} }
        
        // 3. Fetch from YouTube API
        try {
            const response = await fetch(`${YOUTUBE_API_URL}?q=${encodeURIComponent(query + " doctor medical health explanation")}`);
            const data = await response.json();
            const videos = data.items || [];
            
            if (videos.length > 0) {
                try { localStorage.setItem(cacheKey, JSON.stringify(videos)); } catch(e) {}
                // Save to Supabase Cache
                try {
                    await sb.from('youtube_cache').upsert(
                        { query: normalizedQuery, data: videos },
                        { onConflict: 'query' }
                    );
                } catch(e) { console.warn("Supabase cache write failed:", e); }
            }
            return videos;
        } catch { return []; }
    };

    const renderVideoRecommendations = (videos) => {
        if (!videos || videos.length === 0) return null;
        const container = document.createElement("div");
        container.className = "video-recommendation-container";
        container.innerHTML = `<p class="video-label">Recommended Videos:</p><div class="video-scroller"></div>`;
        const scroller = container.querySelector(".video-scroller");
        videos.forEach(video => {
            const card = document.createElement("a");
            card.className = "video-card";
            card.href = `https://www.youtube.com/watch?v=${video.id.videoId}`;
            card.target = "_blank";
            card.innerHTML = `<img src="${video.snippet.thumbnails.medium.url}" class="video-thumb" alt="${video.snippet.title}"><div class="video-info"><h4 class="video-title">${video.snippet.title}</h4><p class="video-channel">${video.snippet.channelTitle}</p></div>`;
            scroller.appendChild(card);
        });
        return container;
    };

    // --- SAVE TO SUPABASE ---
    const saveChatToSupabase = async (question, answer) => {
        if (!currentUserId) return;
        const sb = getSupabase();
        try {
            await sb.from('chat_history').insert({
                user_id: currentUserId,
                question: question || '[Image]',
                answer: answer,
                created_at: new Date().toISOString()
            });

            // Update health status based on response
            await updateHealthStatus(sb, question, answer);
        } catch(e) { console.warn('Could not save chat:', e); }
    };

    const updateHealthStatus = async (sb, question, answer) => {
        const text = (question + ' ' + answer).toLowerCase();
        let status = null;
        const alertKeywords = ['severe', 'emergency', 'critical', 'cancer', 'tumor', 'stroke', 'heart attack', 'seizure', 'chest pain'];
        const cautionKeywords = ['diabetes', 'hypertension', 'high blood pressure', 'chronic', 'asthma', 'thyroid', 'anxiety', 'depression'];
        const goodKeywords = ['healthy', 'normal', 'fitness', 'exercise', 'nutrition', 'vitamins', 'wellness'];

        if (alertKeywords.some(k => text.includes(k))) {
            status = { label: 'Needs Attention', class: 'alert-status', summary: 'Urgent health topics detected in your recent conversations. Please consult a doctor.' };
        } else if (cautionKeywords.some(k => text.includes(k))) {
            status = { label: 'Monitoring Required', class: 'caution', summary: 'Chronic condition topics detected. Regular monitoring recommended.' };
        } else if (goodKeywords.some(k => text.includes(k))) {
            status = { label: 'Looking Good', class: 'good', summary: 'Your queries suggest a focus on wellness and preventive health.' };
        }

        if (status) {
            await sb.from('profiles').update({ health_status: status }).eq('id', currentUserId);
        }
    };

    // --- API INTERACTION ---
    const normalizeForCache = (text) => {
        return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\b(hi|hello|hey|greetings|please|help|tell|me|about|i|have|am|im|a|an|the|is|are|was|were|of|in|on|at|to|for|with|my|suffering|from)\b/g, '').replace(/\s+/g, ' ').trim();
    };

    const generateAPIResponse = async (incomingMessageDiv) => {
        const textElement = incomingMessageDiv.querySelector(".text");
        let cacheKey = null;
        if (!selectedImage && userMessage) {
            const normalized = normalizeForCache(userMessage);
            if (normalized) {
                cacheKey = `gemini_msg_${normalized}`;
                const cachedResponse = localStorage.getItem(cacheKey);
                if (cachedResponse) {
                    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
                    chatHistory.push({ role: "model", parts: [{ text: cachedResponse }] });
                    showTypingEffect(cachedResponse, textElement, incomingMessageDiv);
                    incomingMessageDiv.classList.remove("loading");
                    await saveChatToSupabase(userMessage, cachedResponse);
                    if (userMessage) {
                        fetchYouTubeVideos(userMessage).then(videos => {
                            const vc = renderVideoRecommendations(videos);
                            if (vc) { incomingMessageDiv.appendChild(vc); scrollToBottom(); }
                        });
                    }
                    return;
                }
            }
        }

        const userRequestParts = [{ text: userMessage }];
        if (selectedImage) userRequestParts.push(selectedImage);
        const historyForAPI = [...chatHistory.slice(-10), { role: "user", parts: userRequestParts }];
        abortController = new AbortController();

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abortController.signal,
                body: JSON.stringify({
                    contents: historyForAPI,
                    system_instruction: {
                        parts: [{ text: `You are a clinical, highly concise Health Assist AI. Follow these strict rules for every response:
1. Be extremely crisp and direct. NO long introductory or concluding conversational filler.
2. Keep your total response under 4 to 5 short sentences whenever possible.
3. Use bullet points if listing symptoms, causes, or treatments.
4. Use [CHECK] for proven remedies/medicines and [WARNING] for precautions/warnings.
5. Be conversational (e.g., ask "How do you feel?") and only ask a follow-up question at the end if necessary.` }]
                    }
                }),
            });

            if (response.status === 429) throw new Error("⏳ Too fast! Wait 30s.");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error.message || "Error!");

            let apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*/g, '');
            if (cacheKey) localStorage.setItem(cacheKey, apiResponse);

            chatHistory.push({ role: "user", parts: [{ text: userMessage || "[Image]" }] });
            chatHistory.push({ role: "model", parts: [{ text: apiResponse }] });

            // Save to Supabase
            await saveChatToSupabase(userMessage, apiResponse);

            selectedImage = null; fileInput.value = "";
            showTypingEffect(apiResponse, textElement, incomingMessageDiv);

            if (userMessage) {
                fetchYouTubeVideos(userMessage).then(videos => {
                    const vc = renderVideoRecommendations(videos);
                    if (vc) { incomingMessageDiv.appendChild(vc); scrollToBottom(); }
                });
            }
        } catch (error) {
            if (error.name === 'AbortError') { incomingMessageDiv.remove(); return; }
            isResponseGenerating = false;
            sendMessageButton.innerText = "send";
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
                      <div class="action-icons hide" style="display:flex; gap:8px; margin-top:8px; margin-left: 54px;">
                          <span onClick="copyMessage(this)" class="material-symbols-rounded" style="cursor:pointer; font-size: 1.1rem; color: var(--placeholder-color); transition:0.2s;" onmouseover="this.style.color='var(--primary-accent)'" onmouseout="this.style.color='var(--placeholder-color)'" title="Copy Text">content_copy</span>
                          <span onClick="speakMessage(this)" class="material-symbols-rounded speak-btn" style="cursor:pointer; font-size: 1.1rem; color: var(--placeholder-color); transition:0.2s;" onmouseover="this.style.color='var(--primary-accent)'" onmouseout="this.style.color='var(--placeholder-color)'" title="Read Aloud">volume_up</span>
                      </div>`;
        const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
        chatContainer.appendChild(incomingMessageDiv);
        scrollToBottom();
        generateAPIResponse(incomingMessageDiv);
    };

    window.copyMessage = (copyButton) => {
        const messageText = copyButton.closest(".message").querySelector(".text").innerText;
        navigator.clipboard.writeText(messageText);
        copyButton.innerText = "done";
        setTimeout(() => copyButton.innerText = "content_copy", 1000);
    };

    window.speakMessage = (btn) => {
        const messageText = btn.closest(".message").querySelector(".text").innerText;
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            if (btn.innerText === "volume_off") {
                btn.innerText = "volume_up";
                return;
            }
        }
        document.querySelectorAll('.speak-btn').forEach(b => b.innerText = 'volume_up');
        
        const utterance = new SpeechSynthesisUtterance(messageText);
        utterance.onend = () => { btn.innerText = "volume_up"; };
        btn.innerText = "volume_off";
        window.speechSynthesis.speak(utterance);
    };

    const handleOutgoingChat = () => {
        if (isResponseGenerating) {
            if (abortController) abortController.abort();
            if (typingIntervalId) clearInterval(typingIntervalId);
            isResponseGenerating = false;
            sendMessageButton.innerText = "send";
            return;
        }
        userMessage = typingForm.querySelector(".typing-input").value.trim();
        if (!userMessage && !selectedImage) return;
        isResponseGenerating = true;
        sendMessageButton.innerText = "stop_circle";

        let messageHtml = '';
        if (selectedImage) {
            messageHtml = `<div class="message-content"><div class="text-wrapper"><img src="${imagePreview.src}" class="attachment-thumb"><p class="text"${!userMessage ? ' style="display:none"' : ''}></p></div></div>`;
        } else {
            messageHtml = `<div class="message-content"><p class="text"></p></div>`;
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

    deleteChatButton.addEventListener("click", async () => {
        if (confirm("Delete all chat history from your account?")) {
            localStorage.removeItem("saved-chats");
            chatHistory = [];
            
            if (currentUserId) {
                const sb = getSupabase();
                await sb.from('chat_history').delete().eq('user_id', currentUserId);
                await sb.from('profiles').update({ health_status: null }).eq('id', currentUserId);
            }
            
            chatContainer.innerHTML = '';
            document.body.classList.remove("hide-header");
        }
    });

    suggestions.forEach(suggestion => {
        suggestion.addEventListener("click", () => {
            userMessage = suggestion.querySelector(".text").innerText;
            handleOutgoingChat();
        });
    });

    typingForm.addEventListener("submit", (e) => { e.preventDefault(); handleOutgoingChat(); });
    voiceInputButton.addEventListener("click", toggleVoiceRecognition);
    initSpeechRecognition();
    loadAppInitialState();
}
