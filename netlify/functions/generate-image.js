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
        prompt = `Ultra-photorealistic museum-quality scan of an authentic vintage ${r.newspaper} newspaper front page from ${r.date}. Fills the ENTIRE frame edge to edge. Aged yellowed newsprint texture, authentic period printing, black and white photography.

EXACT LAYOUT TOP TO BOTTOM:
ROW 1 — HEADER STRIP: Issue number, "${r.date}", price "4d" or "5d" in very small text spanning full width
ROW 2 — MASTHEAD: LEFT SIDE: "${r.newspaper}" in iconic large bold white italic serif text inside a solid RED rectangle banner. RIGHT SIDE: small black-bordered box with "THE FINAL SCORE" or key news summary in bold type
ROW 3 — thin black rule line full width
ROW 4 — ENORMOUS HEADLINE: "${r.banner_headline}" in massive ultra-bold condensed black sans-serif capitals, filling the full width, stacked 2-3 lines, taking up one quarter of the total page height
ROW 5 — LARGE PHOTOGRAPH: dramatic black and white press photo filling the central third of the page
ROW 6 — PHOTO CAPTION in small italic text
ROW 7 — DECK HEADLINE: "${r.deck_headline}" in medium bold type
ROW 8 — TWO COLUMNS of body text: LEFT: "${r.secondary_stories ? r.secondary_stories[0] : ''}" RIGHT: "${r.secondary_stories ? r.secondary_stories[1] : ''}"
ROW 9 — BOTTOM BANNER: full-width black strip, white bold text

Authentic British tabloid. Aged newsprint. Period typography. Sharp focus on every letter. Real scanned historical newspaper appearance.`;
      } else {
        prompt = `Ultra-photorealistic museum-quality scan of an authentic vintage ${r.newspaper} newspaper front page from ${r.date}. Fills the ENTIRE frame edge to edge. Aged yellowed newsprint, genuine period printing quality, black and white photography.

EXACT LAYOUT TOP TO BOTTOM:
ROW 1 — MASTHEAD: "${r.newspaper}" in large elegant classic serif typeface, centered, deep black ink
ROW 2 — DATE LINE: "${r.date}" — edition details, price, all in small centered type below masthead
ROW 3 — THIN DECORATIVE RULE full width
ROW 4 — BANNER HEADLINE: "${r.banner_headline}" in very large bold serif type spanning full width
ROW 5 — DECK HEADLINE: "${r.deck_headline}" in medium serif italic below
ROW 6 — LARGE PRESS PHOTOGRAPH filling the upper middle — black and white period photography
ROW 7 — PHOTO CAPTION: small italic text below photograph
ROW 8 — THREE COLUMN LAYOUT: dense justified serif body text
ROW 9 — SECONDARY HEADLINES: "${r.secondary_stories ? r.secondary_stories[0] : ''}" and "${r.secondary_stories ? r.secondary_stories[1] : ''}"
ROW 10 — HORIZONTAL FOLD CREASE across lower third

Authentic broadsheet newspaper. Aged newsprint. Period typography. Sharp focus. Real scanned historical newspaper appearance.`;
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
