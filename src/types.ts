export type ObjectPaths<T> = T extends (infer U)[]
  ? U extends object
    ? {
        [K in keyof U]: [number, K, ...ObjectPaths<U[K]>];
      }[keyof U]
    : []
  : T extends object
  ? {
      [K in keyof T]: [K, ...ObjectPaths<T[K]>];
    }[keyof T]
  : [];

export type Prefixes<T> = T extends []
  ? readonly []
  : T extends [infer U]
  ? readonly [U]
  : T extends [infer U, ...infer Rest]
  ? readonly [U] | readonly [U, ...Prefixes<Rest>]
  : never;

export type IsPrefix<Prefix, Paths> = Prefix extends Prefixes<Paths>
  ? Prefix
  : never;

export type Rest<Prefix, Path> = Prefix extends readonly []
  ? Path
  : Prefix extends readonly [infer U, ...infer PrefixRest]
  ? Path extends readonly [infer T, ...infer PathRest]
    ? U extends T
      ? T extends U
        ? Rest<PrefixRest, PathRest>
        : never
      : never
    : never
  : never;
