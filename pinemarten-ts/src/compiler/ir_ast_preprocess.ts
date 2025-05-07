import { Expression, ObjectLiteral, PropertyAssignment, Identifier, childrenOf } from './ir_ast';

function findObjectIdentifiers(expr: Expression): Identifier[] {
    if (expr.type == 'Identifier') { // TODO: Check for object type.
        return [expr as Identifier];
    }
    return childrenOf(expr).map(findObjectIdentifiers).flat();
}

function dataScopeIdentifier(obj: ObjectLiteral): Identifier {
    const objectIdentifiers = findObjectIdentifiers(obj);
    if (objectIdentifiers.length > 1) {
        throw Error(`Multiple object references within an object literal are not permitted. Object:\n${objectIdentifiers}`);
    }
    return objectIdentifiers[0];
}
