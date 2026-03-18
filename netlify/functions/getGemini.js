exports.handler = async function(event, context) {
  // Only allow POST requests for this endpoint
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  // Grab the hidden key from your Netlify settings
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: event.body // Pass the stringified JSON payload directly from the frontend
    });
    
    const data = await response.json();
    return {
      statusCode: response.status,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed fetching Gemini response' })
    };
  }
};
