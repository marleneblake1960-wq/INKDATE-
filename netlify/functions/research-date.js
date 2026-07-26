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

    // Extract event hint if provided e.g. "May 26 1999 — Manchester United win Treble"
    const dateParts = date.split('—');
    const cleanDate = dateParts[0].trim();
    const eventHint = dateParts[1] ? dateParts[1].trim() : null;

    const isTabloid = ['The Sun','Daily Mirror','Daily Mail','Daily Express',
      'New York Daily News','The Star','The Star Jamaica'].some(t => newspaper.includes(t));

    const format = isTabloid ? 'TABLOID' : 'BROADSHEET';

    const prompt = `You are a newspaper historian with expert knowledge of historical front pages worldwide.

Research the front page of "${newspaper}" dated ${cleanDate}.
${eventHint ? `IMPORTANT: This front page must focus on this specific event: "${eventHint}". Generate headlines and content specifically about this event even if it was primarily sports news — treat it as front page news for this collector's edition book.` : ''}
Format: ${format}

VERIFIED HISTORIC EVENTS — use EXACT details when dates match:

=== SPORT ===

30 July 1966 — ENGLAND WIN WORLD CUP:
Headlines: "WORLD CUP GLORY!" (Sun) / "WORLD CUP CHAMPIONS!" (Mirror) / "England win the World Cup" (Times)
Deck: "Hurst hat-trick seals greatest day for England / 4-2 after extra time"
Photograph: "Bobby Moore, England captain in red shirt and white shorts, triumphantly holding the Jules Rimet gold trophy aloft above his head, surrounded by jubilant England teammates at Wembley Stadium, crowd cheering in background, black and white press photograph"
Caption: "England captain Bobby Moore lifts the Jules Rimet Cup after the 4-2 victory over West Germany at Wembley"
Secondary: "Hurst scores three / West Germany beaten 4-2 after extra time / Ramsey's men make history"

25 August 2008 — USAIN BOLT 100M GOLD BEIJING:
Photograph: "Usain Bolt of Jamaica crossing the finish line arms outstretched in celebration, chest out, looking to the sides, at Beijing National Stadium, Jamaican flag colours, black and white press photograph"
Caption: "Usain Bolt of Jamaica wins the 100m gold medal at the Beijing Olympics in world record time"

=== USA POLITICS ===

5 November 2008 — OBAMA ELECTED PRESIDENT:
Headlines: "OBAMA ELECTED PRESIDENT" (Washington Post) / "OBAMA MAKES HISTORY" (NY Times) / "OBAMA!" (Chicago Tribune)
Deck: "Illinois Senator Elected 44th President, First African American to Hold Office"
Photograph: "Barack Obama and Michelle Obama on stage together at Grant Park Chicago, Barack in dark suit raising his right fist in triumph, Michelle in black and red dress beside him, massive jubilant crowd behind them, American flags waving, floodlights illuminating the night scene, black and white press photograph"
Caption: "President-elect Barack Obama and his wife Michelle acknowledge the crowd at Grant Park, Chicago, after his historic election victory"
Secondary: "Democrats expand majority in Congress / McCain concedes graciously / World reacts with joy"

20 January 2009 — OBAMA INAUGURATION:
Photograph: "Barack Obama taking the oath of office with his right hand raised, Michelle Obama holding the Bible, Chief Justice John Roberts beside him, massive crowd filling the National Mall in Washington DC behind them, black and white press photograph"
Caption: "Barack Obama is sworn in as the 44th President of the United States on the steps of the Capitol"

22 November 1963 — JFK ASSASSINATION:
Photograph: "Jacqueline Kennedy in pink suit beside Lyndon B Johnson on Air Force One as he takes the presidential oath of office, her expression grave and dignified, historic moment captured in close quarters, black and white press photograph"
Caption: "Lyndon B Johnson takes the oath of office aboard Air Force One as Jacqueline Kennedy stands beside him"

21 July 1969 — MOON LANDING:
Photograph: "Astronaut Buzz Aldrin in white spacesuit standing on the grey lunar surface with Earth visible in the black sky above, footprints in the moon dust, the lunar module visible in the background, NASA photograph"
Caption: "Astronaut Buzz Aldrin on the surface of the Moon during the Apollo 11 mission"

=== UK EVENTS ===

31 August 1997 — PRINCESS DIANA DIES:
Photograph: "Floral tributes and candles piled high outside the gates of Kensington Palace, mourners gathered in the early morning light, a sea of flowers and photographs left in tribute, black and white press photograph"
Caption: "Mourners gather outside Kensington Palace to pay tribute to Diana, Princess of Wales"

