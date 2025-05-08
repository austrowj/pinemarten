import { RExpression } from './ast_r';

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

function printExpression(expr: RExpression): RExpression { // Return the original expression to verify coverage.
    switch (expr.type) {
        case 'RIfStatement': {
            p.append('if (');
            printExpression(expr.condition);
            p.append(') ');
            printExpression(expr.thenBranch);
            if (expr.elseBranch.type != 'REmptyStatement') {
                p.append(' else ');
                printExpression(expr.elseBranch);
            }
            return expr;
        }
        case 'RBlock': {
            p.append('{');
            p.flush();
            p.flush();
            p.indent();
            expr.statements.filter(x => x.type != 'REmptyStatement').forEach(x => {
                printExpression(x);
                p.flush();
                p.flush();
            });
            p.unindent();
            p.append('}');
            p.flush();
            return expr;
        }
        case 'REmptyStatement': {
            return expr;
        }
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
            printExpression(expr.body);
            return expr;
        }
        case 'RFunctionCall': {
            printExpression(expr.functionName);
            p.append('(');
            expr.arguments.forEach((x, i) => {
                printExpression(x);
                if (i < expr.arguments.length - 1) { p.append(', '); }
            })
            p.append(')');
            return expr;
        }
        case 'RPropertyAccess': {
            // In R, the property access operator '$' has higher precedence than the pipe '|>'.
            // However, these are both '.' operators in TS which are always evaluated left to right.
            // To enforce the correct evaluation order, check for nontrivial property access and wrap the preceeding expression in parentheses.
            if (expr.object.type == 'RIdentifier' || expr.isPipedCall) {
                printExpression(expr.object);
            } else {
                p.append('(');
                printExpression(expr.object);
                p.append(')');
            }

            if (expr.isPipedCall) { // TODO: this doesn't produce the correct syntax for properties that are functions.
                p.append(' |>'); // Don't rely on fancy features from the dplyr '%>%'.
                p.flush();
            }
            else { p.append('$'); }
            p.append(expr.property);
            return expr;
        }
        case 'RParenthesizedExpression': {
            p.append('(');
            printExpression(expr.inner);
            p.append(')');
            return expr;
        }
    }
}

export function printR(ast: RExpression[]): string {
    ast.filter(x => x.type != 'REmptyStatement').forEach(x => {
        printExpression(x);
        p.flush();
        p.flush();
    });
    return p.getOutput();
}