
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
    if (!research) throw new Error("No research data provided");

    const r = (tier === "thennow" || tier === "memorial") ? (research.date1 || research) : research;
    const surfaceStr = surface || "pale grey marble surface";
    const lightingStr = lighting || "warm golden hour light from the upper left";

    const newspaper = r.newspaper || "newspaper";
    const date = r.date || "";
    const headline = r.banner_headline || "";
    const deck = r.deck_headline || "";
    const photo = r.dominant_photograph || "editorial press photograph";
    const mastheadStyle = (r.masthead && r.masthead.logotype_style) || "classic bold serif";
    const mastheadColor = (r.masthead && r.masthead.masthead_color) || "deep black";

    let prompt;

    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum-quality photograph of two authentic physical copies of ${newspaper} arranged as a "Then & Now" keepsake on a ${surfaceStr} with ${lightingStr}.

THEN NEWSPAPER — ${r.date}:
Masthead reads exactly "${newspaper}" in ${mastheadStyle}, ${mastheadColor}.
Banner headline reads exactly: "${r.banner_headline}"
Deck headline: "${r.deck_headline}"

NOW NEWSPAPER — ${r2.date || ""}:
Masthead reads exactly "${r2.newspaper || newspaper}".
Banner headline reads exactly: "${r2.banner_headline || ""}"
Deck headline: "${r2.deck_headline || ""}"

STYLE: Medium-format camera. Both mastheads tack sharp. Warm soft focus at edges. Brass carriage clock in background. No digital elements. 8K. Museum quality.`;

    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic museum-quality photograph of two authentic physical copies of ${newspaper} as a tender memorial keepsake on a ${surfaceStr} with ${lightingStr}. Single white lily at edge.

BIRTH NEWSPAPER — ${r.date}:
Masthead reads exactly "${newspaper}" in ${mastheadStyle}, ${mastheadColor}.
Banner headline reads exactly: "${r.banner_headline}"

PASSING NEWSPAPER — ${r2.date || ""}:
Masthead reads exactly "${r2.newspaper || newspaper}".
Banner headline reads exactly: "${r2.banner_headline || ""}"

STYLE: Medium-format camera. Both mastheads tack sharp. Intimate golden light. No digital elements. 8K. Museum quality.`;

    } else {
      prompt = `Ultra-photorealistic museum-quality photograph of an authentic physical copy of ${newspaper} dated ${date}. Flat on a ${surfaceStr}. ${lightingStr}.

MASTHEAD: At the very top of the page the masthead reads exactly "${newspaper}" in large classic Gothic serif typeface, deep black ink, centered. On the line immediately below the masthead, clearly printed in small readable type: "${date}" — VOL. I — PRICE 25 CENTS. This date line is CRITICAL and must be fully legible. Two thin horizontal rules, one above and one below this date line, separate the masthead from the headlines below.

BANNER HEADLINE: Enormous bold serif type spanning the full page width, all text within page edges, reads: "${headline}"

DECK HEADLINE: Secondary headline below the banner reads: "${deck}"

PHOTOGRAPH: ${photo}. Black and white, high contrast, authentic wire service press photography.

SECONDARY STORIES: ${r.secondary_stories ? r.secondary_stories.join(" | ") : ""}

BODY TEXT: Dense justified serif copy in multiple columns filling the lower portion of the page.

PHYSICAL DETAILS: Authentic aged newsprint texture throughout. Centre fold crease across lower third. All headlines fully readable, no text cut off at edges. Sharp focus on masthead and headline. 8K resolution. Museum quality. Cinematic realism.`;
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
        size: "1024x1536",
        quality: "medium",
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0] || !data.data[0].b64_json) throw new Error("No image returned");

    const b64 = data.data[0].b64_json;

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
