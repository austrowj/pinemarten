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
