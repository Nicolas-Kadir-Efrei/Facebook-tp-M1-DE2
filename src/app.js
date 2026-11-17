const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const groupsRouter = require('./routes/groups');
const discussionsRouter = require('./routes/discussions');
const albumsRouter = require('./routes/albums');
const pollsRouter = require('./routes/polls');
const ticketsRouter = require('./routes/tickets');
const shoppingRouter = require('./routes/shopping');
const carpoolsRouter = require('./routes/carpools');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
  res.json({
    name: 'My Social Networks API',
    version: '2.0.0',
    docs: '/api',
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'My Social Networks API v2.0.0',
    version: '2.0.0',
    endpoints: {
      users: '/api/users',
      events: '/api/events',
      groups: '/api/groups',
      discussions: '/api/discussions',
      albums: '/api/albums',
      polls: '/api/polls',
      tickets: '/api/tickets',
      shopping: '/api/shopping',
      carpools: '/api/carpools (bonus)',
    },
  });
});

app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/discussions', discussionsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/polls', pollsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/shopping', shoppingRouter);
app.use('/api/carpools', carpoolsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
