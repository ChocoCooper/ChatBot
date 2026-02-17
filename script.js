const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const voiceInputButton = document.querySelector("#voice-input-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let isListening = false;
let recognition = null;

// NEW: Chat history array to help the bot remember context
let chatHistory = [];

// API configuration
const API_KEY = "YOUR_API_KEY_HERE"; // <-- PASTE YOUR API KEY HERE
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// Check for browser support and initialize speech recognition
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
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const typingInput = document.querySelector('.typing-input');
      typingInput.value = transcript;
      typingInput.focus();
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access to use voice input.');
      }
    };
    
    recognition.onend = () => {
      isListening = false;
      voiceInputButton.classList.remove('listening');
      voiceInputButton.innerHTML = 'mic';
    };
  } else {
    voiceInputButton.style.display = 'none';
    console.warn('Speech recognition not supported in this browser.');
  }
};

// Toggle voice recognition
const toggleVoiceRecognition = () => {
  if (!recognition) {
    alert('Speech recognition is not supported in your browser.');
    return;
  }
  
  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
};

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

  // Apply the stored theme
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  // Restore saved chats or clear the chat container
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); 
}

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    // Append each word to the text element with a space
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    
    // If all words are displayed
    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("saved-chats", chatContainer.innerHTML); // Save chats to local storage
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight); 
  }, 75);
}

// --- NEW: UPDATED API FUNCTION ---
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text"); 

  // Add the user's message to the history temporarily for the API call
  // We limit history to the last 10 messages to avoid hitting token limits too fast
  const historyForAPI = [
    ...chatHistory.slice(-10), 
    { role: "user", parts: [{ text: userMessage }] }
  ];

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: historyForAPI 
      }),
    });

    // Handle 429 Rate Limit specifically
    if (response.status === 429) {
       throw new Error("⏳ Too fast! Please wait 30 seconds (Free Tier Limit).");
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message || "Something went wrong!");

    // Get the API response text
    const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Success! Now update the official history with both user and model messages
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    chatHistory.push({ role: "model", parts: [{ text: apiResponse }] });

    showTypingEffect(apiResponse, textElement, incomingMessageDiv); 
  } catch (error) { 
    isResponseGenerating = false;
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
}

// Show a loading animation while waiting for the API response
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <img class="avatar" src="gemini-avatar.png" alt="Gemini avatar">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded hide">content_copy</span>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); 
  generateAPIResponse(incomingMessageDiv);
}

// Copy message text to the clipboard
const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; 
  setTimeout(() => copyButton.innerText = "content_copy", 1000); 
}

// Handle sending outgoing chat messages
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if(!userMessage || isResponseGenerating) return; 

  isResponseGenerating = true;

  const html = `<div class="message-content">
                  <img class="avatar" src="user-avatar.png" alt="User avatar">
                  <p class="text"></p>
                </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatContainer.appendChild(outgoingMessageDiv);
  
  typingForm.reset(); 
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); 
  setTimeout(showLoadingAnimation, 500); 
}

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when button is clicked
deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all the chats?")) {
    localStorage.removeItem("saved-chats");
    chatHistory = []; // Clear the API memory as well
    loadDataFromLocalstorage();
  }
});

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  handleOutgoingChat();
});

// Add click event for voice input button
voiceInputButton.addEventListener("click", toggleVoiceRecognition);

// Initialize speech recognition and load data
initSpeechRecognition();
loadDataFromLocalstorage();
