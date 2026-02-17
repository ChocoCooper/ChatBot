const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const voiceInputButton = document.querySelector("#voice-input-button");

// NEW: Image Upload Elements
const fileInput = document.querySelector("#file-input");
const imageUploadButton = document.querySelector("#image-upload-button");
const imagePreviewContainer = document.querySelector("#image-preview-container");
const imagePreview = document.querySelector("#image-preview");
const removeImageButton = document.querySelector("#remove-image-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let isListening = false;
let recognition = null;
let chatHistory = [];
// NEW: Store selected image
let selectedImage = null; // Stores { mime_type, data }

// API configuration
const API_KEY = CONFIG.API_KEY; // <-- PASTE YOUR API KEY HERE
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${API_KEY}`;

// --- NEW: IMAGE HANDLING FUNCTIONS ---

// 1. Trigger file input when button is clicked
imageUploadButton.addEventListener("click", () => fileInput.click());

// 2. Handle file selection
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    // Remove the "data:image/jpeg;base64," part
    const base64String = e.target.result.split(",")[1];
    
    selectedImage = {
      inline_data: {
        mime_type: file.type,
        data: base64String
      }
    };

    // Show preview
    imagePreview.src = e.target.result;
    imagePreviewContainer.classList.remove("hide");
    typingForm.querySelector(".typing-input").focus();
  };
  reader.readAsDataURL(file);
});

// 3. Remove selected image
removeImageButton.addEventListener("click", () => {
  selectedImage = null;
  fileInput.value = "";
  imagePreviewContainer.classList.add("hide");
});

// --- EXISTING LOGIC ---

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

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    
    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("saved-chats", chatContainer.innerHTML); 
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight); 
  }, 75);
}

// --- UPDATED API FUNCTION ---
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text"); 

  // 1. Construct the current user turn (Text + Optional Image)
  const userRequestParts = [{ text: userMessage }];
  if (selectedImage) {
    userRequestParts.push(selectedImage);
  }

  // 2. Combine history with current turn
  // Note: We use chatHistory for context, but we add the NEW message with image manually
  const historyForAPI = [
    ...chatHistory.slice(-10), 
    { role: "user", parts: userRequestParts }
  ];

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: historyForAPI 
      }),
    });

    if (response.status === 429) {
       throw new Error("⏳ Too fast! Please wait 30 seconds (Free Tier Limit).");
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message || "Something went wrong!");

    const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // 3. Update History
    // IMPORTANT: We only save the TEXT to chatHistory to avoid hitting token limits
    // with repeated base64 image strings in future requests.
    chatHistory.push({ role: "user", parts: [{ text: userMessage || "[Image Sent]" }] });
    chatHistory.push({ role: "model", parts: [{ text: apiResponse }] });

    // Clean up UI state
    selectedImage = null;
    imagePreviewContainer.classList.add("hide");
    fileInput.value = "";

    showTypingEffect(apiResponse, textElement, incomingMessageDiv); 
  } catch (error) { 
    isResponseGenerating = false;
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
}

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

const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;
  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; 
  setTimeout(() => copyButton.innerText = "content_copy", 1000); 
}

// --- UPDATED OUTGOING CHAT ---
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  
  // Allow sending if there is text OR an image
  if((!userMessage && !selectedImage) || isResponseGenerating) return; 

  isResponseGenerating = true;

  // Build the HTML for the user's message
  let messageHtml = '';
  
  if (selectedImage) {
      // If image exists, show thumbnail + text
      messageHtml = `<div class="message-content">
                      <img class="avatar" src="user-avatar.png" alt="User avatar">
                      <div class="text-wrapper">
                        <img src="${imagePreview.src}" class="attachment-thumb">
                        <p class="text"></p>
                      </div>
                    </div>`;
  } else {
      // Text only
      messageHtml = `<div class="message-content">
                      <img class="avatar" src="user-avatar.png" alt="User avatar">
                      <p class="text"></p>
                    </div>`;
  }

  const outgoingMessageDiv = createMessageElement(messageHtml, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatContainer.appendChild(outgoingMessageDiv);
  
  typingForm.reset(); 
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); 
  setTimeout(showLoadingAnimation, 500); 
}

toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all the chats?")) {
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
