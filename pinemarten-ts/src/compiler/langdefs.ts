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
}

/* Testing code */

const df = new Dataframe<{id: number, name: string}>();

function test_transform<T extends {id: number}>(x: T) {return x.id + 1}
const count = 3;

const df2 = df
    .as(x => ({
        id2: test_transform(x),
        n: x.name,
        mystr: x.name.repeat(count)
    }))
    .with(x => ({
        derived: x.mystr.lastIndexOf('g'),
        n: 1
    }))
    .with(x => ({test: x.n * 0 as 0}))
;

df2.schema;
