import {
  InstanceBase,
  runEntrypoint,
  InstanceStatus,
  combineRgb,
} from "@companion-module/base";
import WebSocket, { WebSocketServer } from "ws";

class ZipCaptionsController extends InstanceBase {
  constructor(internal) {
    super(internal);

    this.wsServer = null;
    this.clients = new Set();
    this.pingInterval = null;
    this.captionState = "unknown";
    this.lastWord = "";

    this.CHOICES_COMMANDS = [
      { id: "TOGGLE_LISTEN", label: "Toggle Listen (Start/Stop)" },
      { id: "PLAY_PAUSE", label: "Toggle Play/Pause" },
    ];
  }

  async init(config) {
    this.config = config;
    this.updateStatus(InstanceStatus.Connecting);
    this.initWebSocketServer();
    this.initActions();
    this.init_feedbacks();
    this.init_variables();
  }

  async destroy() {
    this.log("debug", "Destroying module...");
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.wsServer) {
      this.wsServer.close();
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
          "This module controls Zip Captions via a Chrome Extension. Ensure the Chrome Extension is installed and the port matches.",
      },
      {
        type: "number",
        id: "port",
        label: "WebSocket Server Port",
        width: 4,
        min: 1024,
        max: 65535,
        default: 8082,
      },
    ];
  }

  async configUpdated(config) {
    this.config = config;
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
      this.log("info", `WebSocket server listening on port ${port}`);
      this.updateStatus(InstanceStatus.Ok, `Listening (Waiting for Extension)`);
    });

    this.wsServer.on("connection", (ws) => {
      this.log("info", `Chrome Extension connected.`);
      this.clients.add(ws);
      this.updateStatus(InstanceStatus.Ok, "Connected to Extension");

      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        this.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send("PING");
          }
        });
      }, 10000);

      ws.on("message", (message) => {
        const messageString = message.toString();

        if (messageString === "PONG") {
          this.log("debug", "Received PONG from client.");
          return;
        }

        try {
          const data = JSON.parse(messageString);
          const variablesToUpdate = {};
          if (data.status) {
            this.captionState = data.status;
            variablesToUpdate.caption_state = this.captionState;
            this.checkFeedbacks("caption_state");
          }
          if (data.lastWord) {
            this.lastWord = data.lastWord;
            variablesToUpdate.last_word = this.lastWord;
          }
          if (Object.keys(variablesToUpdate).length > 0) {
            this.setVariableValues(variablesToUpdate);
          }
        } catch (e) {
          this.log(
            "warn",
            `Received invalid JSON message. Error: ${e.message}`,
          );
        }
      });

      ws.on("close", () => {
        this.log("info", `Chrome Extension disconnected.`);
        this.clients.delete(ws);
        if (this.clients.size === 0) {
          this.updateStatus(InstanceStatus.Ok, "Listening");
          if (this.pingInterval) clearInterval(this.pingInterval);
        }
      });

      ws.on("error", (error) =>
        this.log("error", `WebSocket client error: ${error.message}`),
      );
    });

    this.wsServer.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        this.updateStatus(
          InstanceStatus.ConnectionFailure,
          `Port ${port} is already in use!`,
        );
      } else {
        this.updateStatus(InstanceStatus.Error, `Server Error: ${error.code}`);
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
          },
        ],
        callback: async (event) => {
          const commandToSend = event.options.command;
          if (this.clients.size > 0) {
            this.log("debug", `Sending command: "${commandToSend}"`);
            this.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(commandToSend);
              }
            });
          } else {
            this.log("warn", "Command not sent: No extension connected.");
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
      { name: "Captioning Status", variableId: "caption_state" },
      { name: "Last Captioned Word", variableId: "last_word" },
    ]);
    this.setVariableValues({
      caption_state: this.captionState,
      last_word: this.lastWord,
    });
  }
}

runEntrypoint(ZipCaptionsController, []);
