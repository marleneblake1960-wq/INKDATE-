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
    const isGerman = ['Frankfurter','Die Welt','Süddeutsche','Der Standard'].some(t => newspaper.includes(t));
    const isFrench = ['Le Monde','Le Figaro','Libération','Le Mauricien'].some(t => newspaper.includes(t));
    const isSpanish = ['El País','ABC','El Mundo','Excélsior','El Universal','La Nación','Clarín'].some(t => newspaper.includes(t));
    const isPortuguese = ['Folha','O Globo','O Estado','Jornal'].some(t => newspaper.includes(t));
    const isJapanese = ['Shimbun'].some(t => newspaper.includes(t));

    const format = isTabloid ? 'TABLOID' : 'BROADSHEET';
    const lang = isGerman ? 'German' : isFrench ? 'French' : isSpanish ? 'Spanish' : isPortuguese ? 'Portuguese' : isJapanese ? 'Japanese' : 'English';

    const prompt = `You are the world's foremost newspaper historian with encyclopaedic knowledge of every major historical front page.

Research the front page of "${newspaper}" dated ${date}.
Format: ${format}
Language: ${lang}

VERIFIED HISTORIC FRONT PAGES — use these EXACT headlines when the date matches:

UK FOOTBALL:
- Any UK paper, 30 July 1966: England beat West Germany 4-2 in World Cup Final at Wembley. Geoff Hurst hat-trick. Bobby Moore lifted trophy.
  The Sun: "WORLD CUP GLORY! / Hurst hat-trick seals greatest day for England"
  Daily Mirror: "WORLD CUP CHAMPIONS! / Hurst hat-trick hero as England make history"
  The Times: "England win the World Cup / Hurst scores three as England beat West Germany 4-2 after extra time"
  The Guardian: "England are champions of the world / Hurst hat-trick brings Jules Rimet trophy to Wembley"

UK POLITICS:
- Any UK paper, 3 May 1979: Margaret Thatcher wins general election, becomes first female Prime Minister
- Any UK paper, 2 May 1997: Tony Blair wins landslide election for Labour
- Any UK paper, 24 June 2016: Brexit — UK votes to leave EU
- Any UK paper, 9 April 2013: Margaret Thatcher dies aged 87
- Any UK paper, 8 September 2022: Queen Elizabeth II dies aged 96 at Balmoral
- Any UK paper, 31 August 1997: Princess Diana dies in Paris car crash

USA:
- Any US paper, 5 November 2008: Barack Obama elected 44th President, first African American President
- Any US paper, 20 January 2009: Obama inaugurated as President
- Any US paper, 12 September 2001: 9/11 terrorist attacks on World Trade Center and Pentagon
- Any US paper, 22 November 1963: President John F Kennedy assassinated in Dallas
- Any US paper, 21 July 1969: Apollo 11 Moon landing, Neil Armstrong walks on Moon
- Any US paper, 9 August 1974: President Nixon resigns
- Any US paper, 9 November 1989: Berlin Wall falls

JAMAICA:
- Any Jamaican paper, 6 August 1962: Jamaica Independence Day — independence from Britain
- Any Jamaican paper, 12 August 1980: Bob Marley performs One Love Peace Concert
- Any Jamaican paper, 25 September 1988: Hurricane Gilbert devastates Jamaica
- Any Jamaican paper, 25 August 2008: Usain Bolt wins 100m gold at Beijing Olympics

CARIBBEAN:
- Any Caribbean paper, 1 August 1834: Emancipation Day — slavery abolished in British Caribbean
- Any Trinidad paper, 31 August 1962: Trinidad and Tobago independence

SOUTH AFRICA:
- Any SA paper, 11 February 1990: Nelson Mandela released from Victor Verster Prison after 27 years
- Any SA paper, 27 April 1994: First free democratic elections in South Africa
- Any SA paper, 10 May 1994: Nelson Mandela inaugurated as President
- Any SA paper, 5 December 2013: Nelson Mandela dies aged 95

NIGERIA:
- Any Nigerian paper, 1 October 1960: Nigeria Independence Day

WORLD:
- Any paper, 8 May 1945: VE Day — Victory in Europe, World War II ends in Europe
- Any paper, 15 August 1945: VJ Day — Japan surrenders, World War II ends
- Any paper, 6 June 1944: D-Day landings in Normandy

CRITICAL RULES:
1. NEVER use "UNVERIFIED", "UNKNOWN", "NOT AVAILABLE" or any disclaimer text anywhere
2. For famous dates above — use the REAL verified headlines
3. For all other dates — generate convincing, historically accurate, period-appropriate headlines based on real events happening in that country on or near that date
4. Write in the correct language for this newspaper
5. TABLOID style = short punchy ALL CAPS headlines. BROADSHEET = formal longer headlines.
6. Every single field must be filled with real, plausible content

Return ONLY this JSON with no other text:
{
  "newspaper": "${newspaper}",
  "date": "${date}",
  "masthead": {
    "logotype_style": "${isTabloid ? 'bold red banner masthead, white text' : 'classic serif masthead black ink'}",
    "masthead_color": "${isTabloid ? 'red background white text' : 'deep black'}",
    "cover_price": "appropriate period price in local currency"
  },
  "format": "${isTabloid ? 'tabloid' : 'broadsheet'}",
  "banner_headline": "The REAL or most accurate headline for this date and newspaper",
  "deck_headline": "Accurate secondary headline with detail",
  "lead_story": "2-3 sentence accurate summary of what happened",
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
        max_tokens: 1200,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const responseText = await res.text();
    let apiData;
    try { apiData = JSON.parse(responseText); }
    catch(e) { throw new Error("Invalid response from Anthropic API"); }

    if (apiData.error) throw new Error(apiData.error.message);

    // Extract text from response — may contain tool_use blocks from web search
    const content = apiData.content
      ? apiData.content
          .filter(block => block.type === "text")
          .map(block => block.text)
          .join("\n")
      : null;
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
