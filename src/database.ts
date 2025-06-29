/** @format */

import { randomUUID } from "node:crypto";

import type { ZodTypeAny } from "zod";
import type { Payload, Request } from "./types.js";
import type { DatabaseManager } from "./databaseManager.js";

export class Database<T> {
  path: string;
  #schema?: ZodTypeAny;
  manager: DatabaseManager;

  constructor(manager: DatabaseManager, path: string, schema?: ZodTypeAny) {
    this.path = path;
    this.#schema = schema;
    this.manager = manager;
  }

  async #makeReq<D>(payload: Payload) {
    if (this.manager.webSocket?.readyState !== WebSocket.OPEN)
      throw new Error("WebSocket connection has already been closed!");

    const request = <Request<D>>{};

    request.promise = new Promise<D>((resolve, reject) => {
      request.resolve = (arg: D) => resolve(arg);
      request.reject = (err?: Error) => reject(err);
    });

    this.manager.requests.set(payload.requestId, request);
    this.manager.webSocket!.send(JSON.stringify(payload));

    request.timeout = setTimeout(() => request.reject(new Error("Request timed out")), 2500);

    return request.promise;
  }

  #validate(value: T) {
    if (!this.#schema) return;
    const parse = this.#schema.safeParse(value);
    if (!parse.success) throw new Error(JSON.stringify(parse.error, null, 2));
  }

  async has(key: string) {
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return !!(await this.get(key));
  }

  async get(key: string) {
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return this.#makeReq<T | null>({ requestId: randomUUID(), path: this.path, method: "GET", key });
  }

  async getMany(keys: string[]) {
    if (!Array.isArray(keys)) throw new Error("Keys must be of type string[]");
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      if (!key || typeof key !== "string")
        throw new Error(`At keys[${i}]\n\tExpected : string literal with length > 0\n\tGot : ${key}`);
    }
    return this.#makeReq<(T | null)[]>({ requestId: randomUUID(), path: this.path, method: "GET_MANY", keys });
  }

  async set(key: string, value: T) {
    this.#validate(value);
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return this.#makeReq<T>({ requestId: randomUUID(), path: this.path, method: "SET", key, value });
  }

  async setMany(data: { key: string; value: T }[]) {
    if (!Array.isArray(data)) throw new Error("Data must be of type {key: string, value: T}[]");
    for (let i = 0; i < data.length; i++) {
      const element = data[i]!;
      if (!("key" in element && "value" in element))
        throw new Error(`At data[${i}]\n\tExpected : {key: string, value: T}\n\tGot : ${element}`);
      if (typeof element.key !== "string" || !element.key)
        throw new Error(`At data[${i}].key\n\tExpected : string literal with length > 0\n\tGot : ${element.key}`);
      try {
        this.#validate(element.value);
      } catch (e) {
        throw new Error(`At data[${i}].value\n\tExpected : T\n\tGot : ${element.value}\n${e}`);
      }
    }
    return this.#makeReq<T[]>({ requestId: randomUUID(), path: this.path, method: "SET_MANY", data });
  }

  async delete(key: string) {
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return this.#makeReq<boolean>({ requestId: randomUUID(), path: this.path, method: "DELETE", key });
  }

  async deleteMany(keys: string[]) {
    if (!Array.isArray(keys)) throw new Error("Keys must be of type string[]");
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      if (!key || typeof key !== "string")
        throw new Error(`At keys[${i}]\n\tExpected : string literal with length > 0\n\tGot : ${key}`);
    }
    return this.#makeReq<boolean[]>({ requestId: randomUUID(), path: this.path, method: "DELETE_MANY", keys });
  }

  async all() {
    return this.#makeReq<{ [key: string]: T }>({ requestId: randomUUID(), path: this.path, method: "ALL" });
  }
}
