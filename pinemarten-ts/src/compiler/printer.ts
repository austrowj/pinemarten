import { isStatement, isExpression, RStatement, RExpression, RFunctionCall } from './r_ast';

// State-based printer.
// There is probably a better design but idk what it is and this works for now.
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

const p = new Printer('    '); // The actual printer instance we will use.

function printStatement(stmt: RStatement): RStatement { // Return original statement to statically verify all cases are covered.
    if (isExpression(stmt)) { return printExpression(stmt); }
    switch (stmt.type) {
        case 'RAssignment': {
            p.append(stmt.name);
            p.append(' <- ');
            printExpression(stmt.value);
            return stmt;
        }
        case 'RIfStatement': {
            p.append('if (');
            printExpression(stmt.condition);
            p.append(') ');
            printRNode(stmt.thenBranch);
            if (stmt.elseBranch.type != 'REmptyStatement') {
                p.append(' else ');
                printRNode(stmt.elseBranch);
            }
            return stmt;
        }
        case 'RBlock': {
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
        case 'REmptyStatement': {
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

function printExpression(expr: RExpression | RStatement): RExpression | RStatement { // Return the original expression to verify coverage.
    if (!isExpression(expr)) { return printStatement(expr); }
    switch (expr.type) {
        case 'RLiteral': {
            p.append(expr.text);
            return expr;
        }
        case 'RIdentifier': {
            p.append(expr.name);
            return expr;
        }
        case 'RBinaryExpression': {
            printExpression(expr.left);
            p.append(` ${expr.operator} `);
            printExpression(expr.right);
            return expr;
        }
        case 'RFunctionDefinition': {
            p.append(`function(${expr.params.join(', ')}) `);
            printRNode(expr.body);
            return expr;
        }
        case 'RFunctionCall': {
            printFunctionCall(expr);
            return expr;
        }
        case 'RPropertyAccess': {
            // In R, the property access operator '$' has higher precedence than the pipe '|>'.
            // However, these are both '.' operators in TS which are always evaluated left to right.
            // To enforce the correct evaluation order, check for nontrivial property access and wrap the preceeding expression in parentheses.
            if (expr.object.type == 'RIdentifier' || expr.isFunction) {
                printExpression(expr.object);
            } else {
                p.append('(');
                printExpression(expr.object);
                p.append(')');
            }

            if (expr.isFunction) { p.append(' |> '); } // Don't rely on fancy features from the dplyr '%>%'.
            else { p.append('$'); }
            p.append(expr.property);
            return expr;
        }
        case 'RParenthesizedExpression': {
            p.append('(');
            printRNode(expr.inner);
            p.append(')');
            return expr;
        }
        case 'RDataColumn': {
            p.append(expr.name);
            p.append(' = ');
            printRNode(expr.value);
            return expr;
        }
        case 'RDataLiteral': {
            p.append('dataframe('); // Function in our own R library allows use of different R backends.
            p.flush();
            p.indent();
            expr.columnAssignments.forEach((x, i) => {
                printRNode(x);
                if (i < expr.columnAssignments.length - 1) { p.append(', '); }
                p.flush();
            });
            p.unindent();
            p.append(')');
            return expr;
        }
    }
}

function printRNode(node: RStatement | RExpression): void {
    if (isStatement(node)) { printStatement(node);  }
    else                   { printExpression(node); }
}

export function printR(ast: RStatement[]): string {
    ast.forEach(x => {
        printStatement(x);
        p.flush();
    });
    return p.getOutput();
}