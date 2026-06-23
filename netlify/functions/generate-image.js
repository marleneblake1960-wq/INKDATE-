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

    const r = (tier === "thennow" || tier === "memorial") ? research.date1 : research;
    const surfaceStr = surface || "pale grey marble surface";
    const lightingStr = lighting || "warm golden hour light";

    let prompt;
    if (tier === "thennow") {
      const r2 = research.date2 || {};
      prompt = `A museum-quality photorealistic image of two authentic vintage newspaper front pages displayed as a keepsake on a ${surfaceStr} with ${lightingStr}. The first newspaper is dated ${r.date} with the title "${r.newspaper}" in classic serif masthead lettering and the headline "${r.banner_headline}". The second newspaper below is dated ${r2.date} with the title "${r2.newspaper || r.newspaper}" and headline "${r2.banner_headline}". An antique brass clock sits beside the papers. Both newspapers show authentic aged newsprint texture with realistic typography. Fine art photography style. 8K resolution.`;
    } else if (tier === "memorial") {
      const r2 = research.date2 || {};
      prompt = `A museum-quality photorealistic image of two authentic vintage newspaper front pages displayed as a tribute keepsake on a ${surfaceStr} with ${lightingStr}. A single white lily rests elegantly beside the papers. The first newspaper is dated ${r.date} with the title "${r.newspaper}" in classic serif masthead lettering and the headline "${r.banner_headline}". The second newspaper is dated ${r2.date} with the title "${r2.newspaper || r.newspaper}" and headline "${r2.banner_headline}". Both newspapers show authentic aged newsprint texture. Peaceful and dignified composition. Fine art photography. 8K resolution.`;
    } else {
      prompt = `A museum-quality photorealistic image of an authentic vintage newspaper front page lying flat on a ${surfaceStr} with ${lightingStr}. The newspaper title "${r.newspaper}" appears in elegant classic serif masthead lettering at the top. The date "${r.date}" is printed below the masthead. The main headline reads "${r.banner_headline}". Below that a secondary headline reads "${r.deck_headline}". The newspaper shows authentic aged newsprint texture, a centre fold crease, and realistic period typography throughout. Fine art photography style, sharp focus on the masthead and headline, gentle bokeh toward edges. 8K resolution.`;
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

    // Return as binary PNG — browser loads it directly as an image src
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
