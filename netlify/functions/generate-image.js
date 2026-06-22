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

    const body = JSON.parse(event.body || "{}");
    const { research, tier, surface, lighting } = body;
    if (!research) throw new Error("No research data");

    const r = (tier === "thennow" || tier === "memorial") ? research.date1 : research;
    const surfaceStr = surface || "pale grey marble surface";
    const lightingStr = lighting || "warm golden hour light";

    let prompt;
    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum photograph of two newspapers stacked as a Then and Now keepsake on ${surfaceStr} with ${lightingStr}. TOP paper dated ${r.date} with masthead "${r.newspaper}" and headline "${r.banner_headline}". BOTTOM paper dated ${r2.date} with masthead "${r2.newspaper || r.newspaper}" and headline "${r2.banner_headline}". Brass clock in background. Authentic newsprint. 8K quality.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum photograph of two newspapers as memorial keepsake on ${surfaceStr} with ${lightingStr}. White lily beside papers. BIRTH paper dated ${r.date} masthead "${r.newspaper}" headline "${r.banner_headline}". PASSING paper dated ${r2.date} masthead "${r2.newspaper || r.newspaper}" headline "${r2.banner_headline}". Tender dignified mood. 8K quality.`;
    } else {
      prompt = `Ultra-photorealistic museum photograph of ${r.newspaper} newspaper dated ${r.date} on ${surfaceStr} with ${lightingStr}. Masthead reads "${r.newspaper}". Banner headline reads "${r.banner_headline}". Deck headline "${r.deck_headline}". Main photo shows ${r.dominant_photograph}. Authentic broadsheet newsprint, fold crease, 8K museum quality.`;
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0] || !data.data[0].b64_json) throw new Error("No image returned");

    const b64 = data.data[0].b64_json;

    // Return as binary PNG — browser loads it directly as an image src
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
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
