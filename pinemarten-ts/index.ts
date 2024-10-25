export { Workbench, DFWorkbench } from "./src/Workbench";
export { ADaMTestEnvironment, REnvironment } from "./src/rlang/environment"
export { RDataFrame } from './src/rlang/dataframe'

export { Environment, Dataframe } from './src/rlang/program'

export class TestEnv<T> {

    public static make() { return new TestEnv<{}>() }

    public x<K extends keyof T>(k: K) { return true }
}
