// Polls for the status of a background generation job

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

  try {
    const jobId = event.queryStringParameters && event.queryStringParameters.jobId;
    if (!jobId) throw new Error("No jobId provided");

    const { getStore } = require("@netlify/blobs");
    const store = getStore("inkdate-jobs");
    const result = await store.get(jobId, { type: "json" });

    if (!result) {
      return { statusCode: 200, headers, body: JSON.stringify({ status: "pending" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
