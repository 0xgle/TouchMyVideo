'use strict';
// Local API for the browser extension.
// Security model:
//   • listens on 127.0.0.1 only;
//   • Host header must be 127.0.0.1/localhost (blocks DNS-rebinding);
//   • state-changing requests are accepted only from browser-extension origins.
//     Ordinary websites cannot forge the Origin header, so a page you visit
//     can no longer start downloads on your machine.
const http = require('http');
const { log } = require('./store');

const PORTS = [43210, 43211, 43212, 43213, 43214];
const EXT_ORIGIN = /^(chrome-extension|moz-extension|safari-web-extension|ms-browser-extension):\/\/[a-z0-9.@_-]+$/i;
const MAX_BODY = 16 * 1024;

function createServer({ version, onDownload, onPing }) {
  let server = null;
  let port = null;

  const handler = (req, res) => {
    const origin = req.headers.origin || '';
    const host = (req.headers.host || '').toLowerCase();
    const json = (code, body, extra = {}) => {
      res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra });
      res.end(JSON.stringify(body));
    };

    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json(403, { error: 'forbidden-host' });

    const fromExtension = EXT_ORIGIN.test(origin);
    const cors = fromExtension ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    } : {};

    if (req.method === 'OPTIONS') {
      if (!fromExtension) return json(403, { error: 'forbidden-origin' });
      res.writeHead(204, cors); return res.end();
    }

    const url = new URL(req.url, 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/ping') {
      onPing?.();
      return json(200, { status: 'ok', app: 'TouchMyVideo', version }, cors);
    }

    if (req.method === 'POST' && url.pathname === '/download') {
      if (!fromExtension) return json(403, { error: 'forbidden-origin' });
      if (!/^application\/json/i.test(req.headers['content-type'] || '')) return json(415, { error: 'json-required' }, cors);
      let body = '';
      let tooBig = false;
      req.setEncoding('utf8');
      req.on('data', (c) => { body += c; if (body.length > MAX_BODY) { tooBig = true; req.destroy(); } });
      req.on('end', () => {
        if (tooBig) return;
        let data;
        try { data = JSON.parse(body); } catch { return json(400, { error: 'bad-json' }, cors); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) return json(400, { error: 'bad-json' }, cors);
        let r;
        try {
          r = onDownload({
            url: String(data.url || ''),
            options: {
              quality: typeof data.quality === 'string' ? data.quality : null,
              audioOnly: !!data.audioOnly,
              playlist: !!data.playlist,
            },
            title: typeof data.title === 'string' ? data.title.slice(0, 300) : null,
          });
        } catch (e) {
          log('server: download request failed', e.message);
          return json(500, { ok: false, error: 'internal' }, cors);
        }
        return json(r.ok ? 200 : 400, r, cors);
      });
      return;
    }

    json(404, { error: 'not-found' }, cors);
  };

  const safeHandler = (req, res) => {
    try { handler(req, res); }
    catch (e) {
      log('server error', e.message);
      try { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"internal"}'); } catch {}
    }
  };

  function listen(i = 0) {
    return new Promise((resolve) => {
      if (i >= PORTS.length) { log('server: no free port'); return resolve(null); }
      const s = http.createServer(safeHandler);
      s.once('error', (e) => {
        log('server port', PORTS[i], e.code);
        resolve(listen(i + 1));
      });
      s.listen(PORTS[i], '127.0.0.1', () => {
        server = s; port = PORTS[i];
        log('server listening on', port);
        resolve(port);
      });
    });
  }

  return {
    start: () => listen(0),
    stop: () => { try { server?.close(); } catch {} },
    get port() { return port; },
  };
}

module.exports = { createServer, PORTS, EXT_ORIGIN };
