from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyAHuzmpxhxnNeuWV-Y_buBIlLhQcDtMnXY')

try:
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Set up the model configuration
    generation_config = {
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 1024,
    }

    safety_settings = [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
    ]

    model = genai.GenerativeModel(
        model_name="gemini-pro",
        generation_config=generation_config,
        safety_settings=safety_settings
    )
    
    logging.info("Gemini AI model configured successfully")
    
except Exception as e:
    logging.error(f"Error configuring Gemini AI: {str(e)}")
    model = None

# System prompt for healthcare context
HEALTHCARE_SYSTEM_PROMPT = """You are HealthAssist, a helpful and empathetic AI healthcare assistant. 

IMPORTANT GUIDELINES:
1. Provide accurate, helpful health information while always reminding users to consult with healthcare professionals for medical advice
2. Be concise but thorough in your responses
3. Use simple language and avoid medical jargon when possible
4. If discussing symptoms, always recommend consulting a doctor
5. For emergencies, immediately advise seeking urgent medical care
6. Focus on general wellness, prevention, and health education
7. Never provide diagnoses or specific treatment plans

Current conversation context: {context}

User's question: {user_message}

Please provide a helpful, empathetic response that follows the above guidelines."""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        if not model:
            return jsonify({
                'success': False,
                'message': 'AI service is currently unavailable. Please try again later.'
            })

        user_message = request.json.get('message', '').strip()
        
        if not user_message:
            return jsonify({
                'success': False,
                'message': 'Please enter a message.'
            })

        # Get conversation history from request
        conversation_history = request.json.get('history', [])
        
        # Build context from conversation history
        context = "\n".join([
            f"User: {msg['user']}\nAssistant: {msg['bot']}" 
            for msg in conversation_history[-5:]  # Last 5 exchanges for context
        ]) if conversation_history else "No previous conversation."
        
        # Create the prompt with context
        prompt = HEALTHCARE_SYSTEM_PROMPT.format(
            context=context,
            user_message=user_message
        )

        # Generate response
        response = model.generate_content(prompt)
        
        if not response or not response.text:
            return jsonify({
                'success': False,
                'message': 'Sorry, I encountered an error generating a response. Please try again.'
            })

        bot_response = response.text.strip()

        return jsonify({
            'success': True,
            'message': bot_response
        })

    except Exception as e:
        logging.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Sorry, I encountered an error. Please try again.'
        })

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'model_configured': model is not None})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
