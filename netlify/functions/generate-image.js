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
    if (!research) throw new Error("No research data");

    const r = (tier === "thennow" || tier === "memorial") ? (research.date1 || research) : research;
    const paper = (r.newspaper || "newspaper").substring(0, 30);
    const date = (r.date || "").substring(0, 20);
    const headline = (r.banner_headline || "").substring(0, 80);
    const deck = (r.deck_headline || "").substring(0, 60);

    const isTabloid = ['The Sun','Daily Mirror','Daily Mail','Daily Express','New York Daily News','The Star']
      .some(t => paper.includes(t));

    let prompt;
    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic vintage newspaper keepsake. Two ${paper} front pages stacked vertically in a wooden frame. TOP newspaper dated ${date} with headline "${headline}". BOTTOM newspaper dated ${r2.date||''} with headline "${(r2.banner_headline||'').substring(0,80)}". Both show full mastheads, headlines, photographs and columns. Aged yellowed newsprint texture. Period typography. Sharp focus.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Ultra-photorealistic memorial newspaper keepsake with white lily. Two ${paper} front pages. TOP dated ${date} headline "${headline}". BOTTOM dated ${r2.date||''} headline "${(r2.banner_headline||'').substring(0,80)}". Full mastheads visible. Aged newsprint. Warm amber light. Sharp focus.`;
    } else if (isTabloid) {
      prompt = `Ultra-photorealistic vintage ${paper} tabloid newspaper front page dated ${date}. Full page fills entire frame top to bottom. RED banner masthead with "${paper}" in large white italic text at top. Date "${date}" below masthead. HUGE bold black headline "${headline}" in massive capitals. Large black and white press photograph. Deck headline "${deck}". Body text columns. Aged yellowed newsprint. Sharp focus throughout.`;
    } else {
      prompt = `Ultra-photorealistic vintage ${paper} broadsheet newspaper front page dated ${date}. Full page fills entire frame top to bottom. Classic serif masthead "${paper}" at top. Date "${date}" clearly shown. Large bold headline "${headline}". Deck "${deck}". Black and white press photograph. Body text in columns. Aged yellowed newsprint texture. Sharp focus throughout.`;
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: "chatgpt-image-latest",
        prompt,
        n: 1,
        size: "1024x1536",
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.data || !data.data[0] || !data.data[0].b64_json) throw new Error("No image returned");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ imageUrl: "data:image/png;base64," + data.data[0].b64_json }),
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

