// Starts a background generation job and returns a jobId immediately

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
    const body = JSON.parse(event.body || "{}");
    const jobId = "job_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);

    // Initialize job status
    const { getStore } = require("@netlify/blobs");
    const store = getStore("inkdate-jobs");
    await store.setJSON(jobId, { status: "pending" });

    // Trigger the background function (fire and forget)
    const siteUrl = "https://" + event.headers.host;
    fetch(siteUrl + "/.netlify/functions/generate-image-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, jobId }),
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
