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

    const prompt = `You are a newspaper archive expert with deep knowledge of historical front pages.

Research the front page of "${newspaper}" dated ${date}.

Return ONLY a valid JSON object with no other text, no markdown, no backticks:

{"newspaper":"${newspaper}","date":"${date}","masthead":{"logotype_style":"classic bold serif","masthead_color":"deep black","cover_price":""},"banner_headline":"","deck_headline":"","lead_story":"","dominant_photograph":"","photo_caption":"","secondary_stories":["",""],"historical_context":""}

Fill in all fields with accurate historical information for that exact date. The banner_headline must be the real headline that appeared on the front page. Be precise and factual.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      throw new Error("Invalid response from Anthropic API");
    }

    if (data.error) throw new Error(data.error.message);

    const content = data.content && data.content[0] && data.content[0].text;
    if (!content) throw new Error("No content returned");

    // Parse JSON from response
    let research;
    try {
      research = JSON.parse(content.replace(/```json|```/g, "").trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
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
