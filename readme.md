<!-- @format -->

## Docs for [@xenodb/client](https://github.com/xenodb/xenoclient). To be used with [@xenodb/server](https://github.com/xenodb/xenoserver)

```bash
npm install @xenodb/client
```

```ts
type ConstructorOptions =
  | {
      url: string;
      port: number;
      auth: string;
      secure?: boolean;
    }
  | { url: string; auth: string };
```

```ts
import { DatabaseManager } from "@xenodb/client"; // For ES Module
const { DatabaseManager } = require("@xenodb/client"); // For CommonJS

const manager = new DatabaseManager({
  port: 8080,
  url: "10.254.254.117",
  auth: "YOUR_SECRET_TOKEN"
});

await manager.connect(); // Must be called before creating databases

manager.on("error", (e) => console.error(`${new Date().toLocaleString()} - [Manager] - Error`, e));
manager.on("disconnected", () => console.log(`${new Date().toLocaleString()} - [Manager] - Disconnected`));

const DB = manager.createDatabase("/path/to/storage");
```

> ⚠️ **Important**: Always `await manager.connect()` before calling `createDatabase()`.

## XenoDB supports three modes of data validation:

### 1. No Validation

```ts
const DB = manager.createDatabase("/path/to/storage");
```

### 2. Zod Validation (Runtime)

```ts
import { z } from "zod";

const UserSchema = z.object({
  email: z.string().email(),
  isActive: z.boolean().default(true)
});

const DB = manager.createDatabase("/path/to/storage", UserSchema);
```

### 3. TypeScript Generics (Compile-Time)

```ts
interface User {
  email: string;
  isActive: boolean;
}

const DB = manager.createDatabase<User>("/path/to/storage");
```

## Database Methods

All database operations return Promises and are type-safe.<br>
Promise if not resolved within 60000 ms will be rejected.

```ts
DB<T>.all(): Promise<Record<string, T>>

DB<T>.has(key: string): Promise<boolean>

DB<T>.get(key: string): Promise<T | null>
DB<T>.getMany(keys: string[]): Promise<(T | null)[]>

DB<T>.set(key: string, value: T): Promise<T>
DB<T>.setMany(data: { key: string; value: T }[]): Promise<T[]>

DB<T>.delete(key: string): Promise<boolean>
DB<T>.deleteMany(keys: string[]): Promise<boolean[]>

DB<T = U[]>.pop(key: string): Promise<{ length: number; element: U }>
DB<T = U[]>.shift(key: string): Promise<{ length: number; element: U }>
DB<T = U[]>.push(key: string, value: U): Promise<{ length: number; element: U }>
DB<T = U[]>.slice(key: string, start: number, end?: number): Promise<U[] | null>
DB<T = U[]>.unshift(key: string, value: U): Promise<{ length: number; element: U }>
```

**Issues & Support :** [Discord](https://discord.gg/1st-952570101784281139) | [Github](https://github.com/xenodb/xenoserver)
