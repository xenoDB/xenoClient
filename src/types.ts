/** @format */

export interface ChildEvents {
  error: [err: Error];
  disconnected: [address: string];
}

export type Request<T> = {
  promise: Promise<T>;
  timeout: NodeJS.Timeout;
  resolve: (args: T) => void;
  reject: (err?: Error) => void;
};

export type Payload<T = unknown> =
  | { path: string; requestId: string; method: "ALL" }
  | { path: string; requestId: string; method: "SET"; key: string; value: T }
  | { path: string; requestId: string; method: "GET" | "DELETE"; key: string }
  | { path: string; requestId: string; method: "GET_MANY" | "DELETE_MANY"; keys: string[] }
  | { path: string; requestId: string; method: "SET_MANY"; data: { key: string; value: T }[] };

export type Response<T = unknown> = { requestId: string; data: T } | { requestId: string; error: string };
