import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log(`CareRoute Guardian running at http://localhost:${port}`));
