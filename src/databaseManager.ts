/** @format */

import { WebSocket } from "ws";
import { Database } from "./database.js";
import { EventEmitter } from "node:events";

import type { z } from "zod";
import type { ManagerEvents, Response, Request } from "./types.js";

export class DatabaseManager extends EventEmitter<ManagerEvents> {
  auth: string;
  webSocket?: WebSocket;
  socketAddress: string;
  requests = new Map<string, Request<any>>();

  constructor(op: { url: string; auth: string } | { url: string; port: number; auth: string; secure?: boolean }) {
    super();

    this.auth = op.auth;
    this.socketAddress = "port" in op ? `ws${op.secure ? "s" : ""}://${op.url}:${op.port}` : op.url;
  }

  async connect() {
    this.webSocket = new WebSocket(this.socketAddress, { headers: { Authorization: this.auth } });

    await new Promise((resolve) => this.webSocket?.once("open", resolve));

    this.webSocket!.on("message", (message) => {
      const response = <Response>JSON.parse(message.toString());
      const request = this.requests.get(response.requestId);
      if (!request) return;
      if ("error" in response) request.reject(new Error(JSON.stringify(response)));
      else request.resolve(response.data);
      clearTimeout(request.timeout);
      this.requests.delete(response.requestId);
    });
    this.webSocket.on("error", (err) => this.emit("error", err));
    this.webSocket.once("close", () => this.emit("disconnected", this.socketAddress));
  }

  /**
   * @description Creates a new database with the given path
   * @requires {@linkcode DatabaseManager#connect} to be called and awaited
   * @throws if webSocket connection is not open i.e is closed or connecting or closing
   */
  createDatabase<T = unknown>(path: string): Database<T>;
  createDatabase<T extends z.ZodType>(path: string, schema: T): Database<z.infer<T>>;

  createDatabase(path: string, schema?: z.ZodType) {
    if (this.webSocket?.readyState !== WebSocket.OPEN)
      throw new Error(`Please do "await <DatabaseManager>.connect()" before trying to create a database !`);

    return new Database(this, path, schema);
  }
}
