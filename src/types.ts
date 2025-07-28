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
    //-------------------------------------------------------------------------
    | { method: "SET"; key: string; value: T }
    | { method: "GET" | "DELETE" | "HAS"; key: string }
    //-------------------------------------------------------------------------
    | { method: "GET_MANY" | "DELETE_MANY"; keys: string[] }
    | { method: "SET_MANY"; data: { key: string; value: T }[] }
    //-------------------------------------------------------------------------
    | { method: "POP"; key: string }
    | { method: "SHIFT"; key: string }
    //-------------------------------------------------------------------------
    | { method: "PUSH"; key: string; value: T }
    | { method: "UNSHIFT"; key: string; value: T }
    //-------------------------------------------------------------------------
    | { method: "SLICE"; key: string; start: number; end?: number }
  );

export type RawPayload<T = unknown> = Prettify<
  Payload<T> extends infer U ? (U extends any ? Omit<U, keyof BasePayload> : never) : never
>;
export type Response<T = unknown> = { requestId: string; data: T } | { requestId: string; error: string };

export type ArrayElement<T> = T extends (infer U)[] ? U : never;

export type PopMethod<T> = T extends any[]
  ? (key: string) => Promise<{ length: number; element: ArrayElement<T> }>
  : never;

export type ShiftMethod<T> = T extends any[]
  ? (key: string) => Promise<{ length: number; element: ArrayElement<T> }>
  : never;

export type SliceMethod<T> = T extends any[]
  ? (key: string, start: number, end?: number) => Promise<ArrayElement<T>[] | null>
  : never;

export type PushMethod<T> = T extends any[]
  ? (key: string, dataToPush: ArrayElement<T>) => Promise<{ length: number; element: ArrayElement<T> }>
  : never;

export type UnshiftMethod<T> = T extends any[]
  ? (key: string, dataToPush: ArrayElement<T>) => Promise<{ length: number; element: ArrayElement<T> }>
  : never;
