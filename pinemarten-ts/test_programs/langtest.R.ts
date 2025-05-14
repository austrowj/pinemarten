export {}; // Apparently required to not share block scope.
import { Dataframe, strrep, ifelse, fabricate_dataframe, print } from '../src/api/language';
import { KeyOfType } from '../src/api/schema_operations';

function test(df: Dataframe<{ id: number, name: string, zz: boolean }>) {

    // Test demonstrating difficulties with passing key names as parameters.
    function mytest<T, K extends keyof T>(df: Dataframe<T>, key: K, val: T[K]) {
        const t = df
            //.augment('myval', (x: {a: K}) => x.a, {a: key})
            .rename({myval: key})
            //.choose(['myval']) // This is bugged now that rename() failure sets schema to empty instead of never.
            //.narrow('myval', val);
        ;
        return t;
    }
    print('Results of mytest:');
    print(mytest(df, 'name', ''));

    df.choose(['id', 'zz']).columns()

    function test_transform(x: { num: number }) { return x.num + 1 }
    const count = 3;

    function isInWindow(x: {p: number, center: number, width: number}) {return 0 - x.width <= x.p - x.center && x.p - x.center <= x.width}
    function getWindowFunction(center: number, width: number) {
        return (x: {p: number}) => isInWindow({p: x.p, center: center, width: width})
    }

    function my_strrep(x: {x: string, times: number}) { return strrep(x.x, x.times); }

    type Core = {id2: number, window: boolean, mystr: string, zz: boolean};

    function doAllTransforms(x: {num: number, name: string, x: string, times: number, p: number}) { return {
        id2: test_transform(x),
        n0: x.name,
        mystr: my_strrep(x),
        window: getWindowFunction(1010, 30)(x)
    };}

    // Asserting the type helps head off "Instantiation is excessively deep" compiler error.
    const df2 //: Dataframe<Core & { n0: string }>
        = df
        //.augment('id2', test_transform, {num: 'id'})
        //.augment('n0', (x: {name: string}) => x.name, {name: 'name'})
        //.augment('mystr', my_strrep, {x: 'n0', times: 'id2'})
        //.augment('window', getWindowFunction(180, 30), {p: 'id2'})
        .expand(doAllTransforms, {num: 'id', name: 'name', x: 'name', times: 'id', p: 'id'})
        .choose(['window', 'id2', 'n0', 'mystr', 'zz'])
    
        .augment('seven', ((w: number) => {
            return (x: {}) => w;
        })(6), {})
        .augment('test', (x: {n: number}) => x.n * 0 as 0, {n: 'seven'})
        .augment('n1', (x: {text: string, test: boolean}) => ifelse(x.test || x.text == 'foofoo', '', x.text), {text: 'mystr', test: 'zz'})
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

    function sub1(x: {num: number}) { return x.num-1; }
    const df3 = df2
        //.augment('id', sub1, { num: 'id2' })
        .rename({ id: 'id2' })
        //.choose(['id', 'blah']);
    print('Join test: ');
    print(df.leftjoin(df3, ['id']))

    //df.as(test_table_transform).columns(); // works! // lol nope
    return df2;
}

const df = fabricate_dataframe([
    {id: 1, name: "foo", zz: false},
    {id: 2, name: "hello", zz: true},
    {id: 3, name: "bar", zz: true},
    {zz: true, id: 999, name: "world"}
]);
print(df);

const result = test(df);
print(result);
print(result.narrow('zz', false));

const list_df = fabricate_dataframe([
    {num: 3, words: ['goodbye', 'arrivederci', 'sayounara']},
    {num: 2, words: ['foo', 'bar']}
]);
print(list_df);
