const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const Traceroute = require("nodejs-traceroute");
const axios = require("axios");
const cors = require('cors')

class WebSocketServerManager {
  constructor(port = 8080) {
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors())
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocketConnections();
    this.setupRoutes();
    this.startServer(port);
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


  setupRoutes() {
    this.app.get("/traceroute", async (req, res) => {
      const target = req.query.target;
      const hops = [];

      try {
        const traceroute = new Traceroute();
        traceroute
          .on("hop", (hop) => {
            if (hop && hop.ip) {
              hops.push({
                hop: hop.hop,
                ip: hop.ip,
              });
            }
          })
          .on("close", async () => {
            try {
              
              const locationPromises = hops.map(async (hop) => {
                try {
                  const response = await axios.get(`https://freeipapi.com/api/json/${hop.ip}`);
                  hop.location = {
                    city: response.data.cityName || "Unknown",
                    region: response.data.regionName || "Unknown",
                    country: response.data.countryName || "Unknown",
                  };
                } catch (error) {
                  hop.location = {
                    city: "Unknown",
                    region: "Unknown",
                    country: "Unknown",
                  };
                }
              });

              await Promise.all(locationPromises);
              res.json(hops);
            } catch (error) {
              res.status(500).send("Error occurred during location fetching");
            }
          });

        traceroute.trace(target);
      } catch (error) {
        res.status(500).send("Error occurred during traceroute");
      }
    });


    this.app.get("/health-check", async (req, res) => {
    res.json({ status: "ok" });
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
