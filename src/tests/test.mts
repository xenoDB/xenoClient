/** @format */

import z from "zod";
import { DatabaseManager } from "../index.js";

const manager = new DatabaseManager("ws://localhost:8080", "hello");

await manager.connect();

manager.on("error", (err) => console.error(err));
manager.on("disconnected", (address) => console.log(`Disconnected from ${address}`));

const db = manager.createDatabase("test", z.number());

const count = 1e2;

console.time("set");
for (let i = 0; i < count; ++i) await db.set(i.toString(), i);
console.timeEnd("set");

console.time("get");
for (let i = 0; i < count; ++i) await db.get(i.toString());
console.timeEnd("get");

console.time("delete");
for (let i = 0; i < count; ++i) await db.delete(i.toString());
console.timeEnd("delete");

console.time("setMany");
await db.setMany(Array.from({ length: count }).map((_, i) => ({ key: i.toString(), value: i })));
console.timeEnd("setMany");

console.time("getMany");
await db.getMany(Array.from({ length: count }).map((_, i) => i.toString()));
console.timeEnd("getMany");

console.time("deleteMany");
await db.deleteMany(Array.from({ length: count }).map((_, i) => i.toString()));
console.timeEnd("deleteMany");

await db.nuke();
