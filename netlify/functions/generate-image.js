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
      throw new Error("Request parse failed");
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
      research.dominant_photograph = san(research.dominant_photograph);
      if (research.secondary_stories) research.secondary_stories = research.secondary_stories.map(san);
    } else if (research && research.date1) {
      if (research.date1) { research.date1.banner_headline = san(research.date1.banner_headline); research.date1.deck_headline = san(research.date1.deck_headline); }
      if (research.date2) { research.date2.banner_headline = san(research.date2.banner_headline); research.date2.deck_headline = san(research.date2.deck_headline); }
    }

    let prompt;
    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum-quality photograph of two ${r.newspaper} newspaper front pages displayed as a framed Then and Now keepsake. Shot from directly overhead. ${lightingStr}. On a ${surfaceStr}. Two newspapers stacked vertically filling the frame. THEN paper (${r.date}): masthead "${r.newspaper}", date "${r.date}", headline "${r.banner_headline}". NOW paper (${r2.date}): masthead "${r2.newspaper || r.newspaper}", date "${r2.date}", headline "${r2.banner_headline}". Authentic aged newsprint. 8K quality.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum-quality photograph of two ${r.newspaper} newspaper front pages as a memorial keepsake on a ${surfaceStr}. A white lily rests beside. BIRTH paper: masthead "${r.newspaper}", date "${r.date}" in large bold type, headline "${r.banner_headline}". PASSING paper: masthead "${r.newspaper}", date "${r2.date}" in large bold type, headline "${r2.banner_headline}". Authentic aged newsprint. Warm amber light. 8K quality.`;
    } else {
      const isTabloid = r.format === 'tabloid' ||
        ['The Sun','Daily Mirror','Daily Mail','Daily Express','New York Daily News','The Star'].some(t => r.newspaper && r.newspaper.includes(t));

      if (isTabloid) {
        prompt = `Ultra-photorealistic scan of authentic vintage ${r.newspaper} tabloid newspaper front page from ${r.date}. Red banner masthead with white text. Enormous bold headline: "${r.banner_headline}". Large black and white photograph. Deck: "${r.deck_headline}". Secondary stories: "${r.secondary_stories ? r.secondary_stories[0] : ''}" and "${r.secondary_stories ? r.secondary_stories[1] : ''}". Aged newsprint texture. Period typography. Sharp focus.`;
      } else {
        prompt = `Ultra-photorealistic scan of authentic vintage ${r.newspaper} broadsheet newspaper front page from ${r.date}. Classic serif masthead. Date "${r.date}" clearly visible. Banner headline: "${r.banner_headline}". Deck: "${r.deck_headline}". Large press photograph. Secondary stories: "${r.secondary_stories ? r.secondary_stories[0] : ''}" and "${r.secondary_stories ? r.secondary_stories[1] : ''}". Aged yellowed newsprint. Period typography. Sharp focus.`;
      }
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
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
      throw new Error("No image returned");
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
