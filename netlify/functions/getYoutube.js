exports.handler = async function(event, context) {
  // Grab the hidden key from your Netlify settings
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  // Extract the search query
  const query = event.queryStringParameters.q || '';
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&type=video&videoDuration=medium&relevanceLanguage=en&regionCode=US&key=${apiKey}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      statusCode: response.status,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed fetching YouTube data' })
    };
  }
};
