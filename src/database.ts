/** @format */

import { randomUUID } from "node:crypto";

import type { z } from "zod";
import type * as Types from "./types.js";
import type { DatabaseManager } from "./databaseManager.js";

export class Database<T> {
  path: string;
  #schema?: z.ZodType;
  manager: DatabaseManager;

  constructor(manager: DatabaseManager, path: string, schema?: z.ZodType) {
    this.path = path;
    this.#schema = schema;
    this.manager = manager;
  }

  async #makeReq<D>(PL: Types.RawPayload) {
    if (this.manager.webSocket?.readyState !== WebSocket.OPEN)
      throw new Error("WebSocket connection has already been closed!");

    const request = <Types.Request<D>>{};
    const requestId = randomUUID();

    request.promise = new Promise<D>((resolve, reject) => {
      request.resolve = (arg: D) => resolve(arg);
      request.reject = (err?: Error) => reject(err);
    });

    this.manager.requests.set(requestId, request);
    this.manager.webSocket!.send(JSON.stringify({ ...PL, requestId, path: this.path } satisfies Types.Payload));

    request.timeout = setTimeout(() => {
      this.manager.requests.delete(requestId);
      request.reject(new Error("Request timed out"));
    }, 2500);

    return request.promise;
  }

  #validateValueSchema(value: unknown) {
    if (!this.#schema) return;
    const parse = this.#schema.safeParse(value);
    if (!parse.success) throw new Error(JSON.stringify(parse.error, null, 2));
  }

  #validateKey<X extends boolean = true>(key: unknown): void;
  #validateKey<X>(key: unknown, shouldThrow?: X): X extends true ? void : boolean;
  #validateKey(key: unknown, shouldThrow = true) {
    if (!key || typeof key !== "string" || key.length === 0 || key.length > 255)
      if (shouldThrow) throw new Error("Key must be of type string with length > 0 and < 255");
      else return false;
    else return true;
  }

  #validateArrayOfKeys(keys: unknown) {
    if (!Array.isArray(keys)) throw new Error("Keys must be of type string[]");

    for (const key of keys)
      if (!this.#validateKey(key, false))
        throw new Error(
          `Invalid key found @ keys[${keys.indexOf(key)}]\n` +
            `Expected : string literal with length > 0 < 255\n` +
            `Got : ${key}`
        );
  }

  async all() {
    return this.#makeReq<{ [key: string]: T }>({ method: "ALL" });
  }

  async has(key: string) {
    this.#validateKey(key);
    return this.#makeReq<boolean>({ method: "HAS", key });
  }

  async get(key: string) {
    this.#validateKey(key);
    return this.#makeReq<T | null>({ method: "GET", key });
  }

  async delete(key: string) {
    this.#validateKey(key);
    return this.#makeReq<boolean>({ method: "DELETE", key });
  }

  async set(key: string, value: T) {
    this.#validateKey(key);
    this.#validateValueSchema(value);
    return this.#makeReq<T>({ method: "SET", key, value });
  }

  async deleteMany(keys: string[]) {
    this.#validateArrayOfKeys(keys);
    return this.#makeReq<boolean[]>({ method: "DELETE_MANY", keys });
  }

  async getMany(keys: string[]) {
    this.#validateArrayOfKeys(keys);
    return this.#makeReq<(T | null)[]>({ method: "GET_MANY", keys });
  }

  async setMany(data: { key: string; value: T }[]) {
    if (!Array.isArray(data)) throw new Error("Data must be of type {key: string, value: T}[]");

    for (const element of data) {
      if (!element || !("key" in element && "value" in element))
        throw new Error(`At data[${data.indexOf(element)}]\n\tExpected : {key: string, value: T}\n\tGot : ${element}`);

      if (!this.#validateKey(element.key, false))
        throw new Error(
          `Invalid key found @ data[${data.indexOf(element)}]\n` +
            `Expected : string literal with length > 0 < 255\n` +
            `Got : ${element.key}`
        );

      try {
        this.#validateValueSchema(element.value);
      } catch (e) {
        throw new Error(
          `Invalid value found @ data[${data.indexOf(element)}].value\n` +
            `Expected : T\n` +
            `Got : ${element.value}\n` +
            `Error : \n${e}`
        );
      }
    }

    return this.#makeReq<T[]>({ method: "SET_MANY", data });
  }

  pop = <Types.PopMethod<T>>(async (key: string) => {
    this.#validateKey(key);
    return this.#makeReq({ method: "POP", key });
  });

  shift = <Types.ShiftMethod<T>>(async (key: string) => {
    this.#validateKey(key);
    return this.#makeReq({ method: "SHIFT", key });
  });

  push = <Types.PushMethod<T>>(async (key: string, value: T) => {
    this.#validateKey(key);
    this.#validateValueSchema([value]);
    return this.#makeReq({ method: "PUSH", key, value });
  });

  unshift = <Types.UnshiftMethod<T>>(async (key: string, value: T) => {
    this.#validateKey(key);
    this.#validateValueSchema([value]);
    return this.#makeReq({ method: "UNSHIFT", key, value });
  });

  slice = <Types.SliceMethod<T>>(async (key: string, start: number, end?: number) => {
    this.#validateKey(key);
    if (!Number.isInteger(start)) throw new Error("Start must be an integer");
    if (end && !Number.isInteger(end)) throw new Error("End must be an integer");
    return this.#makeReq<T | null>({ method: "SLICE", key, start, end });
  });
}
