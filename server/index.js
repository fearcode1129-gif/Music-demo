const express = require('express');
const cors = require('cors');
const musicRoutes = require('./routes/music');
const { config } = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/music', musicRoutes);

app.use((error, req, res, next) => {
  const status = Number(error.status) || 500;
  res.status(status).json({
    code: status,
    error: error.code || 'INTERNAL_SERVER_ERROR',
    message: error.message || '服务异常'
  });
});

app.listen(config.port, () => {
  console.log(`[music-api] listening on http://127.0.0.1:${config.port}`);
});
