import { RDataFrame } from './dataframe'
import { ProgramNode, ReferenceNode, AssignNode, printProgram } from './ast'

export type RSymbolTable = {[s: string]: RDataFrame<any>} // can only bind RDataFrames

export class REnvironment<E extends RSymbolTable> {
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

    public print() {
        return printProgram(this.program)
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