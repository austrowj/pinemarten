import { RExpression } from './expparse'

type KeyWithType<T, R> = string & keyof {[P in keyof T as T[P] extends R ? P : never]: T[P]}

export function constructRFunction<ArgType, V>(f: string) {
    return <T>(x: KeyWithType<T, ArgType>) =>
        [`${x} |> ${f}`, {} as V] as [string, V]
}

export type TextValue = `"${string}"` // string constants have to be enclosed in quotes

// Type for dplyr select().
type Reshape<
    T, // the source table
    Rename extends { [Field in keyof Rename]: keyof T } = {}, // new names as object keys and original names as values
    Select extends keyof T = never, // union of verbatim fields
> =
    & { [Field in keyof Rename]: T[Rename[Field]] }
    & { [K in Select]: T[K]};

// Type for dplyr mutate().
type Mutate<
    T, // input table
    N extends string, // result name(s), probably should just permit a single literal
    R, // result type
> = 
    & Omit<T, N> // if any result names are already on the table, replace them
    & {[P in N]: R};

// Type for dplyr join().
// Supports two types of joins: specify shared key, or an explicitly-named key from each table.
type Join<T, S, By extends keyof (T | S) = never> =
    & {[b in By]: T[b]} // include any shared keys
    & Omit<T, (keyof S) | By>
    & Omit<S, (keyof T) | By> // include fields that are in only one table
    & { [K in keyof Omit<(T | S), By> & string as `x.${K}`]: S[K] }
    & { [K in keyof Omit<(T | S), By> & string as `y.${K}`]: S[K] }; // rename duplicate fields

type JoinType = 'inner' | 'outer' | 'left' | 'right'

// Types for dplyr filter()s.
// This one narrows the actual type of the column to the specified value.
type WhereEq<T, K extends keyof T, V extends T[K]> = 
    & Omit<T, K>
    & {[P in K]: V};

// General filters don't change the schema.
type Where<T> = T;

class ProgramNode {
    public op = 'holder'
    public children: ProgramNode[]
    
    constructor() {
        this.children = []
    }

    public rep(): string | null { return null }
    
    public setBefore(p: ProgramNode) {
        this.children = [p].concat(...this.children)
        return this
    }

    public setAfter(p: ProgramNode) {
        this.children.push(p)
        return this
    }
}

class PlaintextNode extends ProgramNode {
    public op = 'plaintext'
    constructor(
        public text: string
    ) { super() }

    public rep() { return this.text }
}

class ReferenceNode extends PlaintextNode { // same functionality but communicates intent better
    public op = 'ref'
    constructor(name: string) { super(name) }
}

class AssignNode extends ProgramNode {
    public op = 'assign'
    constructor(
        private name: string,
        dfSteps: ProgramNode
    ) {
        super()
        this.children.push(dfSteps)
    }

    public rep() {
        return `${this.name} <- `
    }
}

class Select2Node extends ProgramNode {
    public op = 'select'
    constructor(
        private selections: Array<[string, string] | string>
    ) { super() }

    public rep() {
        return `|> select(${
            this.selections.map((x) =>
                typeof x === 'string'
                ? x
                : `${x[0]} = ${x[1]}`
            ).join(', ')
        })`
    }
}

class SelectNode extends ProgramNode {
    public op = 'select'
    constructor(
        private reshape: Record<string, string> = {},
        private selections: string[] = []
    ) {
        super()
    }

    public rep() {
        let args: string[] = []

        if (Object.keys(this.reshape).length > 0) {
            args.push(
                Object.keys(this.reshape)
                .map((k) => `${k} = ${this.reshape[k]}`)
                .join(', ')
            )
        }

        if (this.selections.length > 0) {
            args.push(this.selections.join(', '))
        }

        const argstring = args.join(', ')
        return `|> select(${argstring})`
    }
}

class MutateNode extends ProgramNode {
    public op = 'mutate'
    constructor(
        private resultName: string,
        private expression: string
    ) {
        super()
    }

