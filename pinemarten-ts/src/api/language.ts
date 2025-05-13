import { KeyOfType, Choose, Rename, Augment, Join, Where, WhereEq } from './schema_operations'

// Types that correspond to vectors natively in R.
// Columns that don't use one of these must use an Array.
export type Vector = string | number | boolean;
export type DataframeColumnType<T> = T extends Vector ? T : Array<T>;
export type DataframeColumns<P> = {[p in keyof P]: DataframeColumnType<p>}; // Map an object into its dataframe column types.

// Funky type magic to enable the augment method.
type FunctionMap<T> = { [key: string]: (t: T) => any; };

type ResultMap<T, F extends FunctionMap<T>> = {
    [K in keyof F]: F[K] extends (t: T) => infer R ? R : never;
}

/*  Given a column schema and a function, construct an object that maps the parameters of
    that function to names of columns in the schema with a compatible type.
*/
type FunctionDataBinding<T, F> = 
    F extends (args: infer A) => infer R
        ? {[K in keyof A]: KeyOfType<T, A[K]>}
        : never;

// ReturnType<> at home
type FunctionResultValue<F> =
    F extends (args: infer A) => infer R
        ? R
        : never;

// Problem: cannot infer argument types this way.
// However, if we insist that every function takes a single argument as above, we will have to wrap every native R function.
// A conundrum...
type FunctionArgsObject<T, F> =
    F extends (...args: any) => any ? Parameters<F> : never ;
let test: FunctionArgsObject<never, (x: number) => number>;

export class Dataframe<T> {
    public columns() {return {} as T}; // A way to access the schema that can't be an lvalue.

    /* Strict API that only permits choosing columns, renaming columns, and adding new columns. */

    public choose<S extends keyof T>(names: S[]) {
        return new Dataframe<Choose<T, S>>();
    }

    public rename<S extends {[K in keyof S]: keyof T}>(newNames: S) {
        return new Dataframe<Rename<T, S>>();
    }

    // Permit any function to be 'functor'ed onto the dataframe, but with a very strict parameter binding mechanism.
    // This is clunky as hell to use but should be very safe.
    public augment<N extends string, F>(name: N, fn: F, args: FunctionDataBinding<T, F>) {
        return new Dataframe<Augment<T, { [n in N]: FunctionResultValue<F> }>>();
    }

    // There are a lot of problems with this design, don't use it.
    public augment_bad<F extends FunctionMap<T>, S extends ResultMap<T, F>>(augmentations: F) {
        return new Dataframe<Augment<T, S>>();
    }

    /* Joins */

    public joinOn<S, L extends keyof (T | S) & string>(other: Dataframe<S>, key: L, kind: string = 'left') {
        return new Dataframe<Join<T, S, L>>();
    }

    public join<S, L extends string & keyof T, R extends KeyOfType<S, T[L]>>(other: Dataframe<S>, leftKey: L, rightKey: R, kind: string = 'left') {
        return new Dataframe<Join<T, S>>();
    }

    /* Wheres */
    
    public whereEq<K extends string & keyof T, V extends T[K]>(column: K, value: V) {
        return new Dataframe<WhereEq<T, K, V>>();
    }

    public where(predicate: (t: T) => boolean) {return this;} // completely arbitrary predicate

    // Disallow instantiating for now.
    private constructor() {}
}

// Detect if any columns have missing data.
type AllDefined<T> =
    {[t in keyof T]: T[t] extends undefined ? false : true
    }[keyof T] extends false ? never : T;

// Manufature a dataframe out of an array-of-structs.
// It's an impedance mismatch with R's struct-of-arrays, however:
//  1. We can't enforce equal-length arrays at compile time.
//  2. We *can* enforce that every record has the same fields at compile time.
// R will see the argument as a list of lists; it's probably best not to construct a huge data object this way ;)
// Might be a good candidate for some compiler magic down the line.
export function dataframe<T>(
    data: T extends AllDefined<T> ? T[] : never // Insist that all fields are present in every record.
) {return {} as Dataframe<T>;}

/* Function stubs */
export function ifelse<Y, N>(test: boolean, yes: Y, no: N): Y | N   { return {} as Y | N; }
export function strrep(x: string, times: number):           string  { return {} as string; }
export function print(x: Dataframe<any> | any[] | string):  void    { }
export function paste0(...args: any[]):                     string  { return {} as string; }


/* Decided not to use this stuff but leaving as an example for now. */
type ListedSchema<T> = { [t in keyof T]: T[t][] } // Turn the properties of an object into arrays.
type UnlistedSchema<T> = { [t in keyof T]: T[t] extends (infer U)[] ? U : never }
type ValidatedUnlistedSchema<T> =
    { [t in keyof T]: T[t] extends any[] ? true : false
    }[keyof T] extends false ? never : UnlistedSchema<T>;
