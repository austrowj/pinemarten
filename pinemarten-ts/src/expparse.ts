/*
    Implementation of result type checking for basic R expressions.
*/

// T is the dataframe (Table), which determines which variable names are permitted.
// E is the string expression to validate.
// WARNING: Later on we refer to the dataframe as C and the expression as T, need to clean up.
export type RExpression<T, E, V> =
    V extends boolean ? RBoolean<T, E> :
    V extends number ? RNumeric<T, E> :
    V extends string ? RString<T, E>:
    never;
type RBoolean<T, E> = E extends BooleanExpression<T, E> ? E : never;
type RNumeric<T, E> = E extends NumericExpression<T, E> ? E : never; // both ints and floats
type RString<T, E> = E extends StringExpression<T, E> ? E : never;

/*
    General
*/
type W = ' ' | '' ;
type OverloadedComparator = `${'=' | '!'}=` ;
type ContextVariable<C, V> = keyof Pick<C, {[K in keyof C]: C[K] extends V ? K : never}[keyof C]> ;

/*
    Booleans
*/
type BooleanLiteral = 'TRUE' | 'FALSE' ;
type BooleanOperator = '&' | '|' ;
type NumericComparator = `${'<' | '>'}${'=' | ''}`

type BooleanExpression<C, T> =
    // Parenthesized expression
    // Stylistic choice: 'not' operator allowed only if parentheses are used
    T extends `${'!' | ''}(${infer I})`
    ? I extends BooleanExpression<C, I>
        ? T
        : never

    // Combining two expressions
    : T extends `${infer L}${W}${BooleanOperator}${W}${infer R}`
    ? L extends BooleanExpression<C, L> ? R extends BooleanExpression<C, R>
        ? T : never
        : never

    // Comparing strings, numbers, or booleans
    : T extends `${infer L}${W}${OverloadedComparator}${W}${infer R}`
        ? L extends NumericExpression<C, L> ? R extends NumericExpression<C, R>
            ? T : never
        : L extends BooleanExpression<C, L> ? R extends BooleanExpression<C, R>
            ? T : never
        : L extends StringExpression<C, L> ? R extends StringExpression<C, R>
            ? T : never
        : never

    // Comparing numerics
    : T extends `${infer L}${W}${NumericComparator}${W}${infer R}`
    ? L extends NumericExpression<C, L> ? R extends NumericExpression<C, R>
        ? T : never
        : never

    // Base cases
    : T extends BooleanLiteral | ContextVariable<C, boolean>
    ? T
    
    // Invalid
    : never;

/*
    Numerics
*/
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' ;
type NumericOperator = '+' | '-' | '*' | '/' | '^' | '**' ;

type Digits<T> =
    // More than one digit
    T extends `${infer First}${infer Rest}`
    ? First extends Digit
        ? Rest extends ''
            ? T
            : `${First}${Digits<Rest>}` 
        : never

    // Exactly one digit
    : T extends Digit
    ? T

    // Invalid
    : never;

type NumericLiteral<T> =
    // Floating point value
    T extends `${infer First}.${infer Second}`
    ? First extends Digits<First> | ''
        ? Second extends Digits<Second>
            ? T
            : never
        : never

    // Integer
    : T extends Digits<T>
    ? T

    // Invalid
    : never;

type NumericExpression<C, T> =
    // Parenthesized expression
    T extends `(${infer I})`
    ? I extends NumericExpression<C, I>
        ? T
        : never

    // Combining two expressions
    : T extends `${infer L}${W}${NumericOperator}${W}${infer R}`
    ? L extends NumericExpression<C, L> ? R extends NumericExpression<C, R>
        ? T : never
        : never

    // Base cases
    : T extends NumericLiteral<T> | ContextVariable<C, number>
    ? T

    // Invalid
    : never;

/*
    Strings
*/
type StringLiteral = `"${string}"` // doesn't check for escaped quotes, just be careful lmao

type StringExpression<C, T> =
    // Parenthesized expression
    T extends `(${infer I})`
    ? I extends StringExpression<C, I>
        ? T
        : never
    
    // Base case
    : T extends StringLiteral | ContextVariable<C, string>
    ? T

    : never;

/*
    Generic version?
*/
type Literal<T, R> = 
    R extends boolean ?
        BooleanLiteral
    : R extends string ?
        StringLiteral
    : R extends number ?
        NumericLiteral<T>
    : never;

type BinaryOperator = {
    '+': [
        (x: number, y: number) => number,
        (x: string, y: string) => string,
    ],
    '==': [
        (x: boolean, y: boolean) => boolean,
        (x: number, y: number) => boolean,
        (x: string, y: string) => boolean,
    ]
}

// From ChatGPT, explain later
type ValidateOperatorSignatures<
    C,
    Signatures extends any[],
    Left,
    Right,
    V
> =
    Signatures extends [infer Signature, ...infer Rest]
        ? Signature extends (x: infer L, y: infer R) => infer Ret
            ? Left extends Expression<C, Left, L>
                ? Right extends Expression<C, Right, R>
                    ? V extends Ret
                        ? true
                        : ValidateOperatorSignatures<C, Rest, Left, Right, V>
                    : ValidateOperatorSignatures<C, Rest, Left, Right, V>
                : ValidateOperatorSignatures<C, Rest, Left, Right, V>
            : false
        : false;

type TestS = ValidateOperatorSignatures<{}, BinaryOperator['=='], '1', '2', boolean> // seems to work...
    
type Expression<C, T, V> =
    // Base cases
    T extends Literal<T, V> | ContextVariable<C, V>
    ? T

    // Function call
    //: T extends FunctionResult<C, T, V>
    //? T

    // Parenthesized expression
    : T extends `(${infer I})`
    ? I extends Expression<C, I, V>
        ? T
        : never

    // Combining two expressions
    : T extends `${infer L}${W}${infer Op}${W}${infer R}`
    ? Op extends keyof BinaryOperator
        ? ValidateOperatorSignatures<C, BinaryOperator[Op], L, R, V> extends true
            ? T
            : never
        : never

    // Invalid
    : never;

/*
    Testing
*/
function test() {
    type MyObj = {a: string, b: number, c: boolean}

    function isValue<V>() { return <T extends string>(x: T & RExpression<MyObj, T, V>) => x }
    //const e1 = isValue<string>()('3*(1+2) |> lubridate::parse_time("HMS")')
    const e2 = isValue<boolean>()('1 + 3 >= 2') // doesn't work using generic 'Expression' type

    function isBoolean<T extends string>(x: T & RExpression<MyObj, T, boolean>) { return true as const }
    const b1 = isBoolean('!(1.2 <=4) & (.034567*2 > 1)!= TRUE')
    //const b2 = isBoolean('!(true) | a')
    const b3 = isBoolean('(c == (FALSE))')

    function isNumeric<T extends string>(x: T & RNumeric<MyObj, T>) { return true as const }
    const n1 = isNumeric('1 + .989')
    const n3 = isNumeric('(1 + (b))')

    function isString<T extends string>(x: T & RString<MyObj, T>) { return true as const }
    const s1 = isString('"sdfa"')
    const s3 = isString('a')
}
