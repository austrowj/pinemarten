// Types for keeping track of dataframe schema changes.

export type KeyOfType<T, R> = string & keyof {[P in keyof T as T[P] extends R ? P : never]: T[P]}

// New type that _only_ performs renaming.
export type Rename<T, S extends {[K in keyof S]: keyof T}> = 
    & Omit<T, 
        | S[keyof S] // Exclude the original of each renamed column.
        | keyof S    // Also have the new column win any name collisions.
    >
    & { [K in keyof S]: T[S[K]] }; // Add the new column names.

// Type for dplyr select().
export type Reshape<
    T, // the source table
    Rename extends { [Field in keyof Rename]: keyof T } = {}, // new names as object keys and original names as values
    Select extends keyof T = never, // union of verbatim fields
> =
    & { [Field in keyof Rename]: T[Rename[Field]] }
    & { [K in Select]: T[K]};

// Type for dplyr mutate().
export type Mutate<
    T, // input table
    N extends string, // result name(s), probably should just permit a single literal
    R, // result type
> = 
    & Omit<T, N> // if any result names are already on the table, replace them
    & {[P in N]: R};

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