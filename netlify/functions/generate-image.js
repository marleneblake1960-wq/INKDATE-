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

  // GET request — diagnostic mode, show available models
  if (event.httpMethod === "GET") {
    const modelsRes = await fetch("https://api.openai.com/v1/models", {
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    });
    const modelsData = await modelsRes.json();
    const imageModels = modelsData.data
      ? modelsData.data.filter(m => m.id.includes("dall") || m.id.includes("image")).map(m => m.id)
      : ["error fetching models"];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        diagnostic: true,
        keyPrefix: OPENAI_API_KEY.slice(0, 10),
        imageModels
      }),
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

    const models = [
      { id: "dall-e-3", body: { model: "dall-e-3", prompt: prompt.slice(0, 4000), n: 1, size: "1024x1792", quality: "hd" } },
      { id: "dall-e-2", body: { model: "dall-e-2", prompt: prompt.slice(0, 1000), n: 1, size: "1024x1024" } },
      { id: "gpt-image-1", body: { model: "gpt-image-1", prompt: prompt.slice(0, 4000), n: 1, size: "1024x1024", quality: "high" } },
    ];

    let lastError = "";
    for (const model of models) {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(model.body),
      });
      const data = await res.json();

      if (!data.error) {
        const imageUrl = data.data[0].url ||
          (data.data[0].b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);
        if (imageUrl) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ imageUrl, model: model.id }),
          };
        }
      }
      lastError = data.error ? data.error.message : "No image returned";
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `All models failed. Last error: ${lastError}` }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
