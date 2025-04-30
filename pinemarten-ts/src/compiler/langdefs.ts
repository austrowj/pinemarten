import { KeyOfType, Reshape, Join, Where, WhereEq } from '../schema_operations'

type Mutate<T, S> =
    & {[Field in Exclude<keyof T, keyof S>]: T[Field]}
    & {[Field in keyof S]: S[Field]}
;

class Dataframe<T> {
    public readonly schema = {} as T;

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
    
    /*
        Selects *all* columns and the specified new ones.
        Can include arbitrary expressions involving existing columns.
    */
    public with<S>(mutator: (t: T) => S) {
        return new Dataframe<Mutate<T, S>>();
    }

    /* Joins */

    public join_on<S, L extends keyof (T | S) & string>(other: Dataframe<S>, key: L, kind: string = 'left') {
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
}

/* Testing code */

const df = new Dataframe<{id: number, name: string, zz: boolean}>();

function test_transform<T extends {id: number}>(x: T) {return x.id + 1}
const count = 3;

const df2 = df
    .as(x => ({
        id2: test_transform(x),
        n: x.name,
        mystr: x.name.repeat(count),
        zz: x.zz
    }))
    .with(x => {
        const w = 7;
        return {
            derived: x.mystr.lastIndexOf('g'),
            n: w
        };
    })
    .with(x => ({test: x.n * 0 as 0}))
;
df2.schema;
test_transform(df2.with(x => ({id: 1})).schema); // only permitted with fields of the expected name and type

df2.whereEq('n', 1).schema; // type of n is now literal '1'
df2.where(x => x.n == 1 && x.mystr.endsWith('.xlsx')).schema; // column schema is unchanged

df.with(x => ({id2: x.id, mystr: ''})).join_on(df2, 'id2').schema;
df.join(df2, 'id', 'test').schema;

function test_table_transform<T extends {id?: number, id2?: number}>(df: T) {
    return {
        id: df.id !== undefined ? df.id : -1,
        id2: df.id2 !== undefined ? df.id2 : '',
        ...df
    }
}

df.as(test_table_transform).schema; // works!
