/** @format */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export interface ManagerEvents {
  error: [err: Error];
  disconnected: [address: string];
}

export interface BasePayload {
  path: string;
  requestId: string;
}

export type Request<T> = {
  promise: Promise<T>;
  timeout: NodeJS.Timeout;
  resolve: (args: T) => void;
  reject: (err?: Error) => void;
};

export type Payload<T = unknown> = BasePayload &
  (
    | { method: "ALL" }
    | { method: "SET"; key: string; value: T }
    | { method: "GET" | "DELETE" | "HAS"; key: string }
    | { method: "GET_MANY" | "DELETE_MANY"; keys: string[] }
    | { method: "SET_MANY"; data: { key: string; value: T }[] }
  );

export type RawPayload<T = unknown> = Prettify<
  Payload<T> extends infer U ? (U extends any ? Omit<U, keyof BasePayload> : never) : never
>;

export type Response<T = unknown> = { requestId: string; data: T } | { requestId: string; error: string };
