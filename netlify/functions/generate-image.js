exports.handler = async function(event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not configured" }) };
  }

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: "Inkdate function running", keyPrefix: OPENAI_API_KEY.slice(0, 10) }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No prompt provided" }) };
    }

    // gpt-image-1 has a 32768 character limit but keep it short for reliability
    const trimmedPrompt = prompt.slice(0, 3000);

    const reqBody = {
      model: "gpt-image-1",
      prompt: trimmedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    };

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(reqBody),
    });

    const data = await response.json();

    // Return full error details for debugging
    if (data.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: data.error.message,
          errorCode: data.error.code,
          errorType: data.error.type,
          promptLength: trimmedPrompt.length,
        }),
      };
    }

    if (!data.data || !data.data[0]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No image data returned", rawResponse: JSON.stringify(data).slice(0, 500) }),
      };
    }

    const b64 = data.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${b64}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageUrl, model: "gpt-image-1" }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
