
// Define types for a subset of the R AST.

export interface RFunctionDefinition {
    type: 'RFunctionDefinition';
    params: string[];
    body: RExpression;
}

export interface RFunctionCall {
    type: 'RFunctionCall';
    functionName: RExpression;
    arguments: RExpression[];
}

export interface RBinaryExpression {
    type: 'RBinaryExpression';
    operator: string;
    left: RExpression;
    right: RExpression;
}

export interface RParenthesizedExpression {
    type: 'RParenthesizedExpression';
    inner: RExpression | RExpression;
}

export interface RLiteral {
    type: 'RLiteral';
    text: string;
}

export interface RIdentifier {
    type: 'RIdentifier';
    name: string;
}

export interface RIfStatement {
    type: 'RIfStatement';
    condition: RExpression;
    thenBranch: RExpression;
    elseBranch: RExpression;
}

export interface RPropertyAccess {
    type: 'RPropertyAccess';
    object: RExpression;
    property: string;
    isFunction: boolean;
}

export interface RBlock {
    type: 'RBlock';
    statements: RExpression[];
}

export interface REmptyStatement {
    type: 'REmptyStatement';
}

export type RExpression =
    | RLiteral
    | RIdentifier
    | RBinaryExpression
    | RFunctionDefinition
    | RFunctionCall
    | RPropertyAccess
    | RParenthesizedExpression
    | RIfStatement
    | RBlock
    | REmptyStatement
;
