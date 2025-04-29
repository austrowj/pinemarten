import { KeyOfType, Reshape, Join, Where, WhereEq } from '../schema_operations'

type Mutate<T, S> =
    & {[Field in Exclude<keyof T, keyof S>]: T[Field]}
    & {[Field in keyof S]: S[Field]}
;

class Dataframe<T> {
    public readonly schema = {} as T;

    /* TODO: this API is not friendly for preserving column schema guarantees. */

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

df2.whereEq('n', 1).schema; // type of n is now literal '1'
df2.where(x => x.n == 1 && x.mystr.endsWith('.xlsx')).schema; // column schema is unchanged

df.with(x => ({id2: x.id, mystr: ''})).join_on(df2, 'id2').schema;
df.join(df2, 'id', 'test').schema;
