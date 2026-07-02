exports.handler = async function(event, context) {
  // Only allow requests from our own domain
  const origin = event.headers.origin || event.headers.referer || '';
  const allowed = origin.includes('inkdateapp.com') || origin.includes('localhost');
  
  if (!allowed) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Forbidden" }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://inkdateapp.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      key: process.env.OPENAI_API_KEY 
    }),
  };
};
