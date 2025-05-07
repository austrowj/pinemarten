export { Dataframe } from "./src/api/language";

export class TestEnv<T> {

    public static make() { return new TestEnv<{}>() }

    public x<K extends keyof T>(k: K) { return true }
}
