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
      throw new Error("Could not parse request: " + e.message);
    }

    const { research, tier, surface, lighting } = body;
    if (!research) throw new Error("No research data provided");

    const r = (tier === "thennow" || tier === "memorial") ? research.date1 : research;
    const surfaceStr = surface || "pale grey marble surface";
    const lightingStr = lighting || "warm golden hour light from the upper left";

    let prompt;

    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum-quality photograph of two authentic physical copies of ${r.newspaper} arranged as a Then and Now keepsake on a ${surfaceStr} with ${lightingStr}. The THEN newspaper (${r.date}) lies at the top showing masthead "${r.newspaper}", date "${r.date}", and headline "${r.banner_headline}". The NOW newspaper (${r2.date}) lies beneath showing masthead "${r2.newspaper || r.newspaper}", date "${r2.date}", and headline "${r2.banner_headline}". Brass carriage clock in background. Authentic aged newsprint. All text perfectly readable. 8K museum quality.`;

    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum-quality photograph of two authentic physical copies of ${r.newspaper} as a memorial keepsake on a ${surfaceStr} with ${lightingStr}. Single white lily beside the papers. BIRTH newspaper (${r.date}) showing masthead "${r.newspaper}" and headline "${r.banner_headline}". PASSING newspaper (${r2.date}) showing masthead "${r2.newspaper || r.newspaper}" and headline "${r2.banner_headline}". Tender dignified mood. Authentic newsprint. All text readable. 8K museum quality.`;

    } else {
      prompt = `Ultra-photorealistic museum-quality photograph of an authentic ${r.newspaper} newspaper front page lying flat on a ${surfaceStr} with ${lightingStr}.

MASTHEAD: "${r.newspaper}" in Gothic serif typeface at the very top, deep black ink, centered.
DATE LINE directly below masthead: "${r.date}" — clearly legible in small type.
BANNER HEADLINE in enormous bold serif: "${r.banner_headline}"
DECK HEADLINE below that: "${r.deck_headline}"
PHOTOGRAPH: Wide crowd scene celebrating at night, stadium lights, black and white press photography.
SECONDARY STORIES in columns below.
BODY TEXT in dense serif columns.
Authentic aged newsprint, fold crease, sharp focus on headline and date. 8K museum quality.`;
    }

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
        quality: "high",
      }),
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0]) throw new Error("No image returned");

    // Handle both base64 and URL responses
    let imageUrl;
    if (data.data[0].b64_json) {
      imageUrl = "data:image/png;base64," + data.data[0].b64_json;
    } else if (data.data[0].url) {
      imageUrl = data.data[0].url;
    } else {
      throw new Error("No image data in response");
    }

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
