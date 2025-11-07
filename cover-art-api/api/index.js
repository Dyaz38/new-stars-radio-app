// Vercel Serverless Function Handler
export default function handler(req, res) {
  // Set CORS headers
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://new-stars-radio-app.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  // Health check endpoint
  if (pathname === '/api/health' || pathname === '/health') {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Cover Art API is running'
    });
  }

  // Root endpoint
  if (pathname === '/' || pathname === '/api') {
    return res.status(200).json({ 
      message: 'New Stars Radio - Cover Art API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/api/health',
        info: 'More endpoints coming soon (requires database setup)'
      }
    });
  }

  // 404 for other endpoints
  return res.status(404).json({ 
    error: 'Endpoint not found',
    path: pathname,
    method: req.method,
    message: 'This endpoint is not yet implemented'
  });
}

