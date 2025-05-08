import {Dataframe} from '../src/api/language';

/* Testing code */

function test(df: Dataframe<{ id: number, name: string, zz: boolean }>) {

    df.choose(['id', 'zz']).columns()

    function test_transform<T extends { id: number }>(x: T) { return x.id + 1 }
    const count = 3;

    count.toLocaleString().repeat(3*(1+2));

    const df2 = df
        .augment({
            id2: test_transform,
            n0: x => x.name,
            mystr: x => x.name.repeat(count)
        })
        .choose(['id2', 'n0', 'mystr', 'zz'])
    
        .augment((() => {
            const w = 7;
            return {
                derived: x => x.mystr.lastIndexOf('g'),
                n: x => w // requiring unique column names broke this haha yes perfect
            };
        })())
        .augment({
            test: x => x.n * 0 as 0,
            n1: x => '' // If you use an existing name it doesn't work! Yay
        })
    ;
    
    df2.columns();
    test_transform(df2.augment({ id: x => 1 }).columns()); // only permitted with fields of the expected name and type

    df2.whereEq('n', 1).columns(); // type of n is now literal '1'
    df2.where(x => x.n == 1 && x.mystr.endsWith('.xlsx')).columns(); // column schema is unchanged

    df.augment({ id2: x => x.id, mystr: x => '' }).joinOn(df2, 'id2').columns();
    df.join(df2, 'id', 'test').columns();

    function test_table_transform<T extends { id?: number, id2?: number }>(df: T) {
        return {
            //id: df.id !== undefined ? df.id : -1, // TODO: ConditionalExpression
            //id2: df.id2 !== undefined ? df.id2 : '',
            //...df // TODO: SpreadAssignment
        }
    }

    //df.as(test_table_transform).columns(); // works! // lol nope
    
}