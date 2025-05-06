import * as ts from 'typescript';
import {Expression, EmptyStatement, FunctionDefinition} from './ir_ast';

export class IntermediateTransformer {

    private program: ts.Program;
    private sourceFile: ts.SourceFile;
    private typeChecker: ts.TypeChecker;
    private ast: Expression[];

    // Entry point
    constructor(filename: string) {

        this.program = ts.createProgram([filename], {});
        this.sourceFile = this.program.getSourceFile(filename)!;
        this.typeChecker = this.program.getTypeChecker();
        this.ast = this.transformAST();
    }

    public getAST() { return this.ast; }

    private transformAST(): Expression[] {
        const rAst: Expression[] = [];
        this.sourceFile.forEachChild(node => {
            const transformed = this.transformNode(node);
            if (transformed) {
                rAst.push(transformed);
            }
        });
        return rAst;
    }

    // Transformer function
    private transformNode(node: ts.Node): Expression | Expression {
        switch (node.kind) {
            case ts.SyntaxKind.VariableStatement: {
                const decl = (node as ts.VariableStatement).declarationList.declarations[0];
                const name = (decl.name as ts.Identifier).text;
                const value = this.transformNode(decl.initializer!) as Expression;
                return { type: 'Assignment', name, value };
            }
            case ts.SyntaxKind.FunctionDeclaration: {
                const fn = node as ts.FunctionDeclaration;
                const name = fn.name!.text;
                const params = fn.parameters.map(p => p.name.getText());
                const body = fn.body ? this.transformNode(fn.body) : {type: 'EmptyStatement'} as EmptyStatement;

                const definition = { type: 'FunctionDefinition', params, body } as FunctionDefinition;
                return { type: 'Assignment', name, value: definition };
            }
            case ts.SyntaxKind.ArrowFunction: {
                // In R, arrow functions are just anonymous (unassigned) functions.
                const fn = node as ts.ArrowFunction;
                const params = fn.parameters.map(p => p.name.getText());
                const body = fn.body ? this.transformNode(fn.body) : { type: 'EmptyStatement' } as EmptyStatement;
                
                return { type: 'FunctionDefinition', params, body: body };
            }
            case ts.SyntaxKind.ExpressionStatement: {
                const expr = (node as ts.ExpressionStatement).expression;
                return this.transformNode(expr);
            }
            case ts.SyntaxKind.CallExpression: {
                const call = node as ts.CallExpression;
                const functionName = this.transformNode(call.expression);
                const args = call.arguments.map(arg => this.transformNode(arg) as Expression);
                return { type: 'FunctionCall', functionName, arguments: args };
            }
            case ts.SyntaxKind.BinaryExpression: {
                const bin = node as ts.BinaryExpression;
                return {
                    type: 'BinaryExpression',
                    operator: bin.operatorToken.getText(),
                    left: this.transformNode(bin.left) as Expression,
                    right: this.transformNode(bin.right) as Expression,
                };
            }
            case ts.SyntaxKind.PropertyAccessExpression: {
                const pa = node as ts.PropertyAccessExpression;
                const object = this.transformNode(pa.expression) as Expression;
                const property = pa.name.text;
                const isFunction = this.typeChecker.getSignaturesOfType(this.typeChecker.getTypeAtLocation(pa.name), ts.SignatureKind.Call).length > 0;

                return {
                    type: 'PropertyAccess',
                    object,
                    property,
                    isFunction,
                };
            }
            case ts.SyntaxKind.IfStatement: {
                const ifNode = node as ts.IfStatement;
                const condition = this.transformNode(ifNode.expression) as Expression;

                const thenBranch = this.transformNode(ifNode.thenStatement);
                const elseBranch = ifNode.elseStatement ? this.transformNode(ifNode.elseStatement) : ({type: 'EmptyStatement'} as EmptyStatement);

                return { type: 'IfStatement', condition, thenBranch, elseBranch };
            }
            case ts.SyntaxKind.ReturnStatement: {
                const returnNode = node as ts.ReturnStatement;
                const expression = this.transformNode(returnNode.expression!) as Expression;
                return { type: 'FunctionCall', functionName: {type: 'Identifier', name: 'return'}, arguments: [expression] };
            }
            case ts.SyntaxKind.Block: {
                const statements = (node as ts.Block).statements.map(x => this.transformNode(x));
                return { type: 'Block', statements: statements}
            }
            case ts.SyntaxKind.NumericLiteral:
            case ts.SyntaxKind.StringLiteral: {
                const lit = node as ts.LiteralExpression;
                return { type: 'Literal', text: lit.getText() };
            }

            // Boolean literals have to be handled separately because they have different names in R.
            case ts.SyntaxKind.TrueKeyword: {
                const lit = node as ts.LiteralExpression;
                return { type: 'Literal', text: 'TRUE' };
            }
            case ts.SyntaxKind.FalseKeyword: {
                const lit = node as ts.LiteralExpression;
                return { type: 'Literal', text: 'FALSE' };
            }
            
            case ts.SyntaxKind.Identifier: {
                return { type: 'Identifier', name: (node as ts.Identifier).text };
            }
            case ts.SyntaxKind.ParenthesizedExpression: {
                return { type: 'ParenthesizedExpression', inner: this.transformNode((node as ts.ParenthesizedExpression).expression) }
            }
            case ts.SyntaxKind.PropertyAssignment: {
                const prop = node as ts.PropertyAssignment;
                return { type: 'PropertyAssignment', name: prop.name.getText(), value: this.transformNode(prop.initializer) }
            }
            case ts.SyntaxKind.ObjectLiteralExpression: {
                const obj = node as ts.ObjectLiteralExpression;
                const props = obj.properties.map(x => this.transformNode(x));
                return { type: 'ObjectLiteral', properties: props }
            }
            case ts.SyntaxKind.AsExpression: {
                return this.transformNode((node as ts.AsExpression).expression);
            }

            // Ignore these elements
            case ts.SyntaxKind.ImportDeclaration:
            case ts.SyntaxKind.EndOfFileToken:
                return { type: 'EmptyStatement' };
            default:
                throw Error(`Unsupported syntax ("${ts.SyntaxKind[node.kind]}"), code:\n${node.getText()}`);
        }
    }

}
