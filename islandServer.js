const net = require('net');
const fs = require('fs');
const path = require('path');

const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  500: 'Internal Server Error'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function parseQuery(queryString = '') {
  const query = {};
  if (!queryString) return query;

  queryString.split('&').forEach((pair) => {
    if (!pair) return;
    const [rawKey, rawValue = ''] = pair.split('=');
    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
    const value = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    query[key] = value;
  });

  return query;
}

function parseRequest(rawData) {
  const requestText = rawData.toString();
  const [headerSection = '', bodySection = ''] = requestText.split('\r\n\r\n');
  const lines = headerSection.split('\r\n').filter(Boolean);
  const [method = '', fullPath = '/', version = 'HTTP/1.1'] = (lines[0] || '').split(' ');
  const [pathname, queryString = ''] = fullPath.split('?');

  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    const colonIndex = lines[i].indexOf(':');
    if (colonIndex === -1) continue;
    const key = lines[i].slice(0, colonIndex).trim().toLowerCase();
    const value = lines[i].slice(colonIndex + 1).trim();
    headers[key] = value;
  }

  let body = bodySection;
  const contentType = headers['content-type'] || '';
  if (bodySection && contentType.includes('application/json')) {
    try {
      body = JSON.parse(bodySection);
    } catch (error) {
      body = bodySection;
    }
  }

  return {
    method: method.toUpperCase(),
    path: pathname || '/',
    query: parseQuery(queryString),
    headers,
    body,
    version,
    raw: requestText,
    params: {}
  };
}

function buildResponse(statusCode, headers = {}, body = '') {
  const statusText = STATUS_TEXT[statusCode] || 'OK';
  const normalizedBody = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  const finalHeaders = {
    Connection: 'close',
    ...headers,
    'Content-Length': normalizedBody.length
  };

  let responseHead = `HTTP/1.1 ${statusCode} ${statusText}\r\n`;
  for (const [key, value] of Object.entries(finalHeaders)) {
    responseHead += `${key}: ${value}\r\n`;
  }
  responseHead += '\r\n';

  return Buffer.concat([Buffer.from(responseHead), normalizedBody]);
}

function createResponse(socket) {
  let statusCode = 200;
  const headers = {};
  let sent = false;

  function send(status, responseHeaders, body) {
    if (sent) return;
    sent = true;
    socket.end(buildResponse(status, responseHeaders, body));
  }

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    set(key, value) {
      headers[key] = value;
      return this;
    },
    send(body) {
      const contentType = headers['Content-Type'] || headers['content-type'] || 'text/plain; charset=utf-8';
      send(statusCode, { ...headers, 'Content-Type': contentType }, body);
    },
    json(data) {
      send(statusCode, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify(data, null, 2));
    },
    // Creative Catan-inspired response helper: return JSON as a "trade".
    trade(data) {
      this.set('X-Catan-Action', 'trade');
      this.json({ island: 'Catan Helper API', timestamp: new Date().toISOString(), data });
    },
    html(markup) {
      send(statusCode, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }, markup);
    },
    notFound(message = 'Route not found') {
      this.status(404).trade({ error: message });
    },
    badRequest(message = 'Bad request') {
      this.status(400).trade({ error: message });
    }
  };
}

function createRoute(method, pattern, handler) {
  const paramNames = [];
  const escaped = pattern
    .replace(/\//g, '\\/')
    .replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  const regex = new RegExp(`^${escaped}$`);
  return { method, pattern, regex, paramNames, handler };
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function safeJoin(staticDir, requestPath) {
  const decodedPath = decodeURIComponent(requestPath);
  const cleanedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const resolvedDir = path.resolve(staticDir);
  const resolvedFile = path.resolve(path.join(staticDir, cleanedPath));
  if (!resolvedFile.startsWith(resolvedDir)) return null;
  return resolvedFile;
}

function createIslandServer() {
  const routes = [];
  const staticMounts = [];

  function addRoute(method, pattern, handler) {
    routes.push(createRoute(method.toUpperCase(), pattern, handler));
  }

  function matchRoute(method, requestPath) {
    for (const route of routes) {
      if (route.method !== method) continue;
      const match = requestPath.match(route.regex);
      if (!match) continue;
      const params = {};
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
      return { handler: route.handler, params };
    }
    return null;
  }

  function tryStatic(req, socket) {
    for (const mount of staticMounts) {
      if (mount.prefix !== '/' && !req.path.startsWith(mount.prefix)) continue;
      const fileRequestPath = mount.prefix === '/' ? req.path : req.path.slice(mount.prefix.length) || '/';
      const filePath = safeJoin(mount.directory, fileRequestPath);
      if (!filePath) {
        socket.end(buildResponse(403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden'));
        return true;
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
      const fileBuffer = fs.readFileSync(filePath);
      socket.end(buildResponse(200, { 'Content-Type': getMimeType(filePath) }, fileBuffer));
      return true;
    }
    return false;
  }

  const app = {
    // Creative Catan API: a route is a settlement on the server island.
    settle(method, pattern, handler) {
      addRoute(method, pattern, handler);
      return this;
    },
    get(pattern, handler) {
      return this.settle('GET', pattern, handler);
    },
    post(pattern, handler) {
      return this.settle('POST', pattern, handler);
    },
    // Creative Catan API: static files are served from the harbor.
    harbor(prefixOrDirectory, maybeDirectory) {
      const prefix = maybeDirectory ? prefixOrDirectory : '/';
      const directory = maybeDirectory || prefixOrDirectory;
      staticMounts.push({ prefix, directory });
      return this;
    },
    routes() {
      return routes.map(({ method, pattern }) => ({ method, path: pattern }));
    },
    listen(port, callback) {
      const server = net.createServer((socket) => {
        socket.on('data', (data) => {
          const req = parseRequest(data);
          const res = createResponse(socket);

          try {
            const matched = matchRoute(req.method, req.path);
            if (matched) {
              req.params = matched.params;
              matched.handler(req, res);
              return;
            }

            if (req.method === 'GET' && tryStatic(req, socket)) {
              return;
            }

            res.notFound(`No settlement found for ${req.method} ${req.path}`);
          } catch (error) {
            res.status(500).trade({ error: 'Internal server error', details: error.message });
          }
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error.message);
        });
      });

      server.listen(port, callback);
      return server;
    }
  };

  return app;
}

module.exports = { createIslandServer, parseRequest, buildResponse };
