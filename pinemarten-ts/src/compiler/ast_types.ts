// Define types for our simplified R AST.

export interface RAssignment {
    type: 'Assignment';
    name: string;
    value: RExpression;
}

export interface RFunctionDefinition {
    type: 'FunctionDefinition';
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
    // These come from the property assignments in an object literal.
    type: 'DataColumn';
    name: string;
    value: RStatement;
}

export interface RDataLiteral {
    // These come from object literals.
    // It's extremely likely that we'll want to use object literals for something else too later.
    type: 'DataLiteral';
    columnAssignments: RStatement[]; // Rely on TS syntax to validate that these can only be PropertyAssignments.
}

export interface RIfStatement {
    type: 'IfStatement';
    condition: RExpression;
    thenBranch: RStatement;
    elseBranch: RStatement;
}

export interface RPropertyAccess {
    type: 'PropertyAccess';
    object: RExpression;
    property: string;
    isFunction: boolean;
}

export interface RBlock {
    type: 'Block';
    statements: RStatement[];
}

export interface REmptyStatement {
    type: 'Empty';
}

export type RExpression =
    | RLiteral
    | RIdentifier
    | RBinaryExpression
    | RFunctionDefinition
    | RFunctionCall
    | RPropertyAccess
    | RParenthesizedExpression
    | RDataColumn
    | RDataLiteral
;

export type RStatement =
    | RExpression
    | RAssignment
    | RIfStatement
    | RBlock
    | REmptyStatement
;

export function isStatement(node: RStatement | RExpression | undefined): node is RStatement {
    if (node === undefined) { return false; }
    return (
        node.type === 'Assignment'
        || node.type === 'IfStatement'
        || node.type === 'Block'
    );
}

export function isExpression(node: RStatement): node is RExpression {
    if (node === undefined) { return false; }
    return !isStatement(node);
}
