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
    return { statusCode: 200, headers, body: JSON.stringify({ status: "research-date ok" }) };
  }

  // Step 1 - log raw body
  const rawBody = event.body || "";
  
  // Step 2 - parse body safely
  let newspaper = "";
  let date = "";
  try {
    const parsed = JSON.parse(rawBody);
    newspaper = parsed.newspaper || "";
    date = parsed.date || "";
  } catch(e) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: "JSON parse failed: " + e.message, rawBody: rawBody.slice(0, 200) }) 
    };
  }

  if (!newspaper || !date) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: "Missing newspaper or date", newspaper, date }) 
    };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "No Anthropic API key" }) };
  }

  try {
    const prompt = `You are a newspaper historian. Return ONLY a JSON object, no other text.

What was on the front page of the ${newspaper} on ${date}?

Return exactly this JSON structure filled with real facts:
{"newspaper":"${newspaper}","date":"${date}","masthead":{"logotype_style":"classic bold serif","masthead_color":"deep black","cover_price":"25 cents"},"banner_headline":"REAL HEADLINE HERE","deck_headline":"real deck headline here","lead_story":"summary of lead story","dominant_photograph":"description of main photograph","photo_caption":"caption text","secondary_stories":["second story headline","third story headline"],"historical_context":"period printing style description"}`;

    const apiBody = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: apiBody,
    });

    const responseText = await res.text();
    
    let apiData;
    try {
      apiData = JSON.parse(responseText);
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Anthropic returned invalid JSON", raw: responseText.slice(0, 300) }) };
    }

    if (apiData.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: apiData.error.message, type: apiData.error.type }) };
    }

    const content = apiData.content && apiData.content[0] && apiData.content[0].text;
    if (!content) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "No content in response", apiData: JSON.stringify(apiData).slice(0, 300) }) };
    }

    let research;
    try {
      research = JSON.parse(content.replace(/```json|```/g, "").trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { research = JSON.parse(match[0]); }
        catch(e) { return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not parse research JSON", content: content.slice(0, 300) }) }; }
      } else {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "No JSON found in response", content: content.slice(0, 300) }) };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ research }) };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Unknown error" }) };
  }
};
