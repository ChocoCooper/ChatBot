// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceToggle = document.getElementById('voice-toggle');
const voiceBtn = document.getElementById('voice-btn');
const ttsBtn = document.getElementById('tts-btn');
const apiKeyBtn = document.getElementById('api-key-btn');
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');
const closeModal = document.querySelector('.close-modal');
const loadingIndicator = document.getElementById('loading-indicator');
const voiceIndicator = document.getElementById('voice-indicator');
const suggestionChips = document.querySelectorAll('.suggestion-chip');

// App State
let chatHistory = [];
let isListening = false;
let ttsEnabled = true;
let recognition = null;
let geminiApiKey = localStorage.getItem('gemini_api_key');

// Initialize the application
function initializeApp() {
    initializeSpeechRecognition();
    setupEventListeners();
    checkApiKey();
    
    // Focus on input field
    userInput.focus();
    
    // Add welcome message with TTS
    setTimeout(() => {
        if (ttsEnabled) {
            speakText("Hello! I'm HealthAssist, your AI healthcare assistant. How can I help you today?");
        }
    }, 1000);
}

// Check if API key is set
function checkApiKey() {
    if (!geminiApiKey) {
        setTimeout(() => {
            apiKeyModal.classList.add('active');
        }, 500);
    }
}

// Initialize Speech Recognition
function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            voiceToggle.classList.add('listening');
            voiceBtn.classList.add('active');
            voiceIndicator.classList.add('active');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            stopVoiceRecognition();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopVoiceRecognition();
            if (event.error === 'not-allowed') {
                addSystemMessage('Microphone access denied. Please allow microphone permissions to use voice input.');
            }
        };

        recognition.onend = () => {
            stopVoiceRecognition();
        };
    } else {
        voiceToggle.style.display = 'none';
        voiceBtn.style.display = 'none';
        addSystemMessage('Speech recognition is not supported in your browser.');
    }
}

// Setup event listeners
function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    voiceToggle.addEventListener('click', toggleVoiceRecognition);
    voiceBtn.addEventListener('click', toggleVoiceRecognition);
    ttsBtn.addEventListener('click', toggleTTS);
    apiKeyBtn.addEventListener('click', () => apiKeyModal.classList.add('active'));
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    closeModal.addEventListener('click', () => apiKeyModal.classList.remove('active'));
    
    // Close modal when clicking outside
    apiKeyModal.addEventListener('click', (e) => {
        if (e.target === apiKeyModal) {
            apiKeyModal.classList.remove('active');
        }
    });
    
    // Add event listeners to suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', handleSuggestionClick);
    });
}

// Toggle voice recognition
function toggleVoiceRecognition() {
    if (isListening) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

// Start voice recognition
function startVoiceRecognition() {
    if (recognition && !isListening) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    }
}

// Stop voice recognition
function stopVoiceRecognition() {
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
        voiceToggle.classList.remove('listening');
        voiceBtn.classList.remove('active');
        voiceIndicator.classList.remove('active');
    }
}

// Save API key
function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        geminiApiKey = apiKey;
        localStorage.setItem('gemini_api_key', apiKey);
        apiKeyModal.classList.remove('active');
        apiKeyInput.value = '';
        addSystemMessage('API key saved successfully!');
    } else {
        alert('Please enter a valid API key.');
    }
}

// Text-to-Speech function
function speakText(text) {
    if (!ttsEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
}

// Toggle TTS
function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    ttsBtn.classList.toggle('active', ttsEnabled);
    
    if (ttsEnabled) {
        addSystemMessage('Text-to-speech enabled');
    } else {
        addSystemMessage('Text-to-speech disabled');
        window.speechSynthesis.cancel();
    }
}

