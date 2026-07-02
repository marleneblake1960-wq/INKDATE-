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
      prompt = `Photorealistic ${r.newspaper} newspaper front pages as a Then and Now keepsake. THEN: dated ${r.date}, headline "${r.banner_headline}". NOW: dated ${r2.date||''}, headline "${(r2.banner_headline||'').substring(0,80)}". Aged newsprint. Period typography.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Photorealistic ${r.newspaper} newspaper front pages memorial keepsake with white lily. BIRTH: dated ${r.date}, headline "${r.banner_headline}". PASSING: dated ${r2.date||''}, headline "${(r2.banner_headline||'').substring(0,80)}". Warm light. Aged newsprint.`;
    } else {
      prompt = `Photorealistic front page of ${r.newspaper} newspaper dated ${r.date}. Headline: "${r.banner_headline}". Subheadline: "${r.deck_headline}". Large press photograph, body text in columns, masthead at top. Aged newsprint. Flat unfolded page.`;
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
