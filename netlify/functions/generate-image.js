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
      throw new Error("Could not parse request body: " + e.message);
    }

    const { research, tier, surface, lighting } = body;
    if (!research) throw new Error("No research data provided");

    // Build a simple focused prompt from research
    const r = tier === "thennow" || tier === "memorial" ? research.date1 : research;

    const newspaper = r.newspaper || "newspaper";
    const date = r.date || "";
    const headline = r.banner_headline || "";
    const deck = r.deck_headline || "";
    const photo = r.dominant_photograph || "editorial press photograph";
    const mastheadStyle = (r.masthead && r.masthead.logotype_style) || "classic bold serif";
    const mastheadColor = (r.masthead && r.masthead.masthead_color) || "deep black";
    const surfaceStr = surface || "pale grey marble surface";
    const lightingStr = lighting || "warm golden hour light from the upper left";

    let prompt;

    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic photograph of two authentic newspaper front pages stacked as a "Then & Now" keepsake on a ${surfaceStr} with ${lightingStr}.

TOP NEWSPAPER dated ${r.date}: Masthead clearly reads "${r.newspaper}". Headline: "${r.banner_headline || ""}". Photo: ${r.dominant_photograph || "period photograph"}.

BOTTOM NEWSPAPER dated ${r2.date || ""}: Masthead clearly reads "${r2.newspaper || newspaper}". Headline: "${r2.banner_headline || ""}". Photo: ${r2.dominant_photograph || "period photograph"}.

Both papers show authentic newsprint texture. Brass clock in background. 8K museum quality photography.`;

    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic photograph of two authentic newspaper front pages as a memorial keepsake on a ${surfaceStr} with ${lightingStr}. White lily beside the papers.

BIRTH NEWSPAPER dated ${r.date}: Masthead reads "${r.newspaper}". Headline: "${r.banner_headline || ""}".

PASSING NEWSPAPER dated ${r2.date || ""}: Masthead reads "${r2.newspaper || newspaper}". Headline: "${r2.banner_headline || ""}".

Contemplative dignified mood. 8K museum quality photography.`;

    } else {
      prompt = `Ultra-photorealistic museum photograph of the ${newspaper} newspaper dated ${date} lying on a ${surfaceStr} with ${lightingStr}.

The masthead at the top reads exactly "${newspaper}" in ${mastheadStyle} typeface in ${mastheadColor}.
Below the masthead the date reads "${date}".
The enormous banner headline reads: "${headline}"
Below that the deck headline reads: "${deck}"
Main photograph shows: ${photo}
Authentic broadsheet newsprint texture, fold crease across lower third, 8K museum quality.`;
    }

    // Call OpenAI
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
        quality: "high",
      }),
    });

    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch(e) {
      throw new Error("OpenAI returned invalid response: " + responseText.slice(0, 200));
    }

    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0]) throw new Error("No image in response");

    const b64 = data.data[0].b64_json;
    if (!b64) throw new Error("No base64 image data");

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "image/png",
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
