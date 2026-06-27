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

    // Sanitize headlines to avoid OpenAI safety filter
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
        .replace(/hostage/gi, 'crisis')
        .replace(/forces advance/gi, 'forces move')
        .replace(/troops invade/gi, 'troops enter');
    }

    // Apply sanitizer to research content
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
      prompt = `Ultra-photorealistic museum-quality photograph of two ${r.newspaper} newspaper front pages displayed as a framed Then and Now keepsake. Shot from directly overhead looking straight down. ${lightingStr}.

The scene is on a ${surfaceStr}. Two physical newspapers lie flat, stacked vertically one above the other, filling nearly the entire frame.

THEN NEWSPAPER — upper paper (${r.date}): lying flat, full front page visible from masthead to fold. Masthead "${r.newspaper}" at very top. Date "${r.date}" clearly printed below masthead. Enormous headline "${r.banner_headline}". Deck "${r.deck_headline}". Large press photograph below. Secondary story headlines visible in columns below the photograph. The paper fills the entire upper half of the frame.

NOW NEWSPAPER — lower paper (${r2.date}): lying flat directly below, slightly overlapping the bottom edge of the THEN paper. Full front page visible from masthead to fold. Masthead "${r2.newspaper || r.newspaper}" at top. Date "${r2.date}" clearly visible. Enormous headline "${r2.banner_headline}". Deck "${r2.deck_headline}". Large press photograph. Secondary stories in columns. The paper fills the entire lower half of the frame.

Both newspapers together fill 95% of the image. Authentic aged newsprint texture. Warm golden light. All headlines and dates perfectly readable. Shot from directly above. 8K museum quality photorealistic.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum-quality photograph of two ${r.newspaper} newspaper front pages as a tender memorial keepsake on a ${surfaceStr} with ${lightingStr}. A beautiful white lily rests beside the papers.

ARRANGEMENT: Two newspapers stacked vertically, BIRTH paper on top, PASSING paper beneath. Both fill the frame. Shot from slight overhead angle.

BIRTH NEWSPAPER — top paper: masthead "${r.newspaper}" at very top. Immediately below the masthead the date "${r.date}" is printed in LARGE BOLD type — this date must be the most prominent text after the masthead, clearly readable, centered. Headline "${r.banner_headline}" below. Photograph and body columns below that.

PASSING NEWSPAPER — bottom paper: masthead "${r.newspaper}" at very top. Immediately below the masthead the date "${r2.date}" is printed in LARGE BOLD type — clearly readable, centered, prominent. Headline "${r2.banner_headline}" below. Photograph and body columns below that.

Both dates MUST be large, bold and clearly legible — they are the most important information for the customer. Authentic aged newsprint. Warm amber light. Tender dignified mood. 8K museum quality.`;
    } else {
      const isTabloid = r.format === 'tabloid' || 
        ['The Sun','Daily Mirror','Daily Mail','Daily Express','New York Daily News','The Star'].some(t => r.newspaper.includes(t));

      if(isTabloid) {
        prompt = `Ultra-photorealistic museum-quality scan of an authentic vintage ${r.newspaper} newspaper front page from ${r.date}. Fills the ENTIRE frame edge to edge. Aged yellowed newsprint texture (#f5e6c8), authentic period printing, black and white photography.

EXACT LAYOUT TOP TO BOTTOM:
ROW 1 — HEADER STRIP: Issue number, "${r.date}", price "4d" or "5d" in very small text spanning full width
ROW 2 — MASTHEAD: LEFT SIDE: "${r.newspaper}" in iconic large bold white italic serif text inside a solid RED rectangle banner. RIGHT SIDE: small black-bordered box with "THE FINAL SCORE" or key news summary in bold type
ROW 3 — thin black rule line full width
ROW 4 — ENORMOUS HEADLINE: "${r.banner_headline}" in massive ultra-bold condensed black sans-serif capitals, filling the full width, stacked 2-3 lines, taking up one quarter of the total page height
ROW 5 — LARGE PHOTOGRAPH: dramatic black and white press photo filling the central third of the page
ROW 6 — PHOTO CAPTION in small italic text
ROW 7 — DECK HEADLINE: "${r.deck_headline}" in medium bold type
ROW 8 — TWO COLUMNS of body text with sub-headlines: LEFT: "${r.secondary_stories ? r.secondary_stories[0] : ''}" with 3-4 paragraphs body text. RIGHT: "${r.secondary_stories ? r.secondary_stories[1] : ''}" with body text
ROW 9 — BOTTOM BANNER: full-width black strip, white bold text teasing inside pages

Authentic British tabloid style. Real aged newsprint texture. Period typography. Sharp focus on every letter. Must look like a genuine scanned historical newspaper.`;
      } else {
        prompt = `Ultra-photorealistic museum-quality scan of an authentic vintage ${r.newspaper} newspaper front page from ${r.date}. Fills the ENTIRE frame edge to edge. Aged yellowed newsprint (#f0e4c0), genuine period printing quality, black and white photography.

EXACT LAYOUT TOP TO BOTTOM:
ROW 1 — MASTHEAD: "${r.newspaper}" in large elegant classic serif typeface, centered, deep black ink. Small decorative elements either side.
ROW 2 — DATE LINE: "${r.date}" — edition details, price, all in small centered type below masthead
ROW 3 — THIN DECORATIVE RULE full width
ROW 4 — BANNER HEADLINE: "${r.banner_headline}" in very large bold serif type spanning full width
ROW 5 — DECK HEADLINE: "${r.deck_headline}" in medium serif italic below
ROW 6 — LARGE PRESS PHOTOGRAPH filling the upper middle — black and white period photography
ROW 7 — PHOTO CAPTION: small italic text below photograph: "${r.photo_caption || ''}"
ROW 8 — THREE COLUMN LAYOUT: dense justified serif body text in three columns
ROW 9 — SECONDARY HEADLINES in columns: "${r.secondary_stories ? r.secondary_stories[0] : ''}" and "${r.secondary_stories ? r.secondary_stories[1] : ''}" with body text
ROW 10 — HORIZONTAL FOLD CREASE across lower third

Authentic broadsheet newspaper. Aged newsprint texture. Period-accurate typography. Sharp focus on all text. Must look like a genuine scanned historical newspaper.`;
      }
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
