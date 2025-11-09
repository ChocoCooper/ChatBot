// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceToggle = document.getElementById('voice-toggle');
const voiceBtn = document.getElementById('voice-btn');
const ttsBtn = document.getElementById('tts-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const voiceIndicator = document.getElementById('voice-indicator');
const suggestionChips = document.querySelectorAll('.suggestion-chip');

// App State
let chatHistory = [];
let isListening = false;
let ttsEnabled = true;
let recognition = null;

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

// Text-to-Speech function
function speakText(text) {
    if (!ttsEnabled) return;
    
    // Create a new SpeechSynthesisUtterance instance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    // Speak the text
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

// Function to add a message to the chat
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
        
        // Add TTS button for bot messages
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
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageWrapper;
}

// Function to format bot responses with better styling
function formatBotResponse(text) {
    // Simple formatting for lists and important information
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
        .replace(/\n/g, '<br>'); // Line breaks
    
    // Check if the text contains numbered points
    if (text.includes('1.') || text.includes('-')) {
        // Simple list detection and formatting
        formattedText = formattedText
            .replace(/(\d+\.)\s/g, '<br><strong>$1</strong> ')
            .replace(/-\s/g, '<br>• ');
    }
    
    return `<p>${formattedText}</p>`;
}

// Copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary feedback
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

// Function to show loading indicator
function showLoading() {
    loadingIndicator.classList.add('active');
}

// Function to hide loading indicator
function hideLoading() {
    loadingIndicator.classList.remove('active');
}

// Function to send message to backend
async function sendMessageToBackend(message) {
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory
            })
        });

        const data = await response.json();

        if (data.success) {
            return data.message;
        } else {
            throw new Error(data.message || 'Failed to get response from server');
        }
    } catch (error) {
        console.error('Error sending message to backend:', error);
        throw error;
    }
}

// Function to handle sending a message
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;
    
    // Add user message to chat
    addMessage(message, true);
    
    // Clear input
    userInput.value = '';
    
    // Show loading indicator
    showLoading();
    
    try {
        // Get bot response from backend
        const botResponse = await sendMessageToBackend(message);
        
        // Add bot response to chat
        addMessage(botResponse, false);
        
        // Update chat history
        chatHistory.push({ user: message, bot: botResponse });
        
        // Speak the response if TTS is enabled
        if (ttsEnabled) {
            speakText(botResponse);
        }
        
    } catch (error) {
        addSystemMessage('Sorry, I encountered an error. Please try again.');
        console.error('Error in sendMessage:', error);
    } finally {
        hideLoading();
    }
}

// Function to handle suggestion chip clicks
function handleSuggestionClick(e) {
    const query = e.target.getAttribute('data-query');
    userInput.value = query;
    sendMessage();
}

// Function to initialize the chat interface
function initializeChat() {
    // Initialize speech recognition
    initializeSpeechRecognition();
    
    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    voiceToggle.addEventListener('click', () => {
        if (isListening) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    });
    
    voiceBtn.addEventListener('click', () => {
        if (isListening) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    });
    
    ttsBtn.addEventListener('click', toggleTTS);
    
    // Add event listeners to suggestion chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', handleSuggestionClick);
    });
    
    // Focus on input field
    userInput.focus();
    
    // Add welcome message with TTS
    setTimeout(() => {
        if (ttsEnabled) {
            speakText("Hello! I'm HealthAssist, your AI healthcare assistant. How can I help you today?");
        }
    }, 1000);
}

// Initialize the chat when the page loads
document.addEventListener('DOMContentLoaded', initializeChat);

// Stop speech recognition when the page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isListening) {
        stopVoiceRecognition();
    }
});
