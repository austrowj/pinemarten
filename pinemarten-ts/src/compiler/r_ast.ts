// Define types for our simplified R AST.

export interface RAssignment {
    type: 'RAssignment';
    name: string;
    value: RStatement;
}

export interface RFunctionDefinition {
    type: 'RFunctionDefinition';
    params: string[];
    body: RStatement;
}

export interface RFunctionCall {
    type: 'RFunctionCall';
    functionName: RStatement;
    arguments: RStatement[];
}

export interface RBinaryExpression {
    type: 'RBinaryExpression';
    operator: string;
    left: RStatement;
    right: RStatement;
}

export interface RParenthesizedExpression {
    type: 'RParenthesizedExpression';
    inner: RStatement | RExpression;
}

export interface RLiteral {
    type: 'RLiteral';
    text: string;
}

export interface RIdentifier {
    type: 'RIdentifier';
    name: string;
}

export interface RDataColumn {
    // These come from the property assignments in an object literal.
    type: 'RDataColumn';
    name: string;
    value: RStatement;
}

export interface RDataLiteral {
    // These come from object literals.
    // It's extremely likely that we'll want to use object literals for something else too later.
    type: 'RDataLiteral';
    columnAssignments: RStatement[]; // Rely on TS syntax to validate that these can only be PropertyAssignments.
}

export interface RIfStatement {
    type: 'RIfStatement';
    condition: RStatement;
    thenBranch: RStatement;
    elseBranch: RStatement;
}

export interface RPropertyAccess {
    type: 'RPropertyAccess';
    object: RStatement;
    property: string;
    isFunction: boolean;
}

export interface RBlock {
    type: 'RBlock';
    statements: RStatement[];
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
        node.type === 'RAssignment'
        || node.type === 'RIfStatement'
        || node.type === 'RBlock'
    );
}

export function isExpression(node: RStatement): node is RExpression {
    if (node === undefined) { return false; }
    return !isStatement(node);
}
