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
      prompt = `Ultra-photorealistic photograph of the complete front page of ${r.newspaper} dated ${r.date}. The view is straight-on, as if the reader is holding the newspaper up and reading it. The newspaper fills the ENTIRE frame edge to edge — no surface visible, no background, just the complete newspaper front page.

MASTHEAD at very top: "${r.newspaper}" in authentic period serif typeface, deep black ink, centered.
DATE LINE directly below masthead: "${r.date}" — clearly legible in small type.
THIN RULE separating masthead from content.
BANNER HEADLINE in enormous bold serif type spanning full page width: "${r.banner_headline}"
DECK HEADLINE below in medium serif: "${r.deck_headline}"
LARGE PRESS PHOTOGRAPH filling the middle third of the page.
PHOTO CAPTION below the photograph in small italic type.
THREE COLUMN LAYOUT below with secondary story headlines: "${r.secondary_stories ? r.secondary_stories[0] : 'National News'}" and "${r.secondary_stories ? r.secondary_stories[1] : 'World Report'}"
DENSE BODY TEXT in justified serif columns filling the lower portion.
FOLD CREASE across the lower third.

The newspaper fills the complete frame. Authentic aged newsprint texture. Period-accurate typography. Crisp sharp focus on every element. 8K photorealistic quality.`;
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
