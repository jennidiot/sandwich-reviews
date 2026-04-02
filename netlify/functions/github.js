// netlify/functions/github.js
// Proxies GitHub Contents API calls from the browser.
// The token never leaves the server — it lives in Netlify environment variables.

const OWNER  = 'jennidiot';
const REPO   = 'sandwich-reviews';

exports.handler = async (event) => {
  // Only accept POST from our own page
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not configured in Netlify environment variables' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { path, method = 'GET', body = null } = payload;

  if (!path) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing path' }) };
  }

  // Only allow access to files in our own repo
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  const ghRes = await fetch(url, {
    method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept':        'application/vnd.github.v3+json',
      'Content-Type':  'application/json',
      'User-Agent':    'sandwich-reviews-app',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await ghRes.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!ghRes.ok) {
    return {
      statusCode: ghRes.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: data.message || `GitHub API error ${ghRes.status}` }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
