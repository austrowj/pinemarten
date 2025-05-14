import { SimplifyingTransformer } from './transformers/transformer_simplify';
import { RTransformer } from './transformers/transformer_to_r';
import { printR } from './printer';
import { dependencies, depsLocation } from './dependencies';

import * as fs from 'fs';

/*  TODO list, in no particular order:
    - Prevent creating identifiers out of words that are reserved in R.
    - Insert a force(<params>) at the top of each function definition at compile time to subvert lazy evaluation.
*/

function compile(filename: string) {
    const simpleAst = new SimplifyingTransformer(filename).getAST();
    const rAst = new RTransformer(simpleAst).getAST();
    
    console.log(JSON.stringify(rAst, null, 2))
    return printR(rAst);
}

function execute() {
    const args = process.argv.slice(2);
    console.log(`Args: ${args}`);
    if (args.length < 1) throw new Error('No source file specified.');

    const filename = args[0];
    const output_text = compile(filename);

    const out_filename = filename.slice(
        Math.max(filename.lastIndexOf('\\'), 0),
        filename.indexOf('.ts')
    )

    if (args.length < 2) {
        console.log('\nGenerated R Code:\n');
        console.log(output_text);
    } else {
        fs.writeFileSync(args[1] + '/' + out_filename, output_text);
        dependencies.forEach(dep => {
            fs.copyFileSync(depsLocation + '/' + dep, args[1] + '/' + dep);
            console.log(`Copied ${dep} to target directory.`);
        });
    }
}

execute();
