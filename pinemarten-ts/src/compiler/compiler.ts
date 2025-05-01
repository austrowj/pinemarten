import * as ts from "typescript";

function getLanguageDefinitionTypes() {

    const langdefsFile = "langdefs.ts";
    const program = ts.createProgram([langdefsFile], {});
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(langdefsFile);
    if (!sourceFile) throw new Error("Language definitions file not found.");

    let typeDataframe: ts.Type | undefined;

    ts.forEachChild(sourceFile, function findMyClass(node) {
        if (ts.isClassDeclaration(node) && node.name?.text === "Dataframe") {
            const symbol = checker.getSymbolAtLocation(node.name);
            if (symbol) {
                typeDataframe = checker.getDeclaredTypeOfSymbol(symbol);
            }
        }
    });

    if (typeDataframe === undefined) {
        throw new Error(`"Dataframe" class not defined in language definitions file.`);
    }

    return typeDataframe;
}

function compileToR(filename: string) {

    //const typeDataframe = getLanguageDefinitionTypes();

    const program = ts.createProgram([filename], {});
    const sourceFile = program.getSourceFile(filename);
    const typeChecker = program.getTypeChecker();

    if (sourceFile === undefined) {
        throw Error("Source file not found.");
    }
    
    let output: string[] = [];
    let indentLevel = 0;
    
    function emit(line: string) {
        const indent = "    ".repeat(indentLevel); // 4 spaces per indent
        output.push(indent + line);
        console.log(indent + line);
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
            // Always adds spaces on each side of a binary operator.
            return `${printExpression(expr.left)} ${expr.operatorToken.getText()} ${printExpression(expr.right)}`;
        
        } else if (ts.isParenthesizedExpression(expr)) {
            return `(${printExpression(expr.expression)})`;

        } else if (ts.isIdentifier(expr)) {
            return expr.text;

        } else if (ts.isNumericLiteral(expr)) {
            return expr.text;

        } else if (ts.isStringLiteral(expr)) {
            return `"${expr.text}"`;

        } else if (ts.isCallExpression(expr)) {
            const funcName = printExpression(expr.expression);
            const args = expr.arguments.map(x => printExpression(x)).join(", ");
            return `${funcName}(${args})`;

        } else if (ts.isArrowFunction(expr)) {
            // Turn arrow functions into anonymous functions.
            const parameters = expr.parameters.map(x => x.name.getText()).join(', '); // does not handle defaults or anything
            //const body = printExpression(expr.body) // have to rearrange the entire compiler to handle this correctly
            return `function(${parameters}) {}`;

        // TODO: handle object literals (are the always dataframes? are they parameter lists? ...)
        
        } else if (ts.isPropertyAccessExpression(expr)) {

            const property_name = (expr.name as ts.Identifier).text;

            // Just do simple thing for now, no syntax magic.
            // Functions get a pipe, everything else gets an access operator.
            // ASIDE: It's extremely convoluted to check if the property is a Callable...
            const operator = typeChecker.getSignaturesOfType(typeChecker.getTypeAtLocation(expr.name), ts.SignatureKind.Call).length > 0
                ? ' |> '
                : '$'
            ;
            return `${printExpression(expr.expression)}${operator}${property_name}`;

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

const result = compileToR('test/langtest.R.ts');
console.log(result);
