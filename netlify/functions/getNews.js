exports.handler = async function(event, context) {
  // This grabs the hidden key from your Netlify settings
  const apiKey = process.env.GNEWS_API_KEY; 
  
  // Grab the search query passed from the frontend, default to 'general health' if none provided
  const query = event.queryStringParameters.q || 'general health';
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=9&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify(data) // Sends the news data back to your frontend
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed fetching data' })
    };
  }
};
