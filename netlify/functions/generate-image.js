exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OPENAI_KEY = process.env.OPENAI_KEY;
  
  if (!OPENAI_KEY) {
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'API key not configured' }) 
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { prompt } = body;
    
    if (!prompt) {
      return { 
        statusCode: 400, 
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No prompt provided' }) 
      };
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1792',
        quality: 'hd',
        style: 'natural'
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return { 
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.error?.message || 'OpenAI error: ' + response.status }) 
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ url: data.data[0].url })
    };

  } catch (err) {
    return { 
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }) 
    };
  }
};
