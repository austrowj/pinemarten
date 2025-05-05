// Define types for a simplified R AST

export interface RVariableDeclaration {
    type: 'VariableDeclaration';
    name: string;
    value: RExpression;
}

export interface RFunctionDeclaration {
    type: 'FunctionDeclaration';
    name: string;
    params: string[];
    body: RStatement | RExpression;
}

export interface RFunctionCall {
    type: 'FunctionCall';
    functionName: RExpression | RStatement;
    arguments: RExpression[];
}

export interface RBinaryExpression {
    type: 'BinaryExpression';
    operator: string;
    left: RExpression;
    right: RExpression;
}

export interface RParenthesizedExpression {
    type: 'ParenthesizedExpression';
    inner: RStatement | RExpression;
}

export interface RLiteral {
    type: 'Literal';
    text: string;
}

export interface RIdentifier {
    type: 'Identifier';
    name: string;
}

export interface RDataColumn {
    type: 'DataColumn';
    name: string;
    value: RExpression | RStatement;
}

export interface RDataLiteral {
    type: 'DataLiteral';
    columns: (RExpression | RStatement)[];
}

export interface RIfStatement {
    type: 'IfStatement';
    condition: RExpression;
    thenBranch: RStatement | RExpression;
    elseBranch: RStatement | RExpression;
}

export interface RPropertyAccess {
    type: 'PropertyAccess';
    object: RExpression;
    property: string;
    isFunction: boolean;
}

export interface RArrowFunction {
    type: 'ArrowFunction';
    params: string[];
    body: RStatement | RExpression;
}

export interface RBlock {
    type: 'Block';
    statements: (RStatement | RExpression)[];
}

export interface REmptyStatement {
    type: 'Empty';
}

export type RExpression =
    | RLiteral
    | RIdentifier
    | RBinaryExpression
    | RFunctionCall
    | RPropertyAccess
    | RArrowFunction
    | RParenthesizedExpression
    | RDataColumn
    | RDataLiteral
;

export type RStatement =
    | RVariableDeclaration
    | RFunctionDeclaration
    | RIfStatement
    | RBlock
    | REmptyStatement
;

export function isStatement(node: RStatement | RExpression | undefined): node is RStatement {
    if (node === undefined) { return false; }
    return (
        node.type === 'VariableDeclaration'
        || node.type === 'FunctionDeclaration'
        || node.type === 'IfStatement'
        || node.type === 'Block'
    );
}
