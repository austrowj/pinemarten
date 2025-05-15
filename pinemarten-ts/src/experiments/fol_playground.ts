export { };

const Subjects = Symbol();
const SubjectVisits = Symbol();

type Cardinality = 0 | 1 | 'many';

type Groups<T> = {
    [reference: symbol]: {
        columns: keyof T,
        cardinality: Cardinality
    },
    [other: string | number]: never
}

type Select<T, G extends Groups<T>, Selection extends keyof T> = {
    columns: {[t in Selection]: T[t]},
    groups: {
        [g in keyof G & symbol]:
            G[g]['columns'] extends G[g]['columns'] & Selection
                ? G[g]
            : G[g]['columns'] & Selection extends never
                ? never
            : G[g]['cardinality'] extends 1 | 'many'
                ? {
                    columns: G[g]['columns'] & Selection,
                    cardinality: 'many'
                }
            : never
    }
};

type MyTable = {id: number, visit: string, onTime: boolean};
type MyTableGroups = {
    [Subjects]: {columns: 'id', cardinality: 'many'},
    [SubjectVisits]: {columns: 'id' | 'visit', cardinality: 1}
}

type x = Select<MyTable, MyTableGroups, 'id' | 'visit'>;
type y = Select<MyTable, MyTableGroups, 'id' | 'onTime'>;
type z = Select<MyTable, MyTableGroups, 'visit'>;
type w = Select<MyTable, MyTableGroups, 'onTime'>;
