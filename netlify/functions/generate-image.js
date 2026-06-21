exports.handler = async function(event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not configured" }) };
  }

  try {
    const { prompt, tier } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "No prompt provided" }) };
    }

    // Try gpt-image-1 first, fall back to dall-e-2
    const size = tier === "thennow" ? "1536x1024" : "1024x1536";

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: size,
        quality: "high",
      }),
    });

    const data = await response.json();

    // If gpt-image-1 fails, try dall-e-2
    if (data.error) {
      const response2 = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-2",
          prompt: prompt.slice(0, 1000),
          n: 1,
          size: "1024x1024",
        }),
      });
      const data2 = await response2.json();
      if (data2.error) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: data2.error.message }) };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ imageUrl: data2.data[0].url, model: "dall-e-2" }),
      };
    }

    // gpt-image-1 returns base64
    const imageData = data.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${imageData}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageUrl, model: "gpt-image-1" }),
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Server error" }) };
  }
};
