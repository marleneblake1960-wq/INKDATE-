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

    // Detect newspaper format for style guidance
    const isTabloid = ['The Sun', 'Daily Mirror', 'Daily Mail', 'Daily Express', 
      'New York Daily News', 'The Star', 'The Star Jamaica'].some(t => newspaper.includes(t));
    const isGerman = ['Frankfurter', 'Die Welt', 'Süddeutsche', 'Der Standard'].some(t => newspaper.includes(t));
    const isFrench = ['Le Monde', 'Le Figaro', 'Libération', 'Le Mauricien'].some(t => newspaper.includes(t));
    const isSpanish = ['El País', 'ABC', 'El Mundo', 'Excélsior', 'El Universal', 'La Nación', 'Clarín'].some(t => newspaper.includes(t));
    const isPortuguese = ['Folha', 'O Globo', 'O Estado', 'Jornal'].some(t => newspaper.includes(t));
    const isJapanese = ['Shimbun'].some(t => newspaper.includes(t));

    const format = isTabloid ? 'TABLOID (compact format, very large bold headlines, sensational style)' : 'BROADSHEET (full size, formal style)';
    const lang = isGerman ? 'German' : isFrench ? 'French' : isSpanish ? 'Spanish' : isPortuguese ? 'Portuguese' : isJapanese ? 'Japanese' : 'English';

    const prompt = `You are a newspaper historian and expert in historical front pages worldwide.

Research the front page of "${newspaper}" dated ${date}.
Format: ${format}
Language: ${lang}

CRITICAL RULES:
1. NEVER use "UNVERIFIED", "UNKNOWN", "NOT AVAILABLE" or any disclaimer text.
2. Use REAL verified historical headlines for this exact date if you know them. 
   IMPORTANT EXAMPLES:
   - The Sun, 30 July 1966 = "WORLD CUP GLORY!" or "ENGLAND WIN!" — England beat West Germany 4-2 in the World Cup Final at Wembley
   - The Sun, 31 July 1966 = reporting on England winning the World Cup final the day before
   - Any UK paper, 31 July 1966 = England won the World Cup 4-2 vs West Germany
   - Any UK paper, 5 November 2008 = Obama elected first Black US President
3. If exact headline unknown, generate convincing period-accurate content based on real events of that date.
4. For TABLOID papers (The Sun, Mirror, etc): use SHORT PUNCHY headlines in ALL CAPS, sensational style.
5. For broadsheet papers: use formal longer headlines.
6. Write in the correct language for this newspaper.

Return ONLY this JSON with no other text:

{
  "newspaper": "${newspaper}",
  "date": "${date}",
  "masthead": {
    "logotype_style": "${isTabloid ? 'bold red banner masthead, white text, tabloid style' : 'classic serif masthead'}",
    "masthead_color": "${isTabloid ? 'red background with white text' : 'deep black'}",
    "cover_price": "appropriate period price in local currency"
  },
  "format": "${isTabloid ? 'tabloid' : 'broadsheet'}",
  "banner_headline": "The REAL headline from this date — SHORT AND PUNCHY for tabloids, formal for broadsheets",
  "deck_headline": "Secondary headline with more detail",
  "lead_story": "2-3 sentence accurate summary of the lead story",
  "dominant_photograph": "Description of the main front page photograph",
  "photo_caption": "Realistic photo caption",
  "secondary_stories": [
    "Real or plausible secondary headline 1",
    "Real or plausible secondary headline 2"
  ],
  "historical_context": "Brief note on the printing era and newspaper style"
}`;

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

    // Sanitize any disclaimer text
    const sanitize = (str) => {
      if (!str) return str;
      return str
        .replace(/UNVERIFIED/gi, '').replace(/UNKNOWN/gi, '')
        .replace(/NOT AVAILABLE/gi, '').replace(/ARCHIVAL VERIFICATION REQUIRED/gi, '')
        .replace(/NOT VERIFIED/gi, '').replace(/specific deck/gi, '')
        .replace(/specific secondary/gi, '').trim();
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