    public rep() {
        // sorta the right idea, but we need to permit chaining functions
        // maybe focus first on functions of one variable?
        return `|> mutate(${this.resultName} = ${this.expression})`
    }
}

class ParameterNode extends ProgramNode {
    public op = 'parameter'
    constructor(
        private name: string,
        private value: string
    ) {
        super()
    }

    public rep() {
        return `, ${this.name} = ${this.value}`
    }
}

class JoinNode extends ProgramNode {
    public op = 'join'
    constructor(
        private kind: JoinType,
        source: ProgramNode,
        joinCondition: string
    ) {
        super()
        this.setAfter(source)
        this.setAfter(new ParameterNode('by', `join_by(${joinCondition})`))
    }
    
    public rep() {
        return `|> ${this.kind}_join`
    }
}

class WhereNode extends ProgramNode {
    public op = 'where'
    constructor(
        private condition: string
    ) {
        super()
    }

    public rep() {
        return `|> filter(${this.condition})`
    }
}

export class RDataFrame<T> {
    public readonly schema = {} as T // only used to obtain type info and doesn't actually hold data

    constructor(
        public derivation = new ProgramNode()
    ) { }

    public then<S>(extension: ProgramNode) {
        return new RDataFrame<S>(
            this.derivation.setAfter(extension)
        )
    }

    // hacky because you can create a reference to an unbound symbol
    // TODO: reorganize so this can't be done
    public reference(name: string) {
        return this.then<T>(new PlaintextNode(name))
    }

    // Overloads for select
    // Only renaming
    public select<NewShape extends Record<keyof NewShape & string, keyof T & string>> (
        select: NewShape
    ): RDataFrame<Reshape<T, NewShape, never>>;

    // Only original names
    public select<OriginalKeys extends keyof T & string> (
        ...choose: OriginalKeys[]
    ): RDataFrame<Reshape<T, {}, OriginalKeys>>;

    // Combination of both
    public select<NewShape extends Record<keyof NewShape, keyof T>, OriginalKeys extends keyof T & string> (
        select: NewShape, ...choose: OriginalKeys[]
    ): RDataFrame<Reshape<T, NewShape, OriginalKeys>>;

    // Implementation
    public select<NewShape extends Record<keyof NewShape & string, keyof T & string>, OriginalKeys extends keyof T & string>(
        select: NewShape, ...choose: OriginalKeys[]
    ) {
        if (choose.length == 0) {
            return this.then<Reshape<T, NewShape>>(new SelectNode(select))
        } else {
            return this.then<Reshape<T, NewShape, OriginalKeys>>(new SelectNode(select, choose))
        }
    }

    // Function to construct mutators for the different types.
    // I couldn't figure out how to make the return type generic :<
    //
    // This function (and mutateR below) returns a callback so you have to call it like:
    //      df.mutate<TYPE>()('name of new column', 'name of source column', 'arbitrary R expression')
    public mutate<V>() {
        return <
            N extends string,
            E extends string
        >(
            name: N,
            transform: E & RExpression<T, E, V>
        ) => 
            this.then<Mutate<T, N, V>>(new MutateNode(
                name, transform
            ))
    }

    // Convenience methods to avoid the awkward double-call syntax.
    public mutateBoolean = this.mutate<boolean>()
    public mutateNumeric = this.mutate<number>()
    public mutateString = this.mutate<string>()

    // Escape hatch for writing arbitrary R code in mutates.
    // You provide the type of column created manually, and the code inside will not be type checked.
    // The optional type argument is the type of column to start with, so the static analyzer can still
    // provide a little help if desired.
    // WARNING: this permits code injection attacks :<
    public mutateR<V, From = unknown>() {
        return <N extends string>(name: N, source: KeyWithType<T, From>, code: string) =>
            this.then<Mutate<T, N, V>>(new MutateNode(name, `${source} |> ${code}`))
    }

    public join_on<S, L extends string & keyof (T | S)>(other: RDataFrame<S>, key: L, kind: JoinType = 'left') {
        return this.then<Join<T, S, L>>(
            new JoinNode(kind, other.derivation, `${key}`)
        )
    }

