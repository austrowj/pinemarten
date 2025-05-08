import { Expression, ObjectLiteral, PropertyAssignment, Identifier, childrenOf, substitute } from './ast_simple';

export function walk(expr: Expression) {
    // All the transformations to apply.
    return substitute(expr, implementChoose);
}

/*
    Try to compile certain Dataframe functions into valid R code.
*/
function implementChoose(expr: Expression): Expression {
    if (expr.type != 'FunctionCall') return expr;
    
    const func = expr.functionName;
    if (func.type == 'PropertyAccess' && func.objectIsDataframe) {
        // Now we have something to do.
        if (func.property == 'choose') return {
            type: 'FunctionCall',
            arguments: expr.arguments,
            functionName: {
                type: func.type,
                object: func.object,
                property: 'dplyr::select',
                propertyIsFunction: true,
                objectIsDataframe: true
            }
        }
        if (func.property == 'rename') return {
            // TODO: this doesn't really work, we have to translate the object literal somehow.
            // It's not straightforward because instead of an actual object literal we might have a function
            // that returns a data-mask.
            type: 'FunctionCall',
            arguments: expr.arguments.concat({
                type: 'Literal',
                text: '.keep = "unused"' // lmao nice hack bruh
            }),
            functionName: {
                type: func.type,
                object: func.object,
                property: 'dplyr::mutate',
                propertyIsFunction: true,
                objectIsDataframe: true
            }
        }
    }

    return expr;
}

/*
    These two are for limiting the number of identifiers in a block to one.
    However, I don't think this is a good design and they aren't currently used.
*/
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
