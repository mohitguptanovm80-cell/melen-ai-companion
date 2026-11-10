// Optional live check: node --env-file=.env scripts/check-ai.cjs /path/to/sample.m4a
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { middleware } = require('../server/azure.cjs');

(async () => {
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}/api/ai`;
  try {
    const chat = await fetch(`${base}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Reply with just OK.' }] }),
    });
    const reply = await chat.json();
    if (!chat.ok || !reply.choices?.[0]?.message?.content?.trim()) throw new Error(reply.error?.message ?? 'Chat check failed.');
    console.log('PASS: live chat through the app server.');
    if (process.argv[2]) {
      const body = new FormData();
      body.append('file', new Blob([await readFile(process.argv[2])], { type: 'audio/mp4' }), 'sample.m4a');
      const voice = await fetch(`${base}/audio/transcriptions`, { method: 'POST', body });
      const transcript = await voice.json();
      if (!voice.ok || !transcript.text?.trim()) throw new Error(transcript.error?.message ?? 'Voice check failed.');
      console.log('PASS: audio upload, conversion, and Azure Realtime speech recognition.');
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
