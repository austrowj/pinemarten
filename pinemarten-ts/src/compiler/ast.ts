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
    functionName: RExpression | RStatement;
    arguments: RExpression[];
}

interface RBinaryExpression {
    type: 'BinaryExpression';
    operator: string;
    left: RExpression;
    right: RExpression;
}

interface RParenthesizedExpression {
    type: 'ParenthesizedExpression';
    inner: RStatement | RExpression;
}

interface RLiteral {
    type: 'Literal';
    text: string;
}

interface RIdentifier {
    type: 'Identifier';
    name: string;
}

interface RDataColumn {
    type: 'DataColumn';
    name: string;
    value: RExpression | RStatement;
}

interface RDataLiteral {
    type: 'DataLiteral';
    columns: (RExpression | RStatement)[];
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
    body: RStatement | RExpression;
}

interface RBlock {
    type: 'Block';
    statements: (RStatement | RExpression)[];
}

interface REmptyStatement {
    type: 'Empty';
}

type RExpression =
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
type RStatement =
    | RVariableDeclaration
    | RFunctionDeclaration
    | RIfStatement
    | RBlock
    | REmptyStatement
;

function isStatement(node: RStatement | RExpression | undefined): node is RStatement {
    if (node === undefined) { return false; }
    return (
        node.type === 'VariableDeclaration'
        || node.type === 'FunctionDeclaration'
        || node.type === 'IfStatement'
        || node.type === 'Block'
    );
}

class RTransformer {

    private program: ts.Program;
    private sourceFile: ts.SourceFile;
    private typeChecker: ts.TypeChecker;
    private ast: RStatement[];

    // Entry point
    constructor(filename: string) {

        this.program = ts.createProgram([filename], {});
        this.sourceFile = this.program.getSourceFile(filename)!;
        this.typeChecker = this.program.getTypeChecker();
        this.ast = this.transformAST();
    }

    public getAST() { return this.ast; }

    private transformAST(): RStatement[] {
        const rAst: RStatement[] = [];
        this.sourceFile.forEachChild(node => {
            const transformed = this.transformNode(node);
            if (transformed && isStatement(transformed)) {
                rAst.push(transformed);
            }
        });
        return rAst;
    }

    // Transformer function
    private transformNode(node: ts.Node): RStatement | RExpression {
        switch (node.kind) {
            case ts.SyntaxKind.VariableStatement: {
                const decl = (node as ts.VariableStatement).declarationList.declarations[0];
                const name = (decl.name as ts.Identifier).text;
                const value = this.transformNode(decl.initializer!) as RExpression;
                return { type: 'VariableDeclaration', name, value };
            }
            case ts.SyntaxKind.FunctionDeclaration: {
                const fn = node as ts.FunctionDeclaration;
                const name = fn.name!.text;
                const params = fn.parameters.map(p => p.name.getText());
                const body = fn.body ? this.transformNode(fn.body) : {type: 'Empty'} as REmptyStatement;
                return { type: 'FunctionDeclaration', name, params, body: body };
            }
            case ts.SyntaxKind.ArrowFunction: {
                const fn = node as ts.ArrowFunction;
                const params = fn.parameters.map(p => p.name.getText());
                const body = fn.body ? this.transformNode(fn.body) : { type: 'Empty' } as REmptyStatement;
                
                return { type: 'ArrowFunction', params, body: body };
            }
            case ts.SyntaxKind.ExpressionStatement: {
                const expr = (node as ts.ExpressionStatement).expression;
                return this.transformNode(expr);
            }
            case ts.SyntaxKind.CallExpression: {
                const call = node as ts.CallExpression;
                const functionName = this.transformNode(call.expression);
                const args = call.arguments.map(arg => this.transformNode(arg) as RExpression);
                return { type: 'FunctionCall', functionName, arguments: args };
            }
            case ts.SyntaxKind.BinaryExpression: {
                const bin = node as ts.BinaryExpression;
                return {
                    type: 'BinaryExpression',
                    operator: bin.operatorToken.getText(),
                    left: this.transformNode(bin.left) as RExpression,
                    right: this.transformNode(bin.right) as RExpression,
                };
            }
            case ts.SyntaxKind.PropertyAccessExpression: {
                const pa = node as ts.PropertyAccessExpression;
                const object = this.transformNode(pa.expression) as RExpression;
                const property = pa.name.text;
                const isFunction = this.typeChecker.getSignaturesOfType(this.typeChecker.getTypeAtLocation(pa.name), ts.SignatureKind.Call).length > 0;

                return {
                    type: 'PropertyAccess',
                    object,
                    property,
                    isFunction: isFunction,
                };
            }
            case ts.SyntaxKind.IfStatement: {
                const ifNode = node as ts.IfStatement;
                const condition = this.transformNode(ifNode.expression) as RExpression;

                const thenBranch = this.transformNode(ifNode.thenStatement);
                const elseBranch = ifNode.elseStatement ? this.transformNode(ifNode.elseStatement) : ({type: 'Empty'} as REmptyStatement);

                return { type: 'IfStatement', condition, thenBranch, elseBranch };
            }
            case ts.SyntaxKind.ReturnStatement: {
                const returnNode = node as ts.ReturnStatement;
                const expression = this.transformNode(returnNode.expression!) as RExpression;
                return { type: 'FunctionCall', functionName: {type: 'Identifier', name: 'return'}, arguments: [expression] };
            }
            case ts.SyntaxKind.Block: {
                const statements = (node as ts.Block).statements.map(x => this.transformNode(x));
                return { type: 'Block', statements: statements}
            }
            case ts.SyntaxKind.NumericLiteral:
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword: {
                const lit = node as ts.LiteralExpression;
                return { type: 'Literal', text: lit.getText() };
            }
            case ts.SyntaxKind.Identifier: {
                return { type: 'Identifier', name: (node as ts.Identifier).text };
            }
            case ts.SyntaxKind.ParenthesizedExpression: {
                return { type: 'ParenthesizedExpression', inner: this.transformNode((node as ts.ParenthesizedExpression).expression) }
            }
            case ts.SyntaxKind.PropertyAssignment: {
                const prop = node as ts.PropertyAssignment;
                return { type: 'DataColumn', name: prop.name.getText(), value: this.transformNode(prop.initializer) }
            }
            case ts.SyntaxKind.ObjectLiteralExpression: {
                const obj = node as ts.ObjectLiteralExpression;
                const props = obj.properties.map(x => this.transformNode(x));
                return { type: 'DataLiteral', columns: props }
            }

            // Ignore these elements
            case ts.SyntaxKind.AsExpression:
            case ts.SyntaxKind.ImportDeclaration:
            case ts.SyntaxKind.EndOfFileToken:
                return { type: 'Empty' };
            default:
                throw Error(`Unsupported syntax ("${ts.SyntaxKind[node.kind]}"), code:\n${node.getText()}`);
        }
    }

}