8 September 2022 — QUEEN ELIZABETH II DIES:
Photograph: "The gates of Balmoral Castle in Scotland with floral tributes laid at the base, Scottish flag flying at half mast, a lone guard standing at the entrance, grey Scottish sky, black and white press photograph"
Caption: "Floral tributes are laid at the gates of Balmoral Castle following the death of Her Majesty Queen Elizabeth II"

3 May 1979 — THATCHER ELECTION VICTORY:
Photograph: "Margaret Thatcher standing on the steps of 10 Downing Street, smiling confidently in a formal suit, waving to the gathered press, her husband Denis Thatcher beside her, black and white press photograph"
Caption: "Margaret Thatcher arrives at 10 Downing Street as Britain's first female Prime Minister"

2 May 1997 — TONY BLAIR VICTORY:
Photograph: "Tony Blair and Cherie Blair waving from the steps of 10 Downing Street surrounded by cheering Labour supporters waving red roses, broad smiles, morning light, black and white press photograph"
Caption: "Tony Blair arrives at Downing Street following Labour's landslide general election victory"

=== WORLD EVENTS ===

8 May 1945 — VE DAY:
Photograph: "Enormous jubilant crowds packed into Piccadilly Circus London, people climbing lamp posts and bus tops, waving Union Jack flags, celebrating in the street, some in military uniform, black and white press photograph"
Caption: "Thousands celebrate Victory in Europe Day in Piccadilly Circus, London"

6 June 1944 — D-DAY:
Photograph: "American soldiers wading through the surf at Omaha Beach in Normandy, carrying equipment and rifles, landing craft behind them, smoke in the distance, Robert Capa-style blurred urgent press photograph, black and white"
Caption: "American troops wade ashore at Normandy on D-Day, June 6 1944"

9 November 1989 — BERLIN WALL FALLS:
Photograph: "Jubilant East and West Berliners standing on top of the Berlin Wall at the Brandenburg Gate, some waving flags, others embracing, crowds on both sides, floodlit night scene, black and white press photograph"
Caption: "Berliners celebrate atop the Wall at the Brandenburg Gate as the border opens"

11 February 1990 — MANDELA RELEASED:
Photograph: "Nelson Mandela walking through the gates of Victor Verster Prison, right fist raised in triumph, Winnie Mandela beside him holding his other hand, crowds cheering behind them, sunlight, black and white press photograph"
Caption: "Nelson Mandela walks free from Victor Verster Prison after 27 years, greeted by his wife Winnie"

10 May 1994 — MANDELA INAUGURATED:
Photograph: "Nelson Mandela in suit taking the presidential oath on the steps of the Union Buildings in Pretoria, right hand raised, surrounded by dignitaries, massive crowd below, South African flag visible, black and white press photograph"
Caption: "Nelson Mandela is inaugurated as the first democratically elected President of South Africa"

=== CARIBBEAN ===

6 August 1962 — JAMAICA INDEPENDENCE:
Photograph: "Jamaican crowd celebrating in Kingston with the new black, green and gold Jamaican flag being raised for the first time, people waving flags and cheering, outdoor ceremony at night lit by floodlights, black and white press photograph"
Caption: "Jamaica celebrates independence as the new national flag is raised for the first time in Kingston"

=== RULES ===
1. For dates matching above — use the EXACT photograph description provided
2. For other dates — generate a realistic period-accurate photograph description based on the event
3. NEVER use "UNVERIFIED" or "UNKNOWN"
4. TABLOID = short punchy ALL CAPS headlines. BROADSHEET = formal longer headlines.
5. Every field must have real plausible content

Return ONLY this JSON, no other text:
{
  "newspaper": "${newspaper}",
  "date": "${date}",
  "masthead": {
    "logotype_style": "${isTabloid ? 'bold red banner white text' : 'classic serif black ink'}",
    "masthead_color": "${isTabloid ? 'red with white text' : 'deep black'}",
    "cover_price": "period appropriate price"
  },
  "format": "${isTabloid ? 'tabloid' : 'broadsheet'}",
  "banner_headline": "Real or most accurate headline",
  "deck_headline": "Accurate secondary headline",
  "lead_story": "2-3 sentence accurate summary",
  "dominant_photograph": "Detailed photograph description from verified list above or period-accurate equivalent",
  "photo_caption": "Realistic photo caption",
  "secondary_stories": [
    "Real secondary headline 1",
    "Real secondary headline 2"
  ],
  "historical_context": "Brief note on era and newspaper style"
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
