// A very simple abstract syntax tree for R programs that only allows (some of the) dplyr verbs.

export class ProgramNode {
    public op = 'holder'
    public children: ProgramNode[]
    
    constructor() {
        this.children = []
    }

    public rep(): string | null { return null }
    
    public setBefore(p: ProgramNode) {
        this.children = [p].concat(...this.children)
        return this
    }

    public setAfter(p: ProgramNode) {
        this.children.push(p)
        return this
    }
}

export class PlaintextNode extends ProgramNode {
    public op = 'plaintext'
    constructor(
        public text: string
    ) { super() }

    public rep() { return this.text }
}

export class ReferenceNode extends PlaintextNode { // same functionality but communicates intent better
    public op = 'ref'
    constructor(name: string) { super(name) }
}

export class AssignNode extends ProgramNode {
    public op = 'assign'
    constructor(
        private name: string,
        dfSteps: ProgramNode
    ) {
        super()
        this.children.push(dfSteps)
    }

    public rep() {
        return `${this.name} <-`
    }
}

export class SelectNode extends ProgramNode {
    public op = 'select'
    constructor(
        private reshape: Record<string, string> = {},
        private selections: string[] = []
    ) {
        super()
    }

    public rep() {
        let args: string[] = []

        if (Object.keys(this.reshape).length > 0) {
            args.push(
                Object.keys(this.reshape)
                .map((k) => `${k} = ${this.reshape[k]}`)
                .join(', ')
            )
        }

        if (this.selections.length > 0) {
            args.push(this.selections.join(', '))
        }

        const argstring = args.join(', ')
        return `|> select(${argstring})`
    }
}

export class MutateNode extends ProgramNode {
    public op = 'mutate'
    constructor(
        private resultName: string,
        private expression: string
    ) {
        super()
    }

    public rep() {
        // sorta the right idea, but we need to permit chaining functions
        // maybe focus first on functions of one variable?
        return `|> mutate(${this.resultName} = ${this.expression})`
    }
}

export class ParameterNode extends ProgramNode {
    public op = 'parameter'
    constructor(
        private name: string,
        private value: string
    ) {
        super()
    }

    public rep() {
        return `, ${this.name} = ${this.value}`
    }
}

export class JoinNode extends ProgramNode {
    public op = 'join'
    constructor(
        private kind: string,
        source: ProgramNode,
        joinCondition: string
    ) {
        super()
        this.setAfter(source)
        this.setAfter(new ParameterNode('by', `join_by(${joinCondition})`))
    }
    
    public rep() {
        return `|> ${this.kind}_join`
    }
}

export class WhereNode extends ProgramNode {
    public op = 'where'
    constructor(
        private condition: string
    ) {
        super()
    }

    public rep() {
        return `|> filter(${this.condition})`
    }
}

// sorry this is so gross
export function printProgram(root: ProgramNode, depth: number = 0): string {
    const tab = '    '.repeat(depth)
    const res = 
        (root.rep() == null
            ? ''
            : tab + root.rep() + (
                root.rep() == null || root.children.length == 0
                    ? '\n'
                    : root.children.length > 1 ? ' (\n' : ' ' // if there is only one child, put it on the same line
            )
        )
        + root.children
            .map((x) => printProgram(x,
                root.rep() == null
                    ? depth
                    : depth + (root.children.length > 1 ? 1 : 0)
            ))
            .reduce((total, x) => total + x, '')
        + (root.rep() == null || root.children.length == 0
            ? ''
            : tab + (root.children.length > 1 ? ')\n' : '')
        )
    return res
}
