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

    let prompt = "";
    try {
      const parsed = JSON.parse(event.body);
      prompt = parsed.prompt || "";
    } catch(e) {
      throw new Error("Could not parse request: " + e.message);
    }

    if (!prompt) throw new Error("No prompt provided");

    // Keep prompt under 3000 chars
    const p = prompt.slice(0, 3000);

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: p,
        n: 1,
        size: "1024x1024",
        quality: "high",
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      throw new Error("OpenAI returned invalid JSON: " + text.slice(0, 200));
    }

    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0]) throw new Error("No image in response");

    const b64 = data.data[0].b64_json;
    if (!b64) throw new Error("No base64 image data");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageUrl: "data:image/png;base64," + b64 }),
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
