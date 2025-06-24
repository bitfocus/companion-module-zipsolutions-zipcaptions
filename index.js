import {
  InstanceBase,
  runEntrypoint,
  InstanceStatus,
  combineRgb,
} from "@companion-module/base";
// CORRECTED: Import WebSocket as the default to access its static properties like .OPEN
import WebSocket, { WebSocketServer } from "ws";

class ZipCaptionsController extends InstanceBase {
  constructor(internal) {
    super(internal);

    this.wsServer = null;
    this.clients = new Set();
    this.pingInterval = null;
    this.captionState = "unknown";

    this.CHOICES_COMMANDS = [
      { id: "TOGGLE_LISTEN", label: "Toggle Listen (Start/Stop)" },
      { id: "PLAY_PAUSE", label: "Toggle Play/Pause" },
    ];
  }

  async init(config) {
    this.config = config;
    this.updateStatus(InstanceStatus.Connecting);
    this.log("debug", "Initializing Zip Captions Controller module...");

    this.initWebSocketServer();
    this.initActions();
    this.init_feedbacks();
    this.init_variables();
  }

  async destroy() {
    this.log("debug", "Destroying Zip Captions Controller module...");
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
  }

  getConfigFields() {
    return [
      {
        type: "static-text",
        id: "info",
        width: 12,
        label: "Information",
        value:
          "This module controls Zip Captions via a Chrome Extension. Ensure the Chrome Extension is installed and running, and the port matches.",
      },
      {
        type: "number",
        id: "port",
        label: "WebSocket Server Port",
        width: 4,
        min: 1024,
        max: 65535,
        default: 8082,
        tooltip:
          "This port must match the port configured in your Chrome Extension's background.js file.",
      },
    ];
  }

  async configUpdated(config) {
    this.config = config;
    this.log("debug", "Configuration updated. Restarting WebSocket server...");
    if (this.wsServer) {
      this.wsServer.close();
    }
    this.initWebSocketServer();
  }

  initWebSocketServer() {
    const port = this.config.port;
    if (!port) {
      this.updateStatus(InstanceStatus.BadConfig, "Port is not configured!");
      return;
    }

    this.wsServer = new WebSocketServer({ port: port });

    this.wsServer.on("listening", () => {
      this.log(
        "info",
        `WebSocket server started and listening on port ${port}`,
      );
      this.updateStatus(InstanceStatus.Ok, `Listening (Waiting for Extension)`);
    });

    this.wsServer.on("connection", (ws) => {
      this.log("info", `Chrome Extension connected.`);
      this.clients.add(ws);
      this.updateStatus(InstanceStatus.Ok, "Connected to Extension");

      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }

      this.pingInterval = setInterval(() => {
        this.clients.forEach((client) => {
          // CORRECTED: Check readyState against the imported WebSocket object's OPEN property.
          if (client.readyState === WebSocket.OPEN) {
            client.send("PING");
            this.log("debug", "Sent PING to extension.");
          }
        });
      }, 20000);

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          if (data.status) {
            this.log("debug", `Received status update: ${data.status}`);
            this.captionState = data.status;
            this.checkFeedbacks("caption_state");
            this.setVariableValues({ caption_state: this.captionState });
          }
        } catch (e) {
          this.log(
            "warn",
            `Received invalid message from client. Error: ${e.message}`,
          );
        }
      });

      ws.on("close", () => {
        this.log("info", `Chrome Extension disconnected.`);
        this.clients.delete(ws);
        if (this.clients.size === 0) {
          this.updateStatus(
            InstanceStatus.Warning,
            "Disconnected from Extension",
          );
          if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
          }
        }
      });

      ws.on("error", (error) => {
        this.log("error", `WebSocket client error: ${error.message}`);
      });
    });

    this.wsServer.on("error", (error) => {
      this.log("error", `WebSocket server setup error: ${error.message}`);
      if (error.code === "EADDRINUSE") {
        this.updateStatus(
          InstanceStatus.ConnectionFailure,
          `Port ${port} is already in use!`,
        );
      } else {
        this.updateStatus(
          InstanceStatus.ConnectionFailure,
          `Server Error: ${error.message}`,
        );
      }
    });
  }

  initActions() {
    this.setActionDefinitions({
      send_command: {
        name: "Send Command to Zip Captions",
        options: [
          {
            type: "dropdown",
            id: "command",
            label: "Command",
            default: "TOGGLE_LISTEN",
            choices: this.CHOICES_COMMANDS,
            tooltip: "Select the action to perform in Zip Captions.",
          },
        ],
        callback: async (event) => {
          const commandToSend = event.options.command;
          if (this.clients.size > 0) {
            this.log("debug", `Sending command: "${commandToSend}"`);
            this.clients.forEach((client) => {
              // CORRECTED: Check readyState against the imported WebSocket object's OPEN property.
              if (client.readyState === WebSocket.OPEN) {
                client.send(commandToSend);
              }
            });
          } else {
            this.log(
              "warn",
              `Command not sent: No Chrome extension connected.`,
            );
            this.updateStatus(
              InstanceStatus.Warning,
              "Extension Not Connected",
            );
          }
        },
      },
    });
  }

  init_feedbacks() {
    this.setFeedbackDefinitions({
      caption_state: {
        type: "boolean",
        name: "Captioning State",
        description: "Change button style if captioning is running or stopped",
        defaultStyle: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
        },
        options: [
          {
            type: "dropdown",
            label: "State",
            id: "state",
            default: "running",
            choices: [
              { id: "running", label: "Running" },
              { id: "stopped", label: "Stopped" },
            ],
          },
        ],
        callback: (feedback) => {
          return this.captionState === feedback.options.state;
        },
      },
    });
  }

  init_variables() {
    this.setVariableDefinitions([
      {
        name: "Captioning Status",
        variableId: "caption_state",
      },
    ]);
    this.setVariableValues({ caption_state: this.captionState });
  }
}

runEntrypoint(ZipCaptionsController, []);
