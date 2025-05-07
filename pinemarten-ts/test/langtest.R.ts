import {Dataframe} from '../src/api/language';

/* Testing code */

function test(df: Dataframe<{ id: number, name: string, zz: boolean }>) {

    df.rename({id: 'zz'}).schema

    function test_transform<T extends { id: number }>(x: T) { return x.id + 1 }
    const count = 3;

    count.toLocaleString().repeat(3*(1+2));

    const df2 = df
        .as(x => ({
            id2: test_transform(x),
            n0: x.name,
            mystr: x.name.repeat(count),
            zz: x.zz
        }))
    
        .augment(x => {
            const w = 7;
            return {
                derived: x.mystr.lastIndexOf('g'),
                n: w // requiring unique column names broke this haha yes perfect
            };
        })
        .augment(x => ({ test: x.n * 0 as 0 }))
    ;
    
    df2.columns();
    test_transform(df2.augment(x => ({ id: 1 })).schema); // only permitted with fields of the expected name and type

    df2.whereEq('n', 1).schema; // type of n is now literal '1'
    df2.where(x => x.n == 1 && x.mystr.endsWith('.xlsx')).schema; // column schema is unchanged

    df.augment(x => ({ id2: x.id, mystr: '' })).joinOn(df2, 'id2').schema;
    df.join(df2, 'id', 'test').schema;

    function test_table_transform<T extends { id?: number, id2?: number }>(df: T) {
        return {
            //id: df.id !== undefined ? df.id : -1, // TODO: ConditionalExpression
            //id2: df.id2 !== undefined ? df.id2 : '',
            //...df // TODO: SpreadAssignment
        }
    }

    df.as(test_table_transform).schema; // works!
    
}