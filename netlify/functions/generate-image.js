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
    const { research, tier } = body;
    if (!research) throw new Error("No research data");

    const r = (tier === "thennow" || tier === "memorial") ? (research.date1 || research) : research;
    const headline = (r.banner_headline || "").substring(0, 80);
    const deck = (r.deck_headline || "").substring(0, 60);
    const paper = (r.newspaper || "newspaper").substring(0, 30);
    const date = (r.date || "").substring(0, 20);

    const isTabloid = ['The Sun','Daily Mirror','Daily Mail','Daily Express','New York Daily News','The Star']
      .some(t => paper.includes(t));

    let prompt;
    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `Two vintage newspaper front pages framed. Top: ${paper} ${date} "${headline}". Bottom: ${r2.newspaper || paper} ${r2.date || ""} "${(r2.banner_headline||"").substring(0,60)}". Photorealistic aged newsprint.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `Two vintage ${paper} newspapers memorial keepsake white lily. Birth ${date} "${headline}". Passing ${r2.date||""} "${(r2.banner_headline||"").substring(0,60)}". Photorealistic.`;
    } else if (isTabloid) {
      prompt = `Vintage ${paper} tabloid ${date}. Red masthead. Headline "${headline}". Black white photo. Aged newsprint. Photorealistic.`;
    } else {
      prompt = `Vintage ${paper} broadsheet ${date}. Serif masthead. Headline "${headline}". Press photo. Aged newsprint. Photorealistic.`;
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
        size: "1024x1024",
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
