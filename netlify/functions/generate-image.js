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

    const { research, tier, surface, lighting } = JSON.parse(event.body || "{}");
    if (!research) throw new Error("No research data provided");

    // Build rich verified prompt from research
    let prompt;

    if (tier === "memorial") {
      const r1 = research.date1;
      const r2 = research.date2;
      prompt = `Ultra-photorealistic museum-quality photograph of two authentic physical copies of ${r1.newspaper} as a tender memorial keepsake.

ARRANGEMENT: BIRTH newspaper (${r1.date}) at top, slightly angled. PASSING newspaper (${r2.date}) beneath and forward. Both on a ${surface}. ${lighting}. Single white lily at edge, gently out of focus.

BIRTH NEWSPAPER — ${r1.date}:
Masthead reads exactly "${r1.newspaper}" in ${r1.masthead.logotype_style}, ${r1.masthead.masthead_color}. Cover price ${r1.masthead.cover_price}.
Banner headline reads exactly: "${r1.banner_headline}"
Deck headline: "${r1.deck_headline}"
Main photograph: ${r1.dominant_photograph}
Caption: "${r1.photo_caption}"

PASSING NEWSPAPER — ${r2.date}:
Masthead reads exactly "${r2.newspaper}" in ${r2.masthead.logotype_style}, ${r2.masthead.masthead_color}.
Banner headline reads exactly: "${r2.banner_headline}"
Deck headline: "${r2.deck_headline}"
Main photograph: ${r2.dominant_photograph}

STYLE: Medium-format camera. Both mastheads tack sharp. Warm soft focus at edges. Intimate golden light. No digital elements. 8K. Museum quality.`;

    } else if (tier === "thennow") {
      const r1 = research.date1;
      const r2 = research.date2;
      prompt = `Ultra-photorealistic museum-quality photograph of two authentic physical copies of ${r1.newspaper} as a "Then & Now" premium keepsake.

ARRANGEMENT: THEN newspaper (${r1.date}) at top, slightly angled, upper half readable. NOW newspaper (${r2.date}) beneath and forward. Both on a ${surface}. ${lighting}. Brass carriage clock softly out of focus at upper edge.

THEN NEWSPAPER — ${r1.date}:
Masthead reads exactly "${r1.newspaper}" in ${r1.masthead.logotype_style}, ${r1.masthead.masthead_color}. Cover price ${r1.masthead.cover_price}.
Banner headline reads exactly: "${r1.banner_headline}"
Deck headline: "${r1.deck_headline}"
Main photograph: ${r1.dominant_photograph}

NOW NEWSPAPER — ${r2.date}:
Masthead reads exactly "${r2.newspaper}" in ${r2.masthead.logotype_style}, ${r2.masthead.masthead_color}.
Banner headline reads exactly: "${r2.banner_headline}"
Deck headline: "${r2.deck_headline}"
Main photograph: ${r2.dominant_photograph}

STYLE: Medium-format. Both mastheads and headlines tack sharp. Gentle bokeh at edges. No digital elements. 8K. Museum quality.`;

    } else {
      // Premium single
      const r = research;
      prompt = `Ultra-photorealistic museum-quality photograph of an authentic physical copy of ${r.newspaper} dated ${r.date}. Flat on a ${surface}. ${lighting}.

MASTHEAD: The masthead reads exactly "${r.newspaper}" in ${r.masthead.logotype_style} typeface, rendered in ${r.masthead.masthead_color}. Cover price shown: ${r.masthead.cover_price}. Date "${r.date}" printed clearly below the masthead. Thin decorative rule below.

BANNER HEADLINE: Enormous bold serif type spanning the full page width reading exactly: "${r.banner_headline}"

DECK HEADLINE: Secondary headline in 38pt type reading: "${r.deck_headline}"

LEAD STORY: ${r.lead_story}

DOMINANT PHOTOGRAPH: ${r.dominant_photograph}. Caption reads: "${r.photo_caption}"

SECONDARY STORIES: ${r.secondary_stories ? r.secondary_stories.join(" | ") : ""}

PHYSICAL DETAILS: ${r.historical_context}. Centre fold crease across lower third. Adjacent copies beneath, edges only. Newsprint fibres visible at macro level.

PHOTOGRAPHIC STYLE: Medium-format camera. Tack sharp on masthead and banner headline. Gentle focus fall-off at edges. No digital borders, no mockups. 8K. Museum quality. Cinematic realism. The masthead MUST read "${r.newspaper}" exactly.`;
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt.slice(0, 32000),
        n: 1,
        size: "1024x1024",
        quality: "high",
      }),
    });

    const text = await res.text();
    const data = JSON.parse(text);

    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0]) throw new Error("No image returned");

    const b64 = data.data[0].b64_json;
    if (!b64) throw new Error("No image data");

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
