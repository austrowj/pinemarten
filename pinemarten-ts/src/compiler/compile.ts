import { SimplifyingTransformer } from './transformer_simplify';
import { RTransformer } from './transformer_to_r';
import { printR } from './printer';

function compile(filename: string) {
    const simpleAst = new SimplifyingTransformer(filename).getAST();
    const rAst = new RTransformer(simpleAst).getAST();

    console.log(JSON.stringify(rAst, null, 2));
    console.log('\nGenerated R Code:\n');
    console.log(printR(rAst));
}

function execute() {
    const args = process.argv.slice(2);
    console.log(`Args: ${args}`);
    if (args.length < 1) throw new Error('No source file specified.');

    const filename = args[0];
    compile(filename);
}

execute();
