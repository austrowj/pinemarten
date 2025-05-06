// Define types for the intermediate representation.

export interface Assignment {
    type: 'Assignment';
    name: string;
    value: Expression;
}

export interface FunctionDefinition {
    type: 'FunctionDefinition';
    params: string[];
    body: Statement | Expression;
}

export interface FunctionCall {
    type: 'FunctionCall';
    functionName: Expression | Statement;
    arguments: Expression[];
}

export interface BinaryExpression {
    type: 'BinaryExpression';
    operator: string;
    left: Expression;
    right: Expression;
}

export interface ParenthesizedExpression {
    type: 'ParenthesizedExpression';
    inner: Statement | Expression;
}

export interface Literal {
    type: 'Literal';
    text: string;
}

export interface Identifier {
    type: 'Identifier';
    name: string;
}

export interface PropertyAssignment {
    // These come from the property assignments in an object literal.
    type: 'PropertyAssignment';
    name: string;
    value: Statement;
}

export interface ObjectLiteral {
    type: 'ObjectLiteral';
    properties: Statement[]; // Rely on TS syntax to validate that these can only be PropertyAssignments.
}

export interface IfStatement {
    type: 'IfStatement';
    condition: Expression;
    thenBranch: Statement;
    elseBranch: Statement;
}

export interface PropertyAccess {
    type: 'PropertyAccess';
    object: Expression;
    property: string;
    isFunction: boolean;
}

export interface Block {
    type: 'Block';
    statements: Statement[];
}

export interface EmptyStatement {
    type: 'EmptyStatement';
}

export type Expression =
    | Literal
    | Identifier
    | BinaryExpression
    | FunctionDefinition
    | FunctionCall
    | PropertyAccess
    | ParenthesizedExpression
    | PropertyAssignment
    | ObjectLiteral
;

export type Statement =
    | Expression
    | Assignment
    | IfStatement
    | Block
    | EmptyStatement
;

export function isStatement(node: Statement | Expression | undefined): node is Statement {
    if (node === undefined) { return false; }
    return (
        node.type === 'Assignment'
        || node.type === 'IfStatement'
        || node.type === 'Block'
    );
}

export function isExpression(node: Statement): node is Expression {
    if (node === undefined) { return false; }
    return !isStatement(node);
}

export function childrenOf(node: Statement): Statement[] {
    switch (node.type) {
        case 'Assignment':              return [node.value];
        case 'BinaryExpression':        return [node.left, node.right];
        case 'Block':                   return  node.statements;
        case 'FunctionCall':            return [node.functionName, ...node.arguments];
        case 'FunctionDefinition':      return [node.body];
        case 'IfStatement':             return [node.condition, node.thenBranch, node.elseBranch];
        case 'ObjectLiteral':           return  node.properties;
        case 'ParenthesizedExpression': return [node.inner];
        case 'PropertyAccess':          return [node.object];
        case 'PropertyAssignment':      return [node.value];

        case 'Identifier':
        case 'Literal':
        case 'EmptyStatement':          return [];
    }
}
