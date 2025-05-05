import * as ts from 'typescript';

// Define types for a simplified R AST
interface RVariableDeclaration {
    type: 'VariableDeclaration';
    name: string;
    value: RExpression;
}

interface RFunctionDeclaration {
    type: 'FunctionDeclaration';
    name: string;
    params: string[];
    body: RStatement[];
}

interface RFunctionCall {
    type: 'FunctionCall';
    functionName: string;
    arguments: RExpression[];
}

interface RBinaryExpression {
    type: 'BinaryExpression';
    operator: string;
    left: RExpression;
    right: RExpression;
}

interface RLiteral {
    type: 'Literal';
    value: string | number | boolean;
}

interface RIdentifier {
    type: 'Identifier';
    name: string;
}

interface RReturnStatement {
    type: 'ReturnStatement';
    expression: RExpression;
}

interface RIfStatement {
    type: 'IfStatement';
    condition: RExpression;
    thenBranch: RStatement[];
    elseBranch?: RStatement[];
}

interface RPropertyAccess {
    type: 'PropertyAccess';
    object: RExpression;
    property: string;
    isFunction: boolean;
}

type RExpression = RLiteral | RIdentifier | RBinaryExpression | RFunctionCall | RPropertyAccess;
type RStatement = RVariableDeclaration | RFunctionDeclaration | RFunctionCall | RReturnStatement | RIfStatement;

// Transformer function
function transformNode(node: ts.Node): RStatement | RExpression | undefined {
    switch (node.kind) {
        case ts.SyntaxKind.VariableStatement: {
            const decl = (node as ts.VariableStatement).declarationList.declarations[0];
            const name = (decl.name as ts.Identifier).text;
            const value = transformNode(decl.initializer!) as RExpression;
            return { type: 'VariableDeclaration', name, value };
        }
        case ts.SyntaxKind.FunctionDeclaration: {
            const fn = node as ts.FunctionDeclaration;
            const name = fn.name!.text;
            const params = fn.parameters.map(p => p.name.getText());
            const bodyStatements: RStatement[] = [];
            fn.body!.statements.forEach(stmt => {
                const transformed = transformNode(stmt);
                if (transformed && isStatement(transformed)) {
                    bodyStatements.push(transformed);
                }
            });
            return { type: 'FunctionDeclaration', name, params, body: bodyStatements };
        }
        case ts.SyntaxKind.ExpressionStatement: {
            const expr = (node as ts.ExpressionStatement).expression;
            return transformNode(expr);
        }
        case ts.SyntaxKind.CallExpression: {
            const call = node as ts.CallExpression;
            const functionName = call.expression.getText();
            const args = call.arguments.map(arg => transformNode(arg) as RExpression);
            return { type: 'FunctionCall', functionName, arguments: args };
        }
        case ts.SyntaxKind.BinaryExpression: {
            const bin = node as ts.BinaryExpression;
            return {
                type: 'BinaryExpression',
                operator: bin.operatorToken.getText(),
                left: transformNode(bin.left) as RExpression,
                right: transformNode(bin.right) as RExpression,
            };
        }
        case ts.SyntaxKind.PropertyAccessExpression: {
            const pa = node as ts.PropertyAccessExpression;
            const object = transformNode(pa.expression) as RExpression;
            const property = pa.name.text;
            return {
                type: 'PropertyAccess',
                object,
                property,
                isFunction: ts.isCallExpression(pa.parent) && pa.parent.expression === pa,
            };
        }
        case ts.SyntaxKind.IfStatement: {
            const ifNode = node as ts.IfStatement;
            const condition = transformNode(ifNode.expression) as RExpression;
            const thenBranch = [transformNode(ifNode.thenStatement)].filter(isStatement) as RStatement[];
            const elseBranch = ifNode.elseStatement ? [transformNode(ifNode.elseStatement)].filter(isStatement) as RStatement[] : undefined;
            return { type: 'IfStatement', condition, thenBranch, elseBranch };
        }
        case ts.SyntaxKind.ReturnStatement: {
            const returnNode = node as ts.ReturnStatement;
            const expression = transformNode(returnNode.expression!) as RExpression;
            return { type: 'ReturnStatement', expression };
        }
        case ts.SyntaxKind.NumericLiteral:
        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.TrueKeyword:
        case ts.SyntaxKind.FalseKeyword: {
            const lit = node as ts.LiteralExpression;
            return { type: 'Literal', value: eval(lit.getText()) };
        }
        case ts.SyntaxKind.Identifier: {
            return { type: 'Identifier', name: (node as ts.Identifier).text };
        }
        default:
            return undefined;
    }
}

function isStatement(node: RStatement | RExpression): node is RStatement {
    return node.type === 'VariableDeclaration' || node.type === 'FunctionDeclaration' || node.type === 'FunctionCall' || node.type === 'ReturnStatement' || node.type === 'IfStatement';
}

// Entry point
function parseAndTransform(sourceCode: string): RStatement[] {
    const sourceFile = ts.createSourceFile('temp.ts', sourceCode, ts.ScriptTarget.ESNext, true);
    const rAst: RStatement[] = [];
    sourceFile.forEachChild(node => {
        const transformed = transformNode(node);
        if (transformed && isStatement(transformed)) {
            rAst.push(transformed);
        }
    });
    return rAst;
}

// Printer
function printR(ast: RStatement[]): string {
    return ast.map(printStatement).join('\n');
}

function printStatement(stmt: RStatement): string {
    switch (stmt.type) {
        case 'VariableDeclaration':
            return `${stmt.name} <- ${printExpression(stmt.value)}`;
        case 'FunctionDeclaration': {
            const paramList = stmt.params.join(', ');
            const body = stmt.body.map(printStatement).join('\n  ');
            return `${stmt.name} <- function(${paramList}) {\n  ${body}\n}`;
        }
        case 'FunctionCall':
            return `${stmt.functionName}(${stmt.arguments.map(printExpression).join(', ')})`;
        case 'ReturnStatement':
            return `return(${printExpression(stmt.expression)})`;
        case 'IfStatement': {
            const thenPart = stmt.thenBranch.map(printStatement).join('\n  ');
            const elsePart = stmt.elseBranch ? ` else {\n  ${stmt.elseBranch.map(printStatement).join('\n  ')}\n}` : '';
            return `if (${printExpression(stmt.condition)}) {\n  ${thenPart}\n}${elsePart}`;
        }
    }
}

function printExpression(expr: RExpression): string {
    switch (expr.type) {
        case 'Literal':
            return typeof expr.value === 'string' ? `"${expr.value}"` : String(expr.value);
        case 'Identifier':
            return expr.name;
        case 'BinaryExpression':
            return `(${printExpression(expr.left)} ${expr.operator} ${printExpression(expr.right)})`;
        case 'FunctionCall':
            return `${expr.functionName}(${expr.arguments.map(printExpression).join(', ')})`;
        case 'PropertyAccess':
            return expr.isFunction
                ? `${printExpression(expr.object)} |> ${expr.property}`
                : `${printExpression(expr.object)}$${expr.property}`;
    }
}

// Example usage
const tsCode = `
let x = 42;
function add(a, b) {
    let result = a + b;
    return result;
}
if (x > 10) {
    add(x, 10);
} else {
    add(5, 2);
}
`;

const rAst = parseAndTransform(tsCode);
console.log(JSON.stringify(rAst, null, 2));
console.log('\nGenerated R Code:\n');
console.log(printR(rAst));
