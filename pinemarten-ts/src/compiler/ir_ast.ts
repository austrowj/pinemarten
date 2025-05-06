// Define types for the intermediate representation.

export interface Assignment {
    type: 'Assignment';
    name: string;
    value: Expression;
}

export interface FunctionDefinition {
    type: 'FunctionDefinition';
    params: string[];
    body: Expression | Expression;
}

export interface FunctionCall {
    type: 'FunctionCall';
    functionName: Expression | Expression;
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
    inner: Expression | Expression;
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
    value: Expression;
}

export interface ObjectLiteral {
    type: 'ObjectLiteral';
    properties: Expression[]; // Rely on TS syntax to validate that these can only be PropertyAssignments.
}

export interface IfStatement {
    type: 'IfStatement';
    condition: Expression;
    thenBranch: Expression;
    elseBranch: Expression;
}

export interface PropertyAccess {
    type: 'PropertyAccess';
    object: Expression;
    property: string;
    isFunction: boolean;
}

export interface Block {
    type: 'Block';
    statements: Expression[];
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
    | Assignment
    | IfStatement
    | Block
    | EmptyStatement
;

export function childrenOf(node: Expression): Expression[] {
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
