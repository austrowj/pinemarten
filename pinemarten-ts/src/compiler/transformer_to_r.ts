import * as ir_ast from './ast_simple';
import * as r_ast from './ast_r';

export class RTransformer {

    private rAst: r_ast.RExpression[];

    // Entry point
    constructor(ast: ir_ast.Expression[], private context: any = {}) {
        this.rAst = this.transform(ast);
    }

    public getAST() { return this.rAst; }

    private transform(ast: ir_ast.Expression[]): r_ast.RExpression[] {
        const rAst: r_ast.RExpression[] = [];
        ast.forEach(node => {
            const transformed = this.transformNode(node);
            if (transformed) {
                rAst.push(transformed);
            }
        });
        return rAst;
    }

    // Transformer function (TODO)
    private transformNode(node: ir_ast.Expression): r_ast.RExpression {
        switch (node.type) {
            
            case 'Assignment': return {
                type: 'RBinaryExpression',
                operator: '<-',
                left: {type: 'RIdentifier', name: node.name},
                right: this.transformNode(node.value)
            };
            case 'BinaryExpression': return {
                type: 'RBinaryExpression',
                operator: node.operator,
                left: this.transformNode(node.left),
                right: this.transformNode(node.right)
            };
            case 'Block': return {
                type: 'RBlock',
                statements: node.statements.map(x => this.transformNode(x))
            };
            case 'FunctionCall': return {
                type: 'RFunctionCall',
                functionName: this.transformNode(node.functionName),
                arguments: node.arguments.map(x => this.transformNode(x))
            };
            case 'FunctionDefinition': return {
                type: 'RFunctionDefinition',
                params: node.params,
                body: this.transformNode(node.body)
            };
            case 'IfStatement': return {
                type: 'RIfStatement',
                condition: this.transformNode(node.condition),
                thenBranch: this.transformNode(node.thenBranch),
                elseBranch: this.transformNode(node.elseBranch)
            };
            case 'ParenthesizedExpression': return {
                type: 'RParenthesizedExpression',
                inner: this.transformNode(node.inner)
            };
            case 'PropertyAccess': return {
                type: 'RPropertyAccess',
                object: this.transformNode(node.object),
                property: node.property,
                isFunction: node.propertyIsFunction // TODO: convert property access to a binary operator upstream (using '$' or '|>')
            };

            case 'Identifier':      return {type: 'RIdentifier', name: node.name};
            case 'Literal':         return {type: 'RLiteral', text: node.text};
            case 'EmptyStatement':  return {type: 'REmptyStatement'};

            case 'ArrayLiteral': return {
                type: 'RFunctionCall',
                functionName: {type:'RLiteral', text: 'c'},
                arguments: node.elements.map(x => this.transformNode(x))
            };

            // Object literals correspond fairly nicely to lists because the elements in an R list can be named.
            case 'ObjectLiteral': {
                return {
                    type: 'RFunctionCall',
                    functionName: {type: 'RLiteral', text: 'list'},
                    arguments: node.properties.map(x => this.transformNode(x))
                };
            }
            case 'PropertyAssignment': {
                return {
                    type: 'RBinaryExpression',
                    operator: '=',
                    left: {type: 'RLiteral', text: node.name},
                    right: this.transformNode(node.value)
                };
            }
        }
    }

}
