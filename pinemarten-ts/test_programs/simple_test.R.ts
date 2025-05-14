import { Dataframe } from '../src/api/language';

function foo(df: Dataframe<{id: number, name: string, stuff: Dataframe<string>}>) {
    const z = 3;
    const f = (x: { a: number }) => x.a + z;
    const result = df
        .rename({myid: 'name'})
        .augment('test', f, {a: 'id'})
        .augment('test2', f, {a: 'test'})
        .columns().stuff
        .choose(['charAt', 'concat', 'endsWith'])
        .augment('myresult',
            (x: {count: () => any}) => x.count.name, {count: 'concat'}
        )
        .columns()
    ;

    function addOneToID<T extends {id: number}>(x: T) { return x.id + 1; }

    //df.augment_bad({my_field: addOneToID}).columns();
}
