/** @format */

import { randomUUID } from "node:crypto";

import type { z } from "zod";
import type { DatabaseManager } from "./databaseManager.js";
import type { Payload, RawPayload, Request } from "./types.js";

export class Database<T> {
  path: string;
  #schema?: z.ZodType;
  manager: DatabaseManager;

  constructor(manager: DatabaseManager, path: string, schema?: z.ZodType) {
    this.path = path;
    this.#schema = schema;
    this.manager = manager;
  }

  async #makeReq<D>(PL: RawPayload) {
    if (this.manager.webSocket?.readyState !== WebSocket.OPEN)
      throw new Error("WebSocket connection has already been closed!");

    const request = <Request<D>>{};
    const requestId = randomUUID();

    request.promise = new Promise<D>((resolve, reject) => {
      request.resolve = (arg: D) => resolve(arg);
      request.reject = (err?: Error) => reject(err);
    });

    this.manager.requests.set(requestId, request);
    this.manager.webSocket!.send(JSON.stringify({ ...PL, requestId, path: this.path } satisfies Payload));

    request.timeout = setTimeout(() => {
      this.manager.requests.delete(requestId);
      request.reject(new Error("Request timed out"));
    }, 2500);

    return request.promise;
  }

  #validate(value: T): void {
    if (!this.#schema) return;
    const parse = this.#schema.safeParse(value);
    if (!parse.success) throw new Error(JSON.stringify(parse.error, null, 2));
  }

  async all(): Promise<{ [key: string]: T }> {
    return this.#makeReq<{ [key: string]: T }>({ method: "ALL" });
  }

  async has(key: string): Promise<boolean> {
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return this.#makeReq<boolean>({ method: "HAS", key });
  }

  async get(key: string): Promise<T | null> {
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return this.#makeReq<T | null>({ method: "GET", key });
  }

  async set(key: string, value: T): Promise<T> {
    this.#validate(value);
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return this.#makeReq<T>({ method: "SET", key, value });
  }

  async delete(key: string): Promise<boolean> {
    if (!key || typeof key !== "string") throw new Error("Key must be of type string with length > 0");
    return this.#makeReq<boolean>({ method: "DELETE", key });
  }

  async getMany(keys: string[]): Promise<(T | null)[]> {
    if (!Array.isArray(keys)) throw new Error("Keys must be of type string[]");

    for (const key of keys)
      if (!key || typeof key !== "string")
        throw new Error(`At keys[${keys.indexOf(key)}]\n\tExpected : string literal with length > 0\n\tGot : ${key}`);

    return this.#makeReq<(T | null)[]>({ method: "GET_MANY", keys });
  }

  async deleteMany(keys: string[]): Promise<boolean[]> {
    if (!Array.isArray(keys)) throw new Error("Keys must be of type string[]");

    for (const key in keys)
      if (!key || typeof key !== "string")
        throw new Error(`At keys[${keys.indexOf(key)}]\n\tExpected : string literal with length > 0\n\tGot : ${key}`);

    return this.#makeReq<boolean[]>({ method: "DELETE_MANY", keys });
  }

  async setMany(data: { key: string; value: T }[]): Promise<T[]> {
    if (!Array.isArray(data)) throw new Error("Data must be of type {key: string, value: T}[]");

    for (const element of data) {
      if (!element || !("key" in element && "value" in element))
        throw new Error(`At data[${data.indexOf(element)}]\n\tExpected : {key: string, value: T}\n\tGot : ${element}`);

      if (typeof element.key !== "string" || !element.key)
        throw new Error(
          `At data[${data.indexOf(element)}].key\n\tExpected : string literal with length > 0\n\tGot : ${element.key}`
        );

      try {
        this.#validate(element.value);
      } catch (e) {
        throw new Error(`At data[${data.indexOf(element)}].value\n\tExpected : T\n\tGot : ${element.value}\n${e}`);
      }
    }

    return this.#makeReq<T[]>({ method: "SET_MANY", data });
  }
}
