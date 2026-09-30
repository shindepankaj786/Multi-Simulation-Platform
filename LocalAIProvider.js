'use strict';
const http = require('http');

class LocalAIProvider {
  constructor() {
    this.isReady = true; // Always ready to call the Python API
  }

  isAvailable() {
    return true;
  }

  generateResponse(systemPrompt, userText) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ systemPrompt, userText });

      const aiHost = process.env.AI_HOST || '127.0.0.1';
      const aiPort = process.env.AI_PORT || 5000;

      const options = {
        hostname: aiHost,
        port: aiPort,
        path: '/generate',
        method: 'POST',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            console.error('[LocalAI] Python AI server returned an error', body);
            return resolve(null);
          }
          try {
            const parsed = JSON.parse(body);
            resolve(parsed.response ? parsed.response.trim() : null);
          } catch (e) {
            console.error('[LocalAI] Error parsing Python response', e);
            resolve(null);
          }
        });
      });

      req.on('error', (e) => {
        console.error('[LocalAI] Error communicating with Python AI server:', e.message);
        resolve(null);
      });

      req.on('timeout', () => {
        console.error('[LocalAI] Python AI server timed out after 60s');
        req.destroy();
        resolve(null);
      });

      req.write(data);
      req.end();
    });
  }
}

module.exports = new LocalAIProvider();
