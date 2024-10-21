import { RDataFrame } from './rlang/dataframe'
import { REnvironment, RSymbolTable } from './rlang/environment'
import { RExpression } from './rlang/expparse'

import { KeyOfType, Reshape, Mutate, Join, Where, WhereEq } from './schema_operations'
import { ProgramNode, PlaintextNode, ReferenceNode, JoinNode, SelectNode, WhereNode, MutateNode, AssignNode } from './ast'

// Idea for these classs:
// You create a fresh dataframe with a target schema.
// Then, you can only mutate new columns in the target, or join with tables that have columns in the target.
// The class will keep track of what fields are remaining.

/*
    Incoming design narrative:
    
    It's awkward to continually declare new environments to work with.
    Worse, there's the potential to get environments out of sync because the js runtime is completely independent
    of the R runtime.
    So, as a potential solution, let's explore writing the entire R program as a chain of function calls.
    This class will act as a state machine, with the execution state recorded via types.

    We may be able to get by with just three states:
        1) Neutral
        2) Working on the goal dataframe transform
        3) Working on a supporting dataframe transform
    
    Working on Goal actions:
        - Add new fields from the remaining ones using mutate
            => Working on Goal with updated schema and remainder
        - Join (somehow, TODO)
        - Rebind progress to environment
            => Neutral with updated environment
*/

/*
    Neutral actions:
        - Load an external dataset
            => Neutral with updated environment
        - Set a working dataframe
            => Working on a dataframe (goal or supporting) in the existing environment
        - Export the goal dataframe
            => Same state (MAYBE exit?)
*/
export class Workbench<E extends RSymbolTable, T, U, R> {
    public readonly schema = {} as T // the current progress
    public readonly universe = {} as U // the universe of goal fields
    public readonly remaining = {} as R // the remaining fields

    public static fresh<U>() {
        return new Workbench<{}, {}, U, U>(REnvironment.fresh())
    }

    // Load an external dataframe, bind it to the given symbol, and return the new workbench state.
    // TODO: fix having to specify the name twice
    public loadDF<K extends string, Schema>(symbolName: K, datasetName: `"${string}"`) {

        return ( // Buckle up, we are gonna be using a lot of partials over the generic types
            <NewE extends RSymbolTable>(env: REnvironment<NewE>) =>
                new Workbench<NewE, T, U, R>(env)
        )(
            this.env.bindSymbol(symbolName, new RDataFrame<Schema>(
                new ReferenceNode(`load_sdtm(${datasetName})`)
            ))
        )
    }

    // Pick one of the current symbols to work from
    public createSupportDF(fromDF: string & keyof E) {
        return (
            <A>(df: RDataFrame<A>) => new SupportWorkbench<E, T, U, R, A>(this.env, df)
        )(this.env.resolveSymbol(fromDF))
    }

    //TODO
    public save() {}

    private constructor(
        public readonly env: REnvironment<E>, // the available symbols
    ) { }
}

/*
    Working on Support actions:
        - Any dataframe operation, accessing any parameter dataframe via the environment name it is bound to.
            => Working on Support with updated dataframe
        - Bind (or rebind) progress to environment
            => Neutral with updated environment
*/
class SupportWorkbench<E extends RSymbolTable, T, U, R, A> {
    public readonly schema = {} as T // the current progress
    public readonly universe = {} as U // the universe of target fields
    public readonly remaining = {} as R // the remaining fields
    public readonly active = {} as A // the schema of the active table

    public constructor(
        private env: REnvironment<E>, // the available symbols
        private df = new RDataFrame<A>() // the active dataframe
    ) { } 
}

export class DFWorkbench<E extends RSymbolTable, T, U, R> {
    public schema = {} as T // the current progress
    public universe = {} as U // the universe of target fields
    public remaining = {} as R // the remaining fields

    public static fresh<U>() {
        return new DFWorkbench<{}, {}, U, U>(REnvironment.fresh(), new RDataFrame<{}>())
    }

    public static fromPredecessors<U>() {
        return <P>(schema: RDataFrame<U extends P ? P : never>) => this.fresh<U>().update(schema)
    }

    private constructor(
        private env: REnvironment<E>, // the available symbols
        private df = new RDataFrame<T>(), // the 
        private activeDF?: RDataFrame<any>
    ) { }

    public update<S>(df: RDataFrame<S>) {
        return new DFWorkbench<E, S, U, Omit<U, keyof S>>(this.env, df)
    }

    // Function to construct mutators for the different types.
    // I couldn't figure out how to make the return type generic :<
    //
    // This function (and mutateR below) returns a callback so you have to call it like:
    //      df.mutate<TYPE>()('name of new column', 'name of source column', 'arbitrary R expression')
    public mutate<V>() {
        return <
            N extends KeyOfType<R, V>,
            E extends string
        >(
            name: N,
            transform: E & RExpression<T, E, V>
        ) => 
            this.update(
                this.df.then<Mutate<T, N, V>>(new MutateNode(
                    name, transform
                ))
            )
    }

    // Escape hatch for writing arbitrary R code in mutates.
    // You provide the type of column created manually, and the code inside will not be type checked.
    // The optional type argument is the type of column to start with, so the static analyzer can still
    // provide a little help if desired.
    // WARNING: this permits code injection attacks :<
    public mutateR<V, From = unknown>() {
        return <
            N extends string & keyof R
        >(
            name: N,
            source: KeyOfType<T, From>,
            code: string
        ) =>
            this.update(
                this.df.then<Mutate<T, N, V>>(new MutateNode(name, `${source} |> ${code}`))
            )
    }

    public join_on<S extends string & keyof E, L extends string & keyof (T | S)>(joinTable: S, key: L, kind: string = 'left') {
        const other = this.env.resolveSymbol(joinTable)
        return this.update(
            other.then<Join<T, S, L>>(
                new JoinNode(kind, other.derivation, `${key}`)
            )
        )
    }

    /*
    public join<S, L extends string & keyof T, R extends string & keyof S>(other: RDataFrame<S>, leftKey: L, rightKey: R, kind: JoinType = 'left') {
        return this.then<Join<T, S>>(
            new JoinNode(kind, other.derivation, `${leftKey} == ${rightKey}`)
        )
    }
    */
}
