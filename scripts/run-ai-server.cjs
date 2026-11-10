// USB development server. Forward the port with adb reverse tcp:8083 tcp:8083.
const { createServer } = require('node:http');
const { middleware } = require('../server/azure.cjs');
createServer((req, res) => {
  const started = Date.now();
  res.on('finish', () => console.log(`AI request: ${res.statusCode} (${Date.now() - started}ms)`));
  middleware(req, res, () => { res.writeHead(404); res.end(); });
}).listen(8083, '127.0.0.1', () => console.log('Melen AI USB server listening on port 8083.'));
