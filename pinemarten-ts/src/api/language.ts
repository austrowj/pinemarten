import { KeyOfType, Choose, Rename, Augment, Join, Where, WhereEq } from './schema_operations'

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

// Test the data binding type
function foo(x: {a: number, b: string}) {return x.b.repeat(x.a);}
(df: Dataframe<{id: number, name: string, zz: number}>) => {
    df.augment2(foo, {a: 'zz', b: 'name'})
}

export class Dataframe<T> {
    public columns() {return {} as T}; // A way to access the schema that can't be an lvalue.

    /* Strict API that only permits choosing columns, renaming columns, and adding new columns. */

    public choose<S extends keyof T>(names: S[]) {
        return new Dataframe<Choose<T, S>>();
    }

    public rename<S extends {[K in keyof S]: keyof T}>(newNames: S) {
        return new Dataframe<Rename<T, S>>();
    }

    // It's okay to accept completely arbitrary functions, provided there are no name collisions.
    // This is implemented on the backend by dplyr mutate, which ensures the rows are untouched.
    public augment<F extends FunctionMap<T>, S extends ResultMap<T, F>>(augmentations: F) {
        return new Dataframe<Augment<T, S>>();
    }

    public augment2<F>(fn: F, args: FunctionDataBinding<T, F>) {}

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
