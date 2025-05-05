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
    body: RStatement | RExpression;
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
    text: string;
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
    thenBranch: RStatement | RExpression;
    elseBranch: RStatement | RExpression;
}

interface RPropertyAccess {
    type: 'PropertyAccess';
    object: RExpression;
    property: string;
    isFunction: boolean;
}

interface RArrowFunction {
    type: 'ArrowFunction';
    params: string[];
    body: RStatement[];
}

interface RBlock {
    type: 'Block';
    statements: (RStatement | RExpression)[];
}

interface REmptyStatement {
    type: 'Empty';
}

type RExpression = RLiteral | RIdentifier | RBinaryExpression | RFunctionCall | RPropertyAccess | RArrowFunction;
type RStatement = RVariableDeclaration | RFunctionDeclaration | RFunctionCall | RReturnStatement | RIfStatement | RBlock | REmptyStatement;

// Transformer function
function transformNode(node: ts.Node): RStatement | RExpression {
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
            const body = fn.body ? transformNode(fn.body) : {type: 'Empty'} as REmptyStatement;
            return { type: 'FunctionDeclaration', name, params, body: body };
        }
        case ts.SyntaxKind.ArrowFunction: {
            const fn = node as ts.ArrowFunction;
            const params = fn.parameters.map(p => p.name.getText());
            const bodyStatements: RStatement[] = [];
            if (ts.isBlock(fn.body)) {
                fn.body.statements.forEach(stmt => {
                    const transformed = transformNode(stmt);
                    if (transformed && isStatement(transformed)) {
                        bodyStatements.push(transformed);
                    }
                });
            } else {
                const expr = transformNode(fn.body);
                if (expr) {
                    bodyStatements.push({ type: 'ReturnStatement', expression: expr as RExpression });
                }
            }
            return { type: 'ArrowFunction', params, body: bodyStatements };
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

            const thenBranch = transformNode(ifNode.thenStatement);
            const elseBranch = ifNode.elseStatement ? transformNode(ifNode.elseStatement) : ({type: 'Empty'} as REmptyStatement);

            return { type: 'IfStatement', condition, thenBranch, elseBranch };
        }
        case ts.SyntaxKind.ReturnStatement: {
            const returnNode = node as ts.ReturnStatement;
            const expression = transformNode(returnNode.expression!) as RExpression;
            return { type: 'ReturnStatement', expression };
        }
        case ts.SyntaxKind.Block: {
            const statements = (node as ts.Block).statements.map(x => transformNode(x));
            return { type: 'Block', statements: statements}
        }
        case ts.SyntaxKind.NumericLiteral:
        case ts.SyntaxKind.TrueKeyword:
        case ts.SyntaxKind.FalseKeyword: {
            const lit = node as ts.LiteralExpression;
            return { type: 'Literal', text: lit.getText() };
        }
        case ts.SyntaxKind.StringLiteral: {
            const lit = node as ts.LiteralExpression;
            return { type: 'Literal', text: `"${lit.getText()}"` };
        }
        case ts.SyntaxKind.Identifier: {
            return { type: 'Identifier', name: (node as ts.Identifier).text };
        }
        case ts.SyntaxKind.EndOfFileToken:
            return { type: 'Empty' };
        default:
            throw Error(`Unsupported syntax ("${ts.SyntaxKind[node.kind]}"), code:\n${node.getText()}`);
    }
}

function isStatement(node: RStatement | RExpression | undefined): node is RStatement {
    if (node === undefined) { return false; }
    return (
        node.type === 'VariableDeclaration'
        || node.type === 'FunctionDeclaration'
        || node.type === 'FunctionCall'
        || node.type === 'ReturnStatement'
        || node.type === 'IfStatement'
        || node.type === 'Block'
    );
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

class Printer {

    constructor(private indentText = '    ') {}

    private buffer = '';
    private indentLevel = 0;
    private output = '';

    private getIndentText() {
        return this.indentText.repeat(this.indentLevel);
    }

    public append(text: string) {
        this.buffer += text;
    }

    public flush() {
        this.output += `${this.getIndentText()}${this.buffer}\n`;
        this.buffer = '';
    }

    public indent() { this.indentLevel += 1; }
    public unindent() { this.indentLevel = Math.max(this.indentLevel-1, 0); }

    public getOutput() { return this.output; }
}

const p = new Printer('  ');

// Printer
function printR(ast: RStatement[]): string {
    ast.map(printStatement);
    return p.getOutput();
}

function printStatement(stmt: RStatement) {
    switch (stmt.type) {
        case 'VariableDeclaration': {
            p.append(stmt.name);
            p.append(' <- ');
            printExpression(stmt.value);
            p.flush();
            break;
        }
        case 'FunctionDeclaration': {
            p.append(stmt.name);
            p.append(` <- function(${stmt.params.join(', ')}) `);
            printRNode(stmt.body);
            p.flush();
            break;
        }
        case 'FunctionCall': {
            p.append(`${stmt.functionName}(`);
            stmt.arguments.forEach((x, i) => {
                printExpression(x);
                if (i < stmt.arguments.length - 1) { p.append(', '); }
            })
            p.append(')');
            p.flush();
            break;
        }
        case 'ReturnStatement': {
            p.append('return(');
            printExpression(stmt.expression);
            p.append(')');
            p.flush();
            break;
        }
        case 'IfStatement': {
            p.append('if (');
            printExpression(stmt.condition);
            p.append(') ');
            printRNode(stmt.thenBranch);
            if (stmt.elseBranch.type != 'Empty') {
                p.append(' else ');
                printRNode(stmt.elseBranch);
            }
            p.flush();
            break;
        }
        case 'Block': {
            p.append('{');
            p.flush();
            p.indent();
            stmt.statements.forEach(x => printRNode(x));
            p.unindent();
            p.append('}');
            p.flush();
        }
        case 'Empty': {
        }
    }
}

function printExpression(expr: RExpression): void {
    switch (expr.type) {
        case 'Literal': {
            p.append(expr.text);
            break;
        }
        case 'Identifier': {
            p.append(expr.name);
            break;
        }
        case 'BinaryExpression': {
            printExpression(expr.left);
            p.append(` ${expr.operator} `);
            printExpression(expr.right);
            break;
        }
        case 'FunctionCall': {
            p.append(`${expr.functionName}(`);
            expr.arguments.forEach((x, i) => {
                printExpression(x);
                if (i < expr.arguments.length - 1) { p.append(', '); }
            })
            p.append(')');
            break;
        }
        case 'PropertyAccess': {
            printExpression(expr.object);
            if (expr.isFunction) { p.append(' |> '); }
            else { p.append('$'); }
            p.append(expr.property);
            break;
        }
        case 'ArrowFunction': { // TODO
            const params = expr.params.join(', ');
            const body = expr.body.map(printStatement).join('\n  ');
            `function(${params}) ${body}`;
        }
    }
}

function printRNode(node: RStatement | RExpression): void {
    if (isStatement(node)) { printStatement(node); }
    else { printExpression(node); }
}

// Example usage
const tsCode = `
let x = 42;
//const inc = (n) => n + 1;
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
