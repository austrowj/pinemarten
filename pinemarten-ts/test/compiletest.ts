import { SimplifyingTransformer } from '../src/compiler/transformer_simplify';
import { RTransformer } from '../src/compiler/transformer_to_r';
import { printR } from '../src/compiler/printer';

const simpleAst = new SimplifyingTransformer('test/simple_test.R.ts').getAST();
const rAst = new RTransformer(simpleAst).getAST();

console.log(JSON.stringify(rAst, null, 2));
console.log('\nGenerated R Code:\n');
console.log(printR(rAst));
