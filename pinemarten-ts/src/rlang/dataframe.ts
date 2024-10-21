import { RExpression } from './expparse'

import { KeyOfType, Reshape, Mutate, Join, Where, WhereEq } from '../schema_operations'
import { ProgramNode, PlaintextNode, ReferenceNode, JoinNode, SelectNode, WhereNode, MutateNode } from '../ast'

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
    public select<NewShape extends Record<string & keyof NewShape, string & keyof T>> (
        select: NewShape
    ): RDataFrame<Reshape<T, NewShape, never>>;

    // Only original names
    public select<OriginalKeys extends string & keyof T> (
        ...choose: OriginalKeys[]
    ): RDataFrame<Reshape<T, {}, OriginalKeys>>;

    // Combination of both
    public select<NewShape extends Record<keyof NewShape, keyof T>, OriginalKeys extends string & keyof T> (
        select: NewShape, ...choose: OriginalKeys[]
    ): RDataFrame<Reshape<T, NewShape, OriginalKeys>>;

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
        return <N extends string>(name: N, source: KeyOfType<T, From>, code: string) =>
            this.then<Mutate<T, N, V>>(new MutateNode(name, `${source} |> ${code}`))
    }

    public join_on<S, L extends keyof (T | S) & string>(other: RDataFrame<S>, key: L, kind: string = 'left') {
        return this.then<Join<T, S, L>>(
            new JoinNode(kind, other.derivation, `${key}`)
        )
    }

    public join<S, L extends string & keyof T, R extends string & keyof S>(other: RDataFrame<S>, leftKey: L, rightKey: R, kind: string = 'left') {
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