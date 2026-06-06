const path = require('path');
const { createIslandServer } = require('./islandServer');

const app = createIslandServer();
const PORT = process.env.PORT || 3000;

const resources = [
  { id: 1, name: 'wood', emoji: '🌲', color: 'green', usedFor: ['road', 'settlement'] },
  { id: 2, name: 'brick', emoji: '🧱', color: 'red', usedFor: ['road', 'settlement'] },
  { id: 3, name: 'wheat', emoji: '🌾', color: 'gold', usedFor: ['settlement', 'city', 'development card'] },
  { id: 4, name: 'sheep', emoji: '🐑', color: 'light green', usedFor: ['settlement', 'development card'] },
  { id: 5, name: 'ore', emoji: '⛰️', color: 'gray', usedFor: ['city', 'development card'] }
];

const buildingCosts = [
  { id: 1, item: 'road', cost: { wood: 1, brick: 1 }, points: 0 },
  { id: 2, item: 'settlement', cost: { wood: 1, brick: 1, wheat: 1, sheep: 1 }, points: 1 },
  { id: 3, item: 'city', cost: { wheat: 2, ore: 3 }, points: 2 },
  { id: 4, item: 'development card', cost: { wheat: 1, sheep: 1, ore: 1 }, points: 0 }
];

const developmentCards = [
  { id: 1, name: 'Knight', effect: 'Move the robber and steal a resource from a player.' },
  { id: 2, name: 'Road Building', effect: 'Place two free roads.' },
  { id: 3, name: 'Year of Plenty', effect: 'Take two resources of your choice.' },
  { id: 4, name: 'Monopoly', effect: 'Choose one resource type and collect it from all players.' },
  { id: 5, name: 'Victory Point', effect: 'Worth one hidden victory point.' }
];

const players = [
  { id: 1, name: 'Blue Harbor', color: 'blue', points: 4, longestRoad: false, largestArmy: false },
  { id: 2, name: 'Red Brick', color: 'red', points: 5, longestRoad: true, largestArmy: false },
  { id: 3, name: 'White Mountain', color: 'white', points: 3, longestRoad: false, largestArmy: true }
];

const diceOdds = [
  { roll: 2, combinations: 1, probability: '2.78%' },
  { roll: 3, combinations: 2, probability: '5.56%' },
  { roll: 4, combinations: 3, probability: '8.33%' },
  { roll: 5, combinations: 4, probability: '11.11%' },
  { roll: 6, combinations: 5, probability: '13.89%' },
  { roll: 7, combinations: 6, probability: '16.67%' },
  { roll: 8, combinations: 5, probability: '13.89%' },
  { roll: 9, combinations: 4, probability: '11.11%' },
  { roll: 10, combinations: 3, probability: '8.33%' },
  { roll: 11, combinations: 2, probability: '5.56%' },
  { roll: 12, combinations: 1, probability: '2.78%' }
];

const tips = [
  { id: 1, title: 'Prioritize numbers', text: 'Settlements near 6 and 8 produce more often than rare numbers like 2 and 12.' },
  { id: 2, title: 'Diversify resources', text: 'A balanced resource spread makes it easier to build throughout the game.' },
  { id: 3, title: 'Use ports wisely', text: 'Ports are strongest when they match the resource you produce most.' }
];

// Static files: the homepage, CSS, JS, and background image are served from /public.
app.harbor(path.join(__dirname, 'public'));

app.get('/api', (req, res) => {
  res.trade({
    title: 'Catan Helper API: A Creative HTTP Server for Game Information',
    routes: app.routes(),
    creativeAPI: {
      settle: 'registers a route, like app.get/app.post but with a Catan theme',
      harbor: 'serves static files from the public folder',
      trade: 'sends JSON responses with a Catan-style wrapper'
    }
  });
});

app.get('/api/resources', (req, res) => {
  const { usedFor } = req.query;
  const filtered = usedFor
    ? resources.filter((resource) => resource.usedFor.includes(usedFor.toLowerCase()))
    : resources;
  res.trade({ resources: filtered });
});

app.get('/api/resources/:name', (req, res) => {
  const resource = resources.find((item) => item.name.toLowerCase() === req.params.name.toLowerCase());
  if (!resource) return res.notFound('Resource not found');
  res.trade({ resource });
});

app.get('/api/building-costs', (req, res) => {
  res.trade({ buildingCosts });
});

app.get('/api/building-costs/:item', (req, res) => {
  const item = buildingCosts.find((cost) => cost.item.toLowerCase() === req.params.item.toLowerCase());
  if (!item) return res.notFound('Building cost not found');
  res.trade({ item });
});

app.get('/api/development-cards', (req, res) => {
  res.trade({ developmentCards });
});

app.get('/api/players', (req, res) => {
  res.trade({ players });
});

app.post('/api/players', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.badRequest('Send a JSON body with name and color');
  }

  const { name, color } = req.body;
  if (!name || !color) {
    return res.badRequest('Missing required fields: name and color');
  }

  const newPlayer = {
    id: players.length + 1,
    name,
    color,
    points: Number(req.body.points || 0),
    longestRoad: Boolean(req.body.longestRoad),
    largestArmy: Boolean(req.body.largestArmy)
  };

  players.push(newPlayer);
  res.status(201).trade({ created: true, player: newPlayer });
});

app.get('/api/dice-odds', (req, res) => {
  const { roll } = req.query;
  if (roll) {
    const result = diceOdds.find((item) => item.roll === Number(roll));
    if (!result) return res.notFound('Dice roll not found');
    return res.trade({ diceOdds: result });
  }
  res.trade({ diceOdds });
});

app.get('/api/tips', (req, res) => {
  res.trade({ tips });
});

app.listen(PORT, () => {
  console.log(`Catan Helper API is running at http://localhost:${PORT}`);
  console.log('Try: GET /api/resources, /api/building-costs, /api/dice-odds');
});
