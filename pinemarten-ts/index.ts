export { Workbench, DFWorkbench } from "./src/Workbench";
export { ADaMTestEnvironment, REnvironment } from "./src/rlang/environment"

export class TestEnv<T> {

    public static make() { return new TestEnv<{}>() }

    public x<K extends keyof T>(k: K) { return true }
}
