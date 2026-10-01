const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const { sendError } = require('./utils/apiResponse');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, data: null, message: 'Server is healthy and running' });
});

app.use('/api', routes);

app.use((req, res) => {
  return sendError(res, 404, `Route ${req.originalUrl} not found`);
});

app.use(errorMiddleware);

module.exports = app;
