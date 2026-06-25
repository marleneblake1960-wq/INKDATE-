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

    const prompt = `You are a newspaper historian and expert in historical front pages worldwide.

Research the front page of "${newspaper}" dated ${date}.

CRITICAL RULES — you MUST follow these without exception:
1. NEVER use the words "UNVERIFIED", "UNKNOWN", "NOT AVAILABLE", "ARCHIVAL VERIFICATION REQUIRED", or any similar phrase anywhere in your response.
2. If you cannot find the exact verified headline, you MUST generate a convincing, historically accurate and period-appropriate headline based on what you know about that date, that country, and that newspaper's style and era. This is essential.
3. Every field must contain real, plausible, period-accurate content. No field should ever be left as a disclaimer or contain meta-commentary about archives.
4. Write headlines in the style and language of that newspaper's era. For Nigerian papers use formal English. For South African papers use formal English. For Mauritian French papers use French.
5. Base your headlines on real historical events happening in that country and region on or around that date.

Return ONLY this JSON object with no other text:

{
  "newspaper": "${newspaper}",
  "date": "${date}",
  "masthead": {
    "logotype_style": "describe the font style appropriate to the era",
    "masthead_color": "deep black",
    "cover_price": "appropriate period price"
  },
  "banner_headline": "A real or historically plausible bold headline for this date",
  "deck_headline": "A convincing secondary headline providing context",
  "lead_story": "2-3 sentence summary of the lead story, historically plausible for this date and region",
  "dominant_photograph": "Description of what a period-appropriate press photograph would show",
  "photo_caption": "A realistic photo caption",
  "secondary_stories": [
    "Plausible secondary headline 1 for this era and region",
    "Plausible secondary headline 2 for this era and region"
  ],
  "historical_context": "Brief note on the printing era and paper style"
}

Remember: Every headline must be convincing and period-accurate. Never use placeholder or disclaimer text.`;

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

    const responseText = await res.text();
    let apiData;
    try {
      apiData = JSON.parse(responseText);
    } catch(e) {
      throw new Error("Invalid response from Anthropic API");
    }

    if (apiData.error) throw new Error(apiData.error.message);

    const content = apiData.content && apiData.content[0] && apiData.content[0].text;
    if (!content) throw new Error("No content returned");

    // Parse JSON from response
    let research;
    try {
      research = JSON.parse(content.replace(/```json|```/g, "").trim());
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { research = JSON.parse(match[0]); }
        catch(e) { throw new Error("Could not parse research JSON"); }
      } else {
        throw new Error("No JSON found in response");
      }
    }

    // Final safety check — remove any UNVERIFIED text that slipped through
    const sanitize = (str) => {
      if (!str) return str;
      return str
        .replace(/UNVERIFIED/gi, '')
        .replace(/UNKNOWN/gi, '')
        .replace(/NOT AVAILABLE/gi, '')
        .replace(/ARCHIVAL VERIFICATION REQUIRED/gi, '')
        .replace(/NOT VERIFIED/gi, '')
        .replace(/specific deck/gi, '')
        .replace(/specific secondary/gi, '')
        .trim();
    };

    research.banner_headline = sanitize(research.banner_headline);
    research.deck_headline = sanitize(research.deck_headline);
    research.lead_story = sanitize(research.lead_story);
    research.dominant_photograph = sanitize(research.dominant_photograph);
    research.photo_caption = sanitize(research.photo_caption);
    if (research.secondary_stories) {
      research.secondary_stories = research.secondary_stories.map(sanitize);
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
