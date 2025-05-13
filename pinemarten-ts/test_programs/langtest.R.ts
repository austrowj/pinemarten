import {Dataframe, strrep, ifelse, fabricate_dataframe, print} from '../src/api/language';

/* Testing code */

function test(df: Dataframe<{ id: number, name: string, zz: boolean }>) {

    df.choose(['id', 'zz']).columns()

    function test_transform(x: { num: number }) { return x.num + 1 }
    const count = 3;

    function isInWindow(x: {p: number, center: number, width: number}) {return 0 - x.width <= x.p - x.center && x.p - x.center <= x.width}
    function getWindowFunction(center: number, width: number) {
        return (x: {p: number}) => isInWindow({p: x.p, center: center, width: width})
    }

    function my_strrep(x: {x: string, times: number}) { return strrep(x.x, x.times); }

    const df2 = df
        .augment('id2', test_transform, {num: 'id'})
        .augment('n0', (x: {name: string}) => x.name, {name: 'name'})
        .augment('mystr', my_strrep, {x: 'n0', times: 'id2'})
        .augment('window', getWindowFunction(180, 30), {p: 'id2'})
        .choose(['window', 'id2', 'n0', 'mystr', 'zz'])
    
        .augment('seven', ((w: number) => {
            return (x: {}) => w;
        })(6), {})
        .augment('test', (x: {n: number}) => x.n * 0 as 0, {n: 'seven'})
        .augment('n1', (x: {text: string, test: boolean}) => ifelse(x.test, '', x.text), {text: 'mystr', test: 'zz'})
        .whereEq('zz', false)
    ;
    
    df2.columns();
    //test_transform(df2.augment_bad({ id: x => 1 }).columns()); // only permitted with fields of the expected name and type

    /*
    df2.whereEq('n', 1).columns(); // type of n is now literal '1'
    df2.where(x => x.n == 1 && x.mystr.endsWith('.xlsx')).columns(); // column schema is unchanged

    df.augment_bad({ id2: x => x.id, mystr: x => '' }).joinOn(df2, 'id2').columns();
    df.join(df2, 'id', 'test').columns();
    */

    function test_table_transform<T extends { id?: number, id2?: number }>(df: T) {
        return {
            //id: df.id !== undefined ? df.id : -1, // TODO: ConditionalExpression
            //id2: df.id2 !== undefined ? df.id2 : '',
            //...df // TODO: SpreadAssignment
        }
    }

    //df.as(test_table_transform).columns(); // works! // lol nope
    return df2;
}

const df = fabricate_dataframe([
    {id: 1, name: "foo", zz: false},
    {id: 2, name: "hello", zz: true},
    {id: 7, name: "bar", zz: true},
    {zz: true, id: 999, name: "world"}
]);
print(df);

const result = test(df);
print(result);

const list_df = fabricate_dataframe([
    {num: 3, words: ['goodbye', 'arrivederci', 'sayounara']},
    {num: 2, words: ['foo', 'bar']}
]);
print(list_df);
