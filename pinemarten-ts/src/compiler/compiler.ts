import * as ts from "typescript";
import * as fs from "fs";

function transpileTsToR(fileName: string) {
    const sourceCode = fs.readFileSync(fileName, "utf8");
    const sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.Latest, true);
    
    let output: string[] = [];
    let indentLevel = 0;
    
    function emit(line: string) {
        const indent = "    ".repeat(indentLevel); // 4 spaces per indent
        output.push(indent + line);
    }
    
    function visit(node: ts.Node) {
        switch (node.kind) {

            case ts.SyntaxKind.VariableStatement:
                handleVariableStatement(node as ts.VariableStatement);
                break;

            case ts.SyntaxKind.FunctionDeclaration:
                handleFunctionDeclaration(node as ts.FunctionDeclaration);
                break;

            case ts.SyntaxKind.ExpressionStatement:
                handleExpressionStatement(node as ts.ExpressionStatement);
                break;
            
            case ts.SyntaxKind.ReturnStatement:
                handleReturnStatement(node as ts.ReturnStatement);
                break;

            case ts.SyntaxKind.Block:
                handleBlock(node as ts.Block);
                break;

            case ts.SyntaxKind.ImportDeclaration:
                // Do nothing.
                break;

            default:
                ts.forEachChild(node, visit);
        }
    }
    
    function handleVariableStatement(node: ts.VariableStatement) {
        node.declarationList.declarations.forEach(decl => {
            const name = (decl.name as ts.Identifier).text;
            const initializer = decl.initializer ? printExpression(decl.initializer) : "NULL";
            emit(`${name} <- ${initializer}`);
        });
    }
    
    function handleFunctionDeclaration(node: ts.FunctionDeclaration) {
        const name = node.name?.text;
        const params = node.parameters.map(p => (p.name as ts.Identifier).text).join(", ");
        emit(`${name} <- function(${params}) {`);
        indentLevel++;
        if (node.body) {
            visit(node.body); // This will hit the Block
        }
        indentLevel--;
        emit(`}`);
    }
    
    function handleExpressionStatement(node: ts.ExpressionStatement) {
        emit(printExpression(node.expression));
    }

    function handleReturnStatement(node: ts.ReturnStatement) {
        if (node.expression === undefined) {
            emit('return()');
        } else {
            emit(`return(${printExpression(node.expression)})`)
        }
    }
    
    function handleBlock(node: ts.Block) {
        node.statements.forEach(statement => {
            visit(statement);
        });
    }
    
    function printExpression(expr: ts.Expression): string {

        if (ts.isBinaryExpression(expr)) {
            return `${printExpression(expr.left)} ${expr.operatorToken.getText()} ${printExpression(expr.right)}`;

        } else if (ts.isIdentifier(expr)) {
            return expr.text;

        } else if (ts.isNumericLiteral(expr)) {
            return expr.text;

        } else if (ts.isStringLiteral(expr)) {
            return `"${expr.text}"`;

        } else if (ts.isCallExpression(expr)) {
            const funcName = printExpression(expr.expression);
            const args = expr.arguments.map(printExpression).join(", ");
            return `${funcName}(${args})`;
        
        } else if (ts.isPropertyAccessExpression(expr)) {
            const property_name = (expr.name as ts.Identifier).text;
            return `${printExpression(expr.expression)}$${property_name}`; // TODO: a less hacky version

        } else if (ts.isReturnStatement(expr)) {
            // Not directly an Expression, but if needed
            return expr.expression ? `return(${printExpression(expr.expression)})` : `return()`;

        } else {
            //return "UNKNOWN_EXPRESSION";
            throw Error(`Unsupported syntax near "${expr.getFullText(sourceFile).trim()}": kind ${expr.kind}`);
        }
    }
    
    visit(sourceFile);
    
    return output.join("\n");
}

const result = transpileTsToR('test/langtest.R.ts');
console.log(result);
