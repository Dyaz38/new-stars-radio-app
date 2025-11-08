// Vercel Serverless Function - Health Check
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Cover Art API is running',
    endpoint: '/api/health'
  });
}

