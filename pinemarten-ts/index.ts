export { Dataframe } from "./src/api/defs";

export class TestEnv<T> {

    public static make() { return new TestEnv<{}>() }

    public x<K extends keyof T>(k: K) { return true }
}