    public join<S, L extends string & keyof T, R extends string & keyof S>(other: RDataFrame<S>, leftKey: L, rightKey: R, kind: JoinType = 'left') {
        return this.then<Join<T, S>>(
            new JoinNode(kind, other.derivation, `${leftKey} == ${rightKey}`)
        )
    }

    public whereEq<K extends string & keyof T, V extends T[K]>(column: K, value: V) {
        return this.then<WhereEq<T, K, V>>(
            new WhereNode(`${column} == ${this.convertToR(value)}`)
        )
    }

    // This is a bit weird because we have to construct a function partial.
    // It's similar to _mutate() above.
    public where = (() =>
        <E extends string>(condition: E & RExpression<T, E, boolean>) =>
            this.then<Where<T>>(new WhereNode(condition))
    )()

    // Typescript boolean literals don't get rendered in R correctly, this fixes that.
    private convertToR(x: any) {
        if (typeof x === 'boolean') { return x ? 'TRUE' : 'FALSE' }
        return x
    }
}

type RSymbolTable = {[s: string]: RDataFrame<any>}

// Only export the environment object to force all interactions through this.
export class REnvironment<E extends RSymbolTable> { // can only bind RDataFrames
    public program: ProgramNode

    public static startupStatements() {
        return [new ReferenceNode('library(dplyr)')]
    }

    public static fresh() {
        const env = new REnvironment<{}>(new ProgramNode())
        this.startupStatements().forEach((node) => env.program.setAfter(node))
        return env
    }

    protected constructor(p: ProgramNode) {
        this.program = p
    }

    public bindSymbol<K extends string, T>(key: K, df: RDataFrame<T>) {
        return new REnvironment<
            & E
            & {[P in K]: RDataFrame<T>}
        > (
            this.program.setAfter(new AssignNode(key, df.derivation))
        )
    }

    public resolveSymbol<K extends string & keyof E>(key: K) {
        return new RDataFrame<E[K]['schema']>() // the symbol is always bound to a RDataFrame so this is legit
            .reference(key)
    }

    public static emptyDF<T>() {
        // placeholder method for getting DFs to play with
        // DOES NOT CREATE VALID R CODE
        return new RDataFrame<T>()
    }
}

export class ADaMTestEnvironment<E extends RSymbolTable> extends REnvironment<E> {

    public static startupStatements() {
        return super.startupStatements().concat(
            ...[
                '',
                'source("r/config.r")',
                'source("r/util.r")',
                ''
            ].map((x) => new ReferenceNode(x))
        )
    }

    public static loadDF<T>(name: `"${string}"`) {
        return new RDataFrame<T>(
            new ReferenceNode(`load_sdtm(${name})`)
        )
    }

    public static save<E extends RSymbolTable>(env: REnvironment<E>, df: string & keyof E) {
        env.program.setAfter(new ReferenceNode(`${df} |> save("${df}")`))
    }
}

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
    public readonly universe = {} as U // the universe of target fields
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
            N extends KeyWithType<R, V>,
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
            source: KeyWithType<T, From>,
            code: string
        ) =>
            this.update(
                this.df.then<Mutate<T, N, V>>(new MutateNode(name, `${source} |> ${code}`))
            )
    }

    public join_on<S extends string & keyof E, L extends string & keyof (T | S)>(joinTable: S, key: L, kind: JoinType = 'left') {
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

export function printProgram(root: ProgramNode, depth: number = 0): string {
    const tab = '    '.repeat(depth)
    const res = 
        (root.rep() == null
            ? ''
            : tab + root.rep() + (
                root.rep() == null || root.children.length == 0
                    ? '\n'
                    : '(\n'
            )
        )
        + root.children
            .map((x) => printProgram(x,
                root.rep() == null
                    ? depth
                    : depth+1
            ))
            .reduce((total, x) => total + x, '')
        + (root.rep() == null || root.children.length == 0
            ? ''
            : tab + ')\n')
    return res
}
