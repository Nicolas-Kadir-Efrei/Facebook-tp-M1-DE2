const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`My Social Networks API listening on http://localhost:${PORT}`);
  console.log(`Documentation index: http://localhost:${PORT}/api`);
});
