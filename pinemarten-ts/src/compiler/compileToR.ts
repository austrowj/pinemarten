import * as ts from "typescript";

/*
    Skip down to 'RPrinter' for the stuff that is used.
    The rest is a graveyard of examples.
*/

function compile(fileNames: string[], options: ts.CompilerOptions): void {
  // Create a Program with an in-memory emit
    let createdFiles: Record<string, string> = {}
    const host = ts.createCompilerHost(options);
    host.writeFile = (fileName: string, contents: string) => createdFiles[fileName] = contents
    
    // Prepare and emit the d.ts files
    const program = ts.createProgram(fileNames, options, host);
    program.emit();

    // Loop through all the input files
    fileNames.forEach(file => {
        console.log("### JavaScript\n")
        console.log(host.readFile(file))

        console.log("### Type Definition\n")
        const dts = file.replace(".js", ".d.ts")
        console.log(createdFiles[dts])
    })
}

function extract(file: string, identifiers: string[]): void {
    // Create a Program to represent the project, then pull out the
    // source file to parse its AST.
    let program = ts.createProgram([file], { allowJs: true });
    const sourceFile = program.getSourceFile(file);
    if (sourceFile === undefined) {
        console.log(`File ${file} not found.`);
        return;
    }
    
    // To print the AST, we'll use TypeScript's printer
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  
    // To give constructive error messages, keep track of found and un-found identifiers
    const unfoundNodes: Array<[string, ts.Node]> = [], foundNodes: Array<[string, ts.Node]> = [];
  
    // Loop through the root AST nodes of the file
    ts.forEachChild(sourceFile, node => {
        let name = "";
        
        // This is an incomplete set of AST nodes which could have a top level identifier
        // it's left to you to expand this list, which you can do by using
        // https://ts-ast-viewer.com/ to see the AST of a file then use the same patterns
        // as below
        if (ts.isFunctionDeclaration(node)) {
            name = (node.name === undefined ? '' : node.name.text);
            // Hide the method body when printing
            //node.body = undefined;
        } else if (ts.isVariableStatement(node)) {
            name = node.declarationList.declarations[0].name.getText(sourceFile);
        } else if (ts.isInterfaceDeclaration(node)){
            name = node.name.text
        }
    
        const container = identifiers.includes(name) ? foundNodes : unfoundNodes;
        container.push([name, node]);
    });
  
    // Either print the found nodes, or offer a list of what identifiers were found
    if (!foundNodes.length) {
        console.log(`Could not find any of ${identifiers.join(", ")} in ${file}, found: ${unfoundNodes.filter(f => f[0]).map(f => f[0]).join(", ")}.`);
        process.exitCode = 1;
    } else {
        foundNodes.map(f => {
            const [name, node] = f;
            console.log("### " + name + "\n");
            console.log(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)) + "\n";
        });
        }
}

/*
    This is the class that actually does stuff.
*/
class RPrinter {
    private line: string = "";
    private tab: Number = 0;

    public constructor(public sourceFile: ts.SourceFile) {}

    public printNode(node: ts.Node): void {
        var node_type = 'UNRECOGNIZED';
        if (ts.isFunctionDeclaration(node)) {
            node_type = 'FUNCTION DECLARATION';
        } else if (ts.isVariableDeclaration(node)) {
            node_type = 'VARIABLE DECLARATION';
        } else if (ts.isPropertyAccessExpression(node)) {
            node_type = 'PROPERTY ACCESS EXPRESSION';
        }


        /*
        if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach((val) => {
                this.line += val.name
                this.write()
            })
        } else {
        }*/
       
        console.log(`${node_type}:\n ${node.getFullText(this.sourceFile)}\n`);
        ts.forEachChild(node, (child) => this.printNode(child))
    }

    private write() {
        console.log(this.line);
        this.line = "";
    }
}


function compileToR(files: string[]): void {
    let program = ts.createProgram(files, { });
    
    files.forEach((f) => {
        const sourceFile = program.getSourceFile(f);
        if (sourceFile === undefined) {
            console.log(`Missing source file for ${f}`);
            return;
        }

        const printer = new RPrinter(sourceFile);
        printer.printNode(sourceFile);
    })
}

compileToR(["test/compiletarget.R.ts"])
