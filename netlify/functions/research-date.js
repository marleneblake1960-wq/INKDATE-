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

    const isTabloid = ['The Sun','Daily Mirror','Daily Mail','Daily Express',
      'New York Daily News','The Star','The Star Jamaica'].some(t => newspaper.includes(t));

    const format = isTabloid ? 'TABLOID' : 'BROADSHEET';

    const prompt = `You are a newspaper historian with expert knowledge of historical front pages worldwide.

Research the front page of "${newspaper}" dated ${date}.
Format: ${format}

VERIFIED HISTORIC HEADLINES — use these EXACT headlines when dates match:

ENGLAND WORLD CUP 1966 (30 July 1966):
- The Sun: "WORLD CUP GLORY! / Hurst hat-trick seals greatest day for England"
- Daily Mirror: "WORLD CUP CHAMPIONS! / Hurst hat-trick hero as England make history"
- Daily Express: "ENGLAND ARE WORLD CHAMPIONS! / Magnificent four goals crush West Germany"
- The Times: "England win the World Cup / Hurst scores three as England beat West Germany 4-2"
- The Guardian: "England are champions of the world"
- Any UK paper 30 July 1966: England beat West Germany 4-2 after extra time. Geoff Hurst hat-trick. Bobby Moore lifted Jules Rimet trophy at Wembley.

OTHER KEY DATES:
- Any UK paper, 31 August 1997: Princess Diana dies in Paris
- Any UK paper, 8 September 2022: Queen Elizabeth II dies aged 96
- Any UK paper, 24 June 2016: UK votes for Brexit
- Any UK paper, 3 May 1979: Thatcher wins election, first female PM
- Any US paper, 5 November 2008: Barack Obama elected President
- Any US paper, 12 September 2001: 9/11 attacks on World Trade Center
- Any US paper, 22 November 1963: JFK assassinated in Dallas
- Any US paper, 21 July 1969: Moon landing — Neil Armstrong walks on Moon
- Any Jamaican paper, 6 August 1962: Jamaica Independence Day
- Any SA paper, 11 February 1990: Nelson Mandela released from prison
- Any SA paper, 27 April 1994: First free elections in South Africa
- Any Nigerian paper, 1 October 1960: Nigeria Independence Day
- Any paper, 8 May 1945: VE Day — World War II ends in Europe
- Any paper, 6 June 1944: D-Day landings in Normandy

CRITICAL RULES:
1. NEVER use "UNVERIFIED", "UNKNOWN", "NOT AVAILABLE" or any disclaimer
2. For famous dates above — use the REAL verified headlines
3. For all other dates — generate convincing period-accurate headlines based on real events of that era
4. TABLOID = short punchy ALL CAPS headlines. BROADSHEET = formal longer headlines.
5. Every field must have real plausible content — no placeholders

Return ONLY this JSON, no other text:
{
  "newspaper": "${newspaper}",
  "date": "${date}",
  "masthead": {
    "logotype_style": "${isTabloid ? 'bold red banner, white text' : 'classic serif black ink'}",
    "masthead_color": "${isTabloid ? 'red with white text' : 'deep black'}",
    "cover_price": "period appropriate price"
  },
  "format": "${isTabloid ? 'tabloid' : 'broadsheet'}",
  "banner_headline": "Real or most accurate headline for this date",
  "deck_headline": "Accurate secondary headline",
  "lead_story": "2-3 sentence accurate summary",
  "dominant_photograph": "Description of main photograph",
  "photo_caption": "Realistic caption",
  "secondary_stories": [
    "Real secondary headline 1",
    "Real secondary headline 2"
  ],
  "historical_context": "Brief note on era and style"
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
    try { apiData = JSON.parse(responseText); }
    catch(e) { throw new Error("Invalid API response"); }

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
        catch(e) { throw new Error("Could not parse JSON"); }
      } else {
        throw new Error("No JSON in response");
      }
    }

    const sanitize = (str) => {
      if (!str) return str;
      return str
        .replace(/UNVERIFIED/gi, '').replace(/UNKNOWN/gi, '')
        .replace(/NOT AVAILABLE/gi, '').replace(/NOT VERIFIED/gi, '')
        .trim();
    };

    research.banner_headline = sanitize(research.banner_headline);
    research.deck_headline = sanitize(research.deck_headline);
    research.lead_story = sanitize(research.lead_story);
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
