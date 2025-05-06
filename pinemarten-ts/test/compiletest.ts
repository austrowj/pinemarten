import { IntermediateTransformer } from '../src/compiler/ir_ast_transformer';
import { RTransformer } from '../src/compiler/ast_transformer';
import { printR } from '../src/compiler/printer';

const irAst = new IntermediateTransformer('test/langtest.R.ts').getAST();
const rAst = new RTransformer(irAst).getAST();

console.log(JSON.stringify(rAst, null, 2));
console.log('\nGenerated R Code:\n');
console.log(printR(rAst));
