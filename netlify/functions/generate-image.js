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
    if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch(e) {
      throw new Error("Request parse failed: " + e.message);
    }

    const { research, tier, surface, lighting } = body;
    if (!research) throw new Error("No research data provided");

    const r = (tier === "thennow" || tier === "memorial") ? research.date1 : research;
    const surfaceStr = surface || "pale grey marble surface";
    const lightingStr = lighting || "warm golden hour light from the upper left";

    let prompt;
    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum photograph of two ${r.newspaper} newspapers as Then and Now keepsake on ${surfaceStr} with ${lightingStr}. THEN (${r.date}): masthead "${r.newspaper}", headline "${r.banner_headline}". NOW (${r2.date}): masthead "${r2.newspaper || r.newspaper}", headline "${r2.banner_headline}". Brass clock background. Aged newsprint. 8K museum quality.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum photograph of two ${r.newspaper} newspapers as memorial keepsake on ${surfaceStr} with ${lightingStr}. White lily. BIRTH (${r.date}): masthead "${r.newspaper}", headline "${r.banner_headline}". PASSING (${r2.date}): masthead "${r2.newspaper || r.newspaper}", headline "${r2.banner_headline}". Dignified. Aged newsprint. 8K museum quality.`;
    } else {
      prompt = `Ultra-photorealistic museum-quality photograph of ${r.newspaper} newspaper dated ${r.date} lying flat on ${surfaceStr} with ${lightingStr}. Masthead reads "${r.newspaper}". Date "${r.date}" clearly printed below masthead. Banner headline "${r.banner_headline}". Deck "${r.deck_headline}". Crowd celebration photo below. Dense body columns. Aged newsprint texture. Fold crease. 8K museum quality.`;
    }

    // Generate with smaller size to keep response under 6MB
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "chatgpt-image-latest",
        prompt: prompt,
        n: 1,
        size: "1024x1536",
        quality: "medium",
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
      throw new Error("No image data returned");
    }

    // Return as data URL — small enough at low quality + compressed
    const imageUrl = "data:image/png;base64," + data.data[0].b64_json;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageUrl }),
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