// Printing

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

const p = new Printer('    ');

function printStatement(stmt: RStatement): RStatement { // Return original statement to statically verify all cases are covered.
    switch (stmt.type) {
        case 'VariableDeclaration': {
            p.append(stmt.name);
            p.append(' <- ');
            printExpression(stmt.value);
            p.flush();
            return stmt;
        }
        case 'FunctionDeclaration': {
            p.append(stmt.name);
            p.append(` <- function(${stmt.params.join(', ')}) `);
            printRNode(stmt.body);
            p.flush();
            return stmt;
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
            return stmt;
        }
        case 'Block': {
            p.append('{');
            p.flush();
            p.indent();
            stmt.statements.forEach(x => printRNode(x));
            p.unindent();
            p.append('}');
            p.flush();
            return stmt;
        }
        case 'Empty': {
            return stmt;
        }
    }
}

function printFunctionCall(fc: RFunctionCall): RFunctionCall {

    printRNode(fc.functionName);
    p.append('(');
    fc.arguments.forEach((x, i) => {
        printExpression(x);
        if (i < fc.arguments.length - 1) { p.append(', '); }
    })
    p.append(')');
    return fc;
}

function printExpression(expr: RExpression): RExpression { // Return the original expression to verify coverage.
    switch (expr.type) {
        case 'Literal': {
            p.append(expr.text);
            return expr;
        }
        case 'Identifier': {
            p.append(expr.name);
            return expr;
        }
        case 'BinaryExpression': {
            printExpression(expr.left);
            p.append(` ${expr.operator} `);
            printExpression(expr.right);
            return expr;
        }
        case 'FunctionCall': {
            printFunctionCall(expr);
            return expr;
        }
        case 'PropertyAccess': {
            printExpression(expr.object);
            if (expr.isFunction) { p.append(' |> '); }
            else { p.append('$'); }
            p.append(expr.property);
            return expr;
        }
        case 'ArrowFunction': {
            p.append(`function(${expr.params.join(', ')}) `)
            printRNode(expr.body);
            return expr;
        }
        case 'ParenthesizedExpression': {
            p.append('(');
            printRNode(expr.inner);
            p.append(')');
            return expr;
        }
        case 'DataColumn': {
            p.append(expr.name);
            p.append(' = ');
            printRNode(expr.value);
            return expr;
        }
        case 'DataLiteral': {
            p.append('tibble(');
            p.flush();
            p.indent();
            expr.columns.forEach((x, i) => {
                printRNode(x);
                if (i < expr.columns.length - 1) {
                    p.append(', ');
                    p.flush();
                }
            });
            p.flush();
            p.unindent();
            p.append(')');
            return expr;
        }
    }
}

function printRNode(node: RStatement | RExpression): void {
    if (isStatement(node)) { printStatement(node); }
    else { printExpression(node); }
}

function printR(ast: RStatement[]): string {
    ast.forEach(x => {
        printStatement(x);
        p.flush();
    });
    return p.getOutput();
}

// Example usage

const rAst = new RTransformer('test/langtest.R.ts').getAST();
console.log(JSON.stringify(rAst, null, 2));
console.log('\nGenerated R Code:\n');
console.log(printR(rAst));
