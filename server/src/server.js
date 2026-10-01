const http = require('http');
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets/socketManager');
const { startReminderJob } = require('./jobs/reminderJob');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB();

const server = http.createServer(app);

// Initialize Socket.IO Server
initSocket(server);

// Start recurring reminder cron job worker
startReminderJob();

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});
