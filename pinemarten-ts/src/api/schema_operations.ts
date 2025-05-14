// Types for keeping track of dataframe schema changes.

export type KeyOfType<T, R> = keyof {[P in keyof T as T[P] extends R ? P : never]: T[P]}

export type Choose<T, Select extends keyof T> =
    { [K in Select]: T[K] };

// New type that _only_ performs renaming.
export type Rename<T, S extends {[K in keyof S]: keyof T}> = 
    (keyof S & keyof T) extends never ? // Not allowed to use the name of an existing column.
                                        // (Well, you are allowed, but the static simulation will assume no further operations are possible.)
        & Omit<T, S[keyof S]>           // Exclude the original of each renamed column.
        & { [K in keyof S]: T[S[K]] }   // Add the new column names.
    : {};

// Restricted version of 'mutate' that only accepts unbound column names.
export type Augment<T, S> =
    keyof S & keyof T extends never ? // No overwriting existing columns.
        & { [K in Exclude<keyof T, keyof S>]: T[K] }
        & { [K in keyof S]: S[K] }
    : {}
;

// Type for dplyr join().
// Supports two types of joins: specify shared key, or an explicitly-named key from each table.
export type Join<T, S, By extends keyof (T | S) = never> =
    & {[b in By]: T[b]} // include any shared keys
    & Omit<T, (keyof S) | By>
    & Omit<S, (keyof T) | By> // include fields that are in only one table
    & { [K in keyof Omit<(T | S), By> & string as `${K}.x`]: S[K] }
    & { [K in keyof Omit<(T | S), By> & string as `${K}.y`]: S[K] }; // rename duplicate fields

// Types for dplyr filter()s.
// This one narrows the actual type of the column to the specified value.
export type WhereEq<T, K extends keyof T, V extends T[K]> = 
    & Omit<T, K>
    & {[P in K]: V};

// General filters don't change the schema.
export type Where<T> = T;