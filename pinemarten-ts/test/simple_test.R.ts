import {Dataframe} from '../src/api/language';

function foo(df: Dataframe<{id: number, name: string, stuff: Dataframe<string>}>) {
    const result = df
        .rename({myid: 'name'})
        .columns().stuff
        .choose(['charAt', 'concat', 'endsWith'])
        .columns().endsWith
    ;

    function addOneToID<T extends {id: number}>(x: T) { return x.id + 1; }

    df.addColumn('my_field', addOneToID).columns()
}
