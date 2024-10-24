import { AssignNode, printProgram } from './ast'
import { ProgramNode, PlaintextNode, ReferenceNode, JoinNode, SelectNode, WhereNode, MutateNode } from './ast'
import { RExpression } from './expparse'

import { KeyOfType, Reshape, Mutate, Join, Where, WhereEq } from '../schema_operations'

type SymbolTable<K> = { [key: string]: K }
type FunctionSymbols = SymbolTable<{params: any, results: any}>
type DataframeSymbols = SymbolTable<{
    schema: any,
    max: any
}>

type EnvironmentSymbols = {
    dataframes: DataframeSymbols,
    functions: FunctionSymbols
}

export class Environment<
    E extends EnvironmentSymbols
> {
    public readonly dataframes = {} as { // for inspecting the dataframe schemas directly
        [K in keyof E['dataframes']]: E['dataframes'][K]['schema']
    }

    public constructor(
        public readonly program = new ProgramNode()
    ) {}

    public static startupStatements() {
        return [
            'library(dplyr)',
            '',
            'source("r/config.r")',
            'source("r/util.r")',
            ''
        ]
    }

    public static fresh() {
        const env = new Environment<{dataframes: {}, functions: {}}>(new ProgramNode())
        this.startupStatements()
            .map((x) => new PlaintextNode(x))
            .forEach((node) => env.program.setAfter(node))

        return env
    }

    // Transition to a dataframe used to define a function
    public def<P, R>() {
        return new Dataframe<P, E, P & R, true>(this)
    }

    // Notes: STRONGLY consider the function-based approach instead of classes.
    // Each method would return an anonymous struct with the next options defined on it.

    // Save a dataframe's initial requirements and final schema as a named transformation.
    public bindFunc<K extends string, P, R>(key: K, df: Dataframe<P, any, R, true>) {
        return new Environment<{
            dataframes: E['dataframes'],
            functions: E['functions'] & {K: {params: P, results: R}}
        }>(this.program)
    }
    
    public loadDf<T>(name: `"${string}"`) { // returns a callable that you use to assign the dataframe to a symbol
        return <K extends string>(symbol: K) =>
            this.bindDf(
                symbol,
                new Dataframe<T, E, any>( // fully unlocked
                    this,
                    new ReferenceNode(`load_sdtm(${name})`)
                )
            )
    }

    public bindDf<K extends string, T, M>(key: K, df: Dataframe<T, E, M>) {
        return new Environment<{
            dataframes: E['dataframes'] & {[P in K]: {schema: T, max: M}}
            functions: E['functions']
        }> (
            this.program.setAfter(new AssignNode(key, df.program))
        )
    }

    public reference<K extends string & keyof E['dataframes']>(key: K) {
        return new Dataframe<             // fresh dataframe instance
            E['dataframes'][K]['schema'], // with its stored schema
            E,                            // aware of the current environment
            E['dataframes'][K]['max']     // and with knowledge of permitted new fields
        >(
            this,
            new ProgramNode().setAfter(new ReferenceNode(key)) // program starts with a reference to its name
        )
    }

    public print() {
        return printProgram(this.program)
    }
}

// This type filters the dataframes in an environment.
// Those which contain any fields not on M are excluded.
// Technically, this permits reassigning existing fields, which we probably don't want. (TODO)
type NameOfSubsetOfAllowedFields<M, E extends EnvironmentSymbols> =
    string & keyof {
        [P in keyof E['dataframes'] as M extends E['dataframes'][P]['schema'] ? P : never]: true
    }

export class Dataframe<
    T, // the column schema
    E extends EnvironmentSymbols, // the environment that contains this dataframe
    M = any, // permitted names for new columns
    F = false // flag that indicates if we are defining a function (this is super hacky)
> {
    public readonly schema = {} as T
    public readonly max = {} as M
    public readonly remain = {} as Omit<M, keyof T>

    constructor(
        public readonly env: Environment<E>,
        public readonly program = new ProgramNode()
    ) { }

    public save<K extends string>(name: K) {
        return new Environment<{
            dataframes: Omit<E['dataframes'], K> & { // set the entry for the new name to this table
                [P in K]: {
                    schema: T,
                    max: M
                }
            },
            functions: E['functions']
        }>(
            this.env.program.setAfter(
                new AssignNode(name, this.program)
            )
        )
    }

    public defReturn() {

    }

    public then<S>(extension: ProgramNode) {
        return new Dataframe<S, E, M>(
            this.env,
            this.program.setAfter(extension)
        )
    }

    public selectPredecessors<X>() { // special kind of select that also sets the max column space
        return <Keys extends string & keyof (T | X)>(...fields: Keys[]) => {
            type R = Reshape<T, {}, Keys>
            return new Dataframe<R, E, X>(
                this.env,
                this.program.setAfter(new SelectNode({}, fields))
            )
        }
    }

    // Overloads for select
    // Only new names
    public select<NewShape extends Record<string & keyof NewShape, string & keyof T>> (
        select: NewShape
    ): Dataframe<Reshape<T, NewShape, never>, E, M>;

    // Only original names
    public select<OriginalKeys extends string & keyof T> (
        ...choose: OriginalKeys[]
    ): Dataframe<Reshape<T, {}, OriginalKeys>, E, M>;

    // Combination of both
    public select<NewShape extends Record<keyof NewShape, keyof T>, OriginalKeys extends string & keyof T> (
        select: NewShape, ...choose: OriginalKeys[]
    ): Dataframe<Reshape<T, NewShape, OriginalKeys>, E, M>;

    // Implementation
    public select<NewShape extends Record<keyof NewShape & string, string & keyof T>, OriginalKeys extends string & keyof T>(
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
    public mutator<V>() {
        return <
            N extends keyof Omit<M, keyof T> & KeyOfType<M, V>,
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
    public mutateBoolean = this.mutator<boolean>()
    public mutateNumeric = this.mutator<number>()
    public mutateString = this.mutator<string>()

    // Escape hatch for writing arbitrary R code in mutates.
    // You provide the type of column created manually, and the code inside will not be type checked.
    // The optional type argument is the type of column to start with, so the static analyzer can still
    // provide a little help if desired.
    // WARNING: this permits code injection attacks :<
    public mutateR<V, From = unknown>() {
        return <
                N extends string & keyof Omit<M, keyof T>
            >(
                name: N,
                source: KeyOfType<T, From>,
                code: string
            ) =>
                this.then<Mutate<T, N, V>>(new MutateNode(name, `${source} |> ${code}`))
    }

    // "join"s are only allowed on environment-bound dataframes (no nesting)
    public join_on<
        S extends NameOfSubsetOfAllowedFields<M, E>,
        L extends keyof (T | E['dataframes'][S]['schema']) & string
    >(
        other: S,
        key: L,
        kind: string = 'left'
    ) {
        return this.then<Join<T, E['dataframes'][S]['schema'], L>>(
            new JoinNode(kind, this.env.reference(other).program, `${key}`)
        )
    }

    public join<
        S extends NameOfSubsetOfAllowedFields<M, E>,
        L extends string & keyof T,
        R extends string & keyof E['dataframes'][S]['schema']
    >(
        other: S,
        leftKey: L,
        rightKey: R,
        kind: string = 'left'
    ) {
        return this.then<Join<T, S>>(
            new JoinNode(kind, this.env.reference(other).program, `${leftKey} == ${rightKey}`)
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
