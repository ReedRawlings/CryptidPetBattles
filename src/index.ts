import { createServer } from 'http';
import app from './app';
import { initializeWebSocket } from './api/websocket';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket for real-time versus mode
const io = initializeWebSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Battle Pets Arena                         ║
║                      Server v1.0.0                           ║
╠══════════════════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}/api                     ║
║  WebSocket:   ws://localhost:${PORT}                           ║
║  Health:      http://localhost:${PORT}/health                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io };
