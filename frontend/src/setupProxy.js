const { createProxyMiddleware } = require('http-proxy-middleware');

// Proxy API requests to FastAPI backend during development
module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
    })
  );
}; 