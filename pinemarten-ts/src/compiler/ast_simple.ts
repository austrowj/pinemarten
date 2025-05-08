
// Define types for a simplified representation of the Typescript AST.

export interface Assignment {
    type: 'Assignment';
    name: string;
    value: Expression;
}

export interface FunctionDefinition {
    type: 'FunctionDefinition';
    params: string[];
    body: Expression;
}

export interface FunctionCall {
    type: 'FunctionCall';
    functionName: Expression;
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
    inner: Expression;
}

export interface Literal {
    type: 'Literal';
    text: string;
}

export interface ArrayLiteral {
    type: 'ArrayLiteral';
    elements: Expression[];
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
    propertyIsFunction: boolean;
    objectIsDataframe: boolean;
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
    | ArrayLiteral
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
        case 'ArrayLiteral':            return  node.elements;
        case 'ParenthesizedExpression': return [node.inner];
        case 'PropertyAccess':          return [node.object];
        case 'PropertyAssignment':      return [node.value];

        case 'Identifier':
        case 'Literal':
        case 'EmptyStatement':          return [];
    }
}

export function substitute(node: Expression, fn: (expr: Expression) => Expression): Expression {
    node = fn(node);
    switch (node.type) {
        case 'Assignment': return {
            type: node.type,
            name: node.name,
            value: substitute(node.value, fn)
        };
        case 'BinaryExpression': return {
            type: node.type,
            operator: node.operator,
            left: substitute(node.left, fn),
            right: substitute(node.right, fn)
        };
        case 'Block': return {
            type: node.type,
            statements: node.statements.map(x => substitute(x, fn))
        };
        case 'FunctionCall': return {
            type: node.type,
            functionName: substitute(node.functionName, fn),
            arguments: node.arguments.map(x => substitute(x, fn))
        };
        case 'FunctionDefinition': return {
            type: node.type,
            params: node.params,
            body: substitute(node.body, fn)
        };
        case 'IfStatement': return {
            type: node.type,
            condition: substitute(node.condition, fn),
            thenBranch: substitute(node.thenBranch, fn),
            elseBranch: substitute(node.elseBranch, fn)
        };
        case 'ObjectLiteral': return {
            type: node.type,
            properties: node.properties.map(x => substitute(x, fn))
        };
        case 'ArrayLiteral': return {
            type: node.type,
            elements: node.elements.map(x => substitute(x, fn))
        };
        case 'ParenthesizedExpression': return {
            type: node.type,
            inner: substitute(node.inner, fn)
        };
        case 'PropertyAccess': return {
            type: node.type,
            object: substitute(node.object, fn),
            property: node.property,
            objectIsDataframe: node.objectIsDataframe,
            propertyIsFunction: node.propertyIsFunction
        };
        case 'PropertyAssignment': return {
            type: node.type,
            name: node.name,
            value: substitute(node.value, fn)
        };

        case 'Identifier':
        case 'Literal':
        case 'EmptyStatement': return node;
    }
}
