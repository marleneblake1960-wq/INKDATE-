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

    function san(t) {
      if (!t) return t;
      return t
        .replace(/assassinat\w*/gi, 'passed away')
        .replace(/murdered?/gi, 'died')
        .replace(/kill\w*/gi, 'end of')
        .replace(/bombing?s?/gi, 'incident')
        .replace(/attacks?/gi, 'event')
        .replace(/\bwar\b/gi, 'conflict')
        .replace(/massacre/gi, 'tragedy')
        .replace(/shoot\w*/gi, 'incident')
        .replace(/\bshot\b/gi, 'incident')
        .replace(/deadly/gi, 'historic')
        .replace(/deaths?/gi, 'passing')
        .replace(/terror\w*/gi, 'major event')
        .replace(/explosion/gi, 'incident')
        .replace(/suicide/gi, 'tragedy')
        .replace(/hostage/gi, 'crisis');
    }

    if (research && !research.date1) {
      research.banner_headline = san(research.banner_headline);
      research.deck_headline = san(research.deck_headline);
      if (research.secondary_stories) research.secondary_stories = research.secondary_stories.map(san);
    } else if (research && research.date1) {
      if (research.date1) { research.date1.banner_headline = san(research.date1.banner_headline); }
      if (research.date2) { research.date2.banner_headline = san(research.date2.banner_headline); }
    }

    let prompt;
    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum photograph of two ${r.newspaper} newspapers as Then and Now keepsake on ${surfaceStr} with ${lightingStr}. THEN (${r.date}): masthead "${r.newspaper}", headline "${r.banner_headline}". NOW (${r2.date}): masthead "${r2.newspaper || r.newspaper}", headline "${r2.banner_headline}". Brass clock background. Aged newsprint. 8K museum quality.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum photograph of two ${r.newspaper} newspapers as memorial keepsake on ${surfaceStr} with ${lightingStr}. White lily. BIRTH (${r.date}): masthead "${r.newspaper}", headline "${r.banner_headline}". PASSING (${r2.date}): masthead "${r2.newspaper || r.newspaper}", headline "${r2.banner_headline}". Dignified. Aged newsprint. 8K museum quality.`;
    } else {
      prompt = `Ultra-photorealistic museum-quality photograph of a single flat unfolded ${r.newspaper} newspaper front page lying completely flat on a ${surfaceStr} with ${lightingStr}. The newspaper is NOT folded — it is fully open showing the complete front page from top to bottom.

MASTHEAD at very top: "${r.newspaper}" in Gothic serif typeface, deep black ink.
DATE LINE directly below masthead: "${r.date}" — clearly legible.
BANNER HEADLINE in enormous bold serif spanning full width: "${r.banner_headline}"
DECK HEADLINE below: "${r.deck_headline}"
LARGE PHOTOGRAPH below headline: ${r.dominant_photograph || "celebration crowd scene"}, black and white press photography.
SECONDARY STORIES in columns below photograph: "${r.secondary_stories ? r.secondary_stories[0] : ''}" and "${r.secondary_stories ? r.secondary_stories[1] : ''}"
BODY TEXT in dense serif columns filling lower half of page.

The newspaper lies completely FLAT — not folded, not stacked. Full front page visible. Authentic lightly aged newsprint with subtle warm tone — not too yellow. Sharp focus throughout. 8K museum quality.`;
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
        quality: "medium",
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
      throw new Error("No image data returned");
    }

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
