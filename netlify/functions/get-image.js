const { getStore } = require("@netlify/blobs");

exports.handler = async function(event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const key = event.queryStringParameters && event.queryStringParameters.key;
    if (!key) throw new Error("No image key provided");

    const store = getStore("inkdate-images");
    const arrayBuffer = await store.get(key, { type: "arrayBuffer" });

    if (!arrayBuffer) throw new Error("Image not found");

    const b64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
      body: b64,
      isBase64Encoded: true,
    };

  } catch(err) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
