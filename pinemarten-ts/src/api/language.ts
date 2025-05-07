import { KeyOfType, Choose, Rename, AddColumn, Augment, Join, Where, WhereEq } from './schema_operations'

export class Columns<T> {
    public readonly col = {} as T;

    public ref<K extends keyof T>(key: K): T[K] {
        return {} as T[K];
    }

    constructor(s: T) {}
}

export class Dataframe<T> {
    public readonly schema = {} as T;
    public columns() {return {} as T};

    /* Strict API that only permits choosing columns, renaming columns, and adding new columns. */

    public choose<S extends keyof T>(names: S[]) {
        return new Dataframe<Choose<T, S>>();
    }

    public rename<S extends {[K in keyof S]: keyof T}>(newNames: S) {
        return new Dataframe<Rename<T, S>>();
    }

    public addColumn<N extends string, R>(name: N, compute: (t: T) => R) {
        return new Dataframe<AddColumn<T, N, R>>()
    }

    // It's okay to accept a completely arbitrary function, provided there are no name collisions.
    public augment<S>(augmentation: (t: T) => S) {
        return new Dataframe<Augment<T, S>>();
    }

    public augmentColumns<S>(augmentation: (t: Columns<T>) => Columns<S>) {
        return new Dataframe<Augment<T, S>>();
    }

    /* TODO: this API is not friendly for preserving column schema guarantees. */

    /*
        Both 'as' and 'with' compile into a mutate call, which means their argument has to be translated to a
        dplyr data-mask by the compiler.
        Current idea: compiler will accept only a very specific AST head:
            - Arrow function
            - Single argument
            - Body is exactly a parenthesized expression containing an object literal, and nothing else
            - Compiler will replace references to the argument using the ".data" syntax
        This means that named functions can't be used even though it results in valid Typescript :/ but a
        function that accepts a Dataframe and calls "as"/"with" on it is okay.
        
        I guess this behavior matches that you cannot pass "mutate" a function that returns a data-mask.
    */

    /*
        Selects *only* the specified columns.
        Can include arbitrary expressions involving existing columns.
    */
    public as<S>(selector: (t: T) => S) {
        return new Dataframe<S>();
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

export type AnyDataframe = Dataframe<any>;
