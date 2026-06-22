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

  if (event.httpMethod === "GET") {
    return { statusCode: 200, headers, body: JSON.stringify({ status: "ok" }) };
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error("API key not configured");

    const { prompt } = JSON.parse(event.body);
    if (!prompt) throw new Error("No prompt provided");

    // Use low quality and small size to keep response fast and small
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt.slice(0, 2000),
        n: 1,
        size: "1024x1024",
        quality: "low",
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const b64 = data.data[0].b64_json;
    if (!b64) throw new Error("No image returned");

    // Return as image/png directly — bypasses JSON size limit
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "image/png",
        "Content-Transfer-Encoding": "base64",
      },
      body: b64,
      isBase64Encoded: true,
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
