const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

class WebSocketServerManager {
  constructor(port = 8080) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocketConnections();
    this.startServer(port);
    // this.handleWebSocketErrors();
  }

  setupWebSocketConnections() {
    this.wss.on("connection", (ws) => {
      console.log("New client connected");

      ws.on("message", (message) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          console.log("Received message:", parsedMessage);

          // Broadcast received message to all clients
          this.wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(parsedMessage));
            }
          });
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket server encountered an error:", error);
      });
      ws.on("close", () => {
        console.log("Client disconnected");
      });
    });
  }

  handleWebSocketErrors() {
    this.wss.on("error", (error) => {
      console.error("WebSocket server encountered an error:", error);
    });
  }

  startServer(port) {
    this.server.listen(port, () => {
      console.log(`WebSocket server running on port ${port}`);
    });

    this.server.on("error", (error) => {
      console.error("HTTP server encountered an error:", error);
    });
  }
}

// Create WebSocket server instance
new WebSocketServerManager(8080);
