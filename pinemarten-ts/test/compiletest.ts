import { RTransformer } from '../src/compiler/ast_transformer';
import { printR } from '../src/compiler/printer';

const rAst = new RTransformer('test/langtest.R.ts').getAST();
console.log(JSON.stringify(rAst, null, 2));
console.log('\nGenerated R Code:\n');
console.log(printR(rAst));