// Add system message
function addSystemMessage(content) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'message-wrapper system-message';
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble system-message';
    messageBubble.innerHTML = `<p><i>${content}</i></p>`;
    
    messageWrapper.appendChild(messageBubble);
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add message to chat
function addMessage(content, isUser = false) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message-wrapper ${isUser ? 'user-message' : ''}`;
    
    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${isUser ? 'user-message' : 'bot-message'}`;
    
    const messageAvatar = document.createElement('div');
    messageAvatar.className = 'message-avatar';
    
    const avatarIcon = document.createElement('i');
    avatarIcon.className = isUser ? 'fas fa-user' : 'fas fa-robot';
    messageAvatar.appendChild(avatarIcon);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (isUser) {
        messageContent.innerHTML = `<p>${content}</p>`;
    } else {
        messageContent.innerHTML = formatBotResponse(content);
        
        // Add action buttons for bot messages
        if (ttsEnabled) {
            const messageActions = document.createElement('div');
            messageActions.className = 'message-actions';
            messageActions.innerHTML = `
                <button class="action-btn tts-action" onclick="speakText('${content.replace(/'/g, "\\'")}')">
                    <i class="fas fa-volume-up"></i>
                    Listen
                </button>
                <button class="action-btn copy-action" onclick="copyToClipboard('${content.replace(/'/g, "\\'")}')">
                    <i class="fas fa-copy"></i>
                    Copy
                </button>
            `;
            messageContent.appendChild(messageActions);
        }
    }
    
    messageBubble.appendChild(messageAvatar);
    messageBubble.appendChild(messageContent);
    messageWrapper.appendChild(messageBubble);
    
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageWrapper;
}

// Format bot response
function formatBotResponse(text) {
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    
    if (text.includes('1.') || text.includes('-')) {
        formattedText = formattedText
            .replace(/(\d+\.)\s/g, '<br><strong>$1</strong> ')
            .replace(/-\s/g, '<br>• ');
    }
    
    return `<p>${formattedText}</p>`;
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const copyButtons = document.querySelectorAll('.copy-action');
        copyButtons.forEach(btn => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        });
    });
}

// Show/hide loading indicator
function showLoading() {
    loadingIndicator.classList.add('active');
}
function hideLoading() {
    loadingIndicator.classList.remove('active');
}

// Call Gemini API
async function callGeminiAPI(userMessage) {
    if (!geminiApiKey) {
        throw new Error('API key not set. Please set your Gemini API key.');
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    
    const systemPrompt = `You are HealthAssist, a helpful and empathetic AI healthcare assistant. 

IMPORTANT GUIDELINES:
1. Provide accurate, helpful health information while always reminding users to consult with healthcare professionals for medical advice
2. Be concise but thorough in your responses
3. Use simple language and avoid medical jargon when possible
4. If discussing symptoms, always recommend consulting a doctor
5. For emergencies, immediately advise seeking urgent medical care
6. Focus on general wellness, prevention, and health education
7. Never provide diagnoses or specific treatment plans

User's question: ${userMessage}

Please provide a helpful, empathetic response that follows the above guidelines.`;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: systemPrompt
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from API');
    }

    return data.candidates[0].content.parts[0].text;
}

// Send message
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;
    
    addMessage(message, true);
    userInput.value = '';
    showLoading();
    
    try {
        const botResponse = await callGeminiAPI(message);
        addMessage(botResponse, false);
        chatHistory.push({ user: message, bot: botResponse });
        
        if (ttsEnabled) {
            speakText(botResponse);
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('API key not set')) {
            addSystemMessage('Please set your Gemini API key to use the chatbot.');
            apiKeyModal.classList.add('active');
        } else if (error.message.includes('API key')) {
            addSystemMessage('Invalid API key. Please check your Gemini API key.');
            apiKeyModal.classList.add('active');
        } else {
            addSystemMessage('Sorry, I encountered an error. Please try again.');
        }
    } finally {
        hideLoading();
    }
}

// Handle suggestion clicks
function handleSuggestionClick(e) {
    const query = e.target.getAttribute('data-query');
    userInput.value = query;
    sendMessage();
}

// Stop speech recognition when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isListening) {
        stopVoiceRecognition();
    }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
