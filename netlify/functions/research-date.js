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

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API key not configured");

    const { newspaper, date } = JSON.parse(event.body || "{}");
    if (!newspaper || !date) throw new Error("Newspaper and date are required");

    const prompt = `You are a newspaper archive researcher. Research the front page of ${newspaper} dated ${date}.

Search the web and find the EXACT details. Return ONLY a JSON object with these fields:

{
  "newspaper": "${newspaper}",
  "date": "${date}",
  "masthead": {
    "logotype_style": "describe the exact font style of the masthead",
    "masthead_color": "color of masthead text",
    "cover_price": "price shown on the paper"
  },
  "banner_headline": "the exact main headline as it appeared",
  "deck_headline": "the secondary headline below the main one",
  "lead_story": "2-3 sentence summary of the lead story",
  "dominant_photograph": "detailed description of the main front page photograph",
  "photo_caption": "the caption under the main photograph",
  "secondary_stories": [
    "headline of second story",
    "headline of third story"
  ],
  "weather": "weather in the city that day if known",
  "historical_context": "brief note on the printing era and paper style"
}

Be precise. Use real verified facts only. Return ONLY the JSON, no other text.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    // Extract text from response
    const text = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    // Parse JSON from response
    let research;
    try {
      research = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        research = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse research results");
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ research }),
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
