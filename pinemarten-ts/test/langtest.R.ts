import {Dataframe} from '../src/compiler/langdefs';

/* Testing code */

function test(df: Dataframe<{ id: number, name: string, zz: boolean }>) {

    function test_transform<T extends { id: number }>(x: T) { return x.id + 1 }
    const count = 3;

    /*
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
        .with(x => ({ test: x.n * 0 as 0 }))
    ;
    
    df2.schema;
    test_transform(df2.with(x => ({ id: 1 })).schema); // only permitted with fields of the expected name and type

    df2.whereEq('n', 1).schema; // type of n is now literal '1'
    df2.where(x => x.n == 1 && x.mystr.endsWith('.xlsx')).schema; // column schema is unchanged

    df.with(x => ({ id2: x.id, mystr: '' })).join_on(df2, 'id2').schema;
    df.join(df2, 'id', 'test').schema;

    function test_table_transform<T extends { id?: number, id2?: number }>(df: T) {
        return {
            id: df.id !== undefined ? df.id : -1,
            id2: df.id2 !== undefined ? df.id2 : '',
            ...df
        }
    }

    df.as(test_table_transform).schema; // works!
    */
}