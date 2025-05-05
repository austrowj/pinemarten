import { isStatement, RStatement, RExpression, RFunctionCall } from './ast_types';

// Printing
class Printer {

    constructor(private indentText = '    ') { }

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
    public unindent() { this.indentLevel = Math.max(this.indentLevel - 1, 0); }

    public getOutput() { return this.output; }
}

const p = new Printer('    ');

function printStatement(stmt: RStatement): RStatement { // Return original statement to statically verify all cases are covered.
    switch (stmt.type) {
        case 'VariableDeclaration': {
            p.append(stmt.name);
            p.append(' <- ');
            printExpression(stmt.value);
            return stmt;
        }
        case 'FunctionDeclaration': {
            p.append(stmt.name);
            p.append(` <- function(${stmt.params.join(', ')}) `);
            printRNode(stmt.body);
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
            return stmt;
        }
        case 'Block': {
            p.append('{');
            p.flush();
            p.indent();
            stmt.statements.forEach(x => {
                printRNode(x);
                p.flush();
            });
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
            // Property access operator '$' has different precedence in R than in TS.
            // Have to check for and wrap problematic accessors in parentheses.
            if (expr.object.type == 'Identifier' || expr.isFunction) {
                printExpression(expr.object);
            } else {
                p.append('(');
                printExpression(expr.object);
                p.append(')');
            }

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
                if (i < expr.columns.length - 1) { p.append(', '); }
                p.flush();
            });
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

export function printR(ast: RStatement[]): string {
    ast.forEach(x => {
        printStatement(x);
        p.flush();
    });
    return p.getOutput();
}