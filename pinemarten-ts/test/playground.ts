import { RDataFrame } from '../src/rlang/dataframe';
import { REnvironment, ADaMTestEnvironment } from '../src/rlang/environment';

type Schema = {a: string, b: number, c: boolean};

const df = new RDataFrame<Schema>()
df.mutateR<boolean, boolean>()('x', 'c', '')

const e = ADaMTestEnvironment.fresh()

const res = e
    .bindSymbol('X', ADaMTestEnvironment.loadDF<Schema>('"S"'))
    .resolveSymbol('X').schema

function main() {
    let x = REnvironment.fresh()
}
