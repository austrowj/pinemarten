type T = Symbol;

function f(a: number, c: string): string {
    return c;
}

function g(a: number, b: number): number {
    const r = a + b;
    return r;
}

const x = 3;
const y = f(x, "hello");
const z = g(4, x);

//R.print(x);
