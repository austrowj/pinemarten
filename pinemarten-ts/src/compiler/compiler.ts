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
    
    function visit(node: ts.Node): string[] {

        if (ts.isExpression(node)) return handleExpression(node);

        switch (node.kind) {

            case ts.SyntaxKind.SourceFile:
            case ts.SyntaxKind.SyntaxList:
                return node.getChildren().map(visit).reduce((x, y) => x.concat(y), []);

            case ts.SyntaxKind.VariableStatement:
                return handleVariableStatement(node as ts.VariableStatement);

            case ts.SyntaxKind.FunctionDeclaration:
                return handleFunctionDeclaration(node as ts.FunctionDeclaration);

            case ts.SyntaxKind.ExpressionStatement:
                return handleExpressionStatement(node as ts.ExpressionStatement);
            
            case ts.SyntaxKind.ReturnStatement:
                return handleReturnStatement(node as ts.ReturnStatement);

            case ts.SyntaxKind.Block:
                return handleBlock(node as ts.Block);

            case ts.SyntaxKind.ImportDeclaration:
            case ts.SyntaxKind.EndOfFileToken:
                return [];

            default:
                throw Error(`Unsupported syntax near "${node.getFullText(sourceFile).trim()}": kind ${ts.SyntaxKind[node.kind]}`);
        }
    }
    
    function handleVariableStatement(node: ts.VariableStatement) {
        return node.declarationList.declarations.map(decl => {
            const name = (decl.name as ts.Identifier).text;
            const initializer = decl.initializer ? handleExpression(decl.initializer) : "NULL";
            return `${name} <- ${initializer}`;
        });
    }
    
    function handleFunctionDeclaration(node: ts.FunctionDeclaration) {
        const name = node.name?.text;
        const params = node.parameters.map(p => (p.name as ts.Identifier).text).join(", ");
        return [`${name} <- function(${params}) {`].concat(node.body ? visit(node.body) : []).concat('}');
    }
    
    function handleExpressionStatement(node: ts.ExpressionStatement) {
        return handleExpression(node.expression);
    }

    function handleReturnStatement(node: ts.ReturnStatement) {
        if (node.expression === undefined) {
            return ['return()'];
        } else {
            return [`return(`].concat(handleExpression(node.expression)).concat([')']);
        }
    }
    
    function handleBlock(node: ts.Block) {
        return node.statements.map(statement => visit(statement)).reduce((x, y) => x.concat(y), []);
    }
    
    function handleExpression(expr: ts.Expression): string[] {

        if (ts.isBinaryExpression(expr)) {
            // Always adds spaces on each side of a binary operator.
            const left = handleExpression(expr.left);
            const right = handleExpression(expr.right);
            const op = [expr.operatorToken.getText()];

            return left.concat(op).concat(right);
        
        } else if (ts.isParenthesizedExpression(expr)) {
            const inner = handleExpression(expr.expression);
            return ['('].concat(inner).concat([')']);

        } else if (ts.isIdentifier(expr)) {
            return [expr.text];

        } else if (ts.isNumericLiteral(expr)) {
            return [expr.text];

        } else if (ts.isStringLiteral(expr)) {
            return [`"${expr.text}"`];

        } else if (ts.isCallExpression(expr)) {
            const funcName = handleExpression(expr.expression);
            const args = expr.arguments.map(x => handleExpression(x)).join(", ");
            return [`${funcName}(${args})`];

        } else if (ts.isArrowFunction(expr)) {
            // Turn arrow functions into anonymous functions.
            const parameters = expr.parameters.map(x => x.name.getText()).join(', '); // does not handle defaults or anything
            //const body = printExpression(expr.body) // have to rearrange the entire compiler to handle this correctly
            return [`function(${parameters}) {`].concat(visit(expr.body)).concat(['}']);

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
            return [`${handleExpression(expr.expression)}${operator}${property_name}`];

        } else if (ts.isReturnStatement(expr)) {
            // Not directly an Expression, but if needed
            return expr.expression ? ['return('].concat(handleExpression(expr.expression)).concat([')']) : ['return()'];
        
        } else if (ts.isObjectLiteralExpression(expr)) {
            return [expr.getFullText()]; // TODO: unpack this properly

        } else {
            throw Error(`Unsupported syntax near "${expr.getFullText(sourceFile).trim()}": kind ${ts.SyntaxKind[expr.kind]}`);
        }
    }
    
    return visit(sourceFile).join('\n');
}

const result = compileToR('test/langtest.R.ts');
console.log(result);
