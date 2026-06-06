# Catan Helper API: A Creative HTTP Server for Game Information

This project is a creative HTTP server built from scratch with Node.js's low-level `net` module. It does not use Node's `http` module, `http2`, Express, or any third-party HTTP framework.

The theme is a Catan-style helper API. The homepage presents a polished board-game interface, while the backend demonstrates manual HTTP parsing, manual HTTP response generation, routing, static files, JSON responses, path parameters, query strings, and POST support.

## How to Run

```bash
npm start
```

Then open:

```txt
http://localhost:3000
```

## Main Files

```txt
catan-helper-http-server/
  islandServer.js
  server.js
  package.json
  README.md
  public/
    index.html
    style.css
    catan-background.jpg
```

## Requirements Covered

### 1. Uses only Node.js `net`

The server is created with:

```js
const net = require('net');
```

The project does not import `http`, `http2`, Express, or any third-party HTTP library.

### 2. Manual HTTP/1.1 request parsing

`parseRequest(rawData)` manually parses:

- request line: method, path, HTTP version
- headers
- query strings
- body
- JSON body for `Content-Type: application/json`

### 3. Manual HTTP/1.1 response generation

`buildResponse(statusCode, headers, body)` manually builds:

- status line
- response headers
- `Content-Length`
- empty line
- response body

### 4. Routing system

Routes are matched by HTTP method and path. The router supports path parameters such as:

```txt
GET /api/resources/:name
GET /api/building-costs/:item
```

### 5. Static file serving

The homepage, stylesheet, and background image are served from the `public` folder using:

```js
app.harbor(path.join(__dirname, 'public'));
```

This is the Catan-themed equivalent of `express.static()`.

### 6. Creative API design

The framework uses Catan-inspired method names:

```js
app.settle('GET', '/api/resources', handler);
app.harbor('./public');
res.trade({ resources });
```

Meaning:

- `settle(...)` registers a route, like building a settlement on the server island.
- `harbor(...)` serves static files, like connecting the island to a harbor.
- `trade(...)` sends a JSON response, like trading resources.

## API Routes

### API Index

```txt
GET /api
```

Returns the project title, available routes, and creative API explanation.

### Resources

```txt
GET /api/resources
GET /api/resources/wood
GET /api/resources?usedFor=settlement
```

Examples:

```bash
curl http://localhost:3000/api/resources
curl http://localhost:3000/api/resources/wood
curl "http://localhost:3000/api/resources?usedFor=settlement"
```

### Building Costs

```txt
GET /api/building-costs
GET /api/building-costs/road
GET /api/building-costs/city
```

Examples:

```bash
curl http://localhost:3000/api/building-costs
curl http://localhost:3000/api/building-costs/road
```

### Development Cards

```txt
GET /api/development-cards
```

Example:

```bash
curl http://localhost:3000/api/development-cards
```

### Players

```txt
GET /api/players
POST /api/players
```

Example GET:

```bash
curl http://localhost:3000/api/players
```

Example POST:

```bash
curl -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -d '{"name":"Green Forest","color":"green","points":2}'
```

### Dice Odds

```txt
GET /api/dice-odds
GET /api/dice-odds?roll=8
```

Examples:

```bash
curl http://localhost:3000/api/dice-odds
curl "http://localhost:3000/api/dice-odds?roll=8"
```

### Tips

```txt
GET /api/tips
```

Example:

```bash
curl http://localhost:3000/api/tips
```

## Example Usage in Code

```js
const { createIslandServer } = require('./islandServer');
const app = createIslandServer();

app.harbor('./public');

app.settle('GET', '/api/resources', (req, res) => {
  res.trade({ resources: ['wood', 'brick', 'wheat', 'sheep', 'ore'] });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## Notes

This is not a full Catan game implementation. It is a creative HTTP server framework and demonstration API inspired by the game theme.
