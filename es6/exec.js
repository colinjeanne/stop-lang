/**
 * STOP program
 * @module ./exec
 */

import { isList } from './types/list';
import { isInteger, isNonnegativeInteger } from './types/number';
import * as Operations from './operations';
import parseInstruction from './parsing';
import { isReference } from './types/reference';
import { isString } from './types/string';
import { isUndefined } from './types/undefined';

/**
 * Data input stream. Input should be STOP-parsable.
 * @callback inputCallback
 * @return {string}
 */

/**
 * Data output stream.
 * @callback outputCallback
 * @param {string} data A STOP-parsable string.
 */

/**
 * A program state
 * @typedef {Object} ProgramState
 * @property {number} ip The instruction pointer
 * @property {module:./parsing.ParsedInstruction[]} instructions
 * @property {*} data The data returned by the last instruction
 * @property {inputCallback} stdin
 * @property {outputCallback} stdout
 * @property {outputCallback} stderr
 */

/**
 * Updates a program state
 * @callback StateTransition
 * @param {ProgramState} state The current program state
 * @param {module:./parsing.ParsedInstruction} instruction The executing instruction
 * @returns {ProgramState}
 */

/**
 * Whether the data has any references
 * @param {*} data
 * @returns {boolean}
 */
const hasReferences = data => {
    if (isList(data)) {
        return data.some(hasReferences);
    }

    return isReference(data);
};

/**
 * Converts a STOP reference into its referenced value
 * @param {ProgramState} state The current program state
 * @param {module:./types/reference.Reference} reference The reference to deference
 * @returns {{instructions: module:./parsing.ParsedInstruction[], data: *}} The
 * updated set of instructions and the dereferenced value
 */
const dereference = (state, reference) => {
    let ret = {
        instructions: state.instructions,
    };

    if (!reference.isIndirect) {
        if ((reference.base === 'ip') && (reference.offset === 0)) {
            ret.data = state.ip;
        } else {
            const referenceState = Object.assign(
                {},
                state,
                {
                    ip: reference.instruction(state.ip, state.instructions)
                });
            const updatedState = executeInstruction(referenceState);

            ret.instructions = updatedState.instructions;
            ret.data = updatedState.data;
        }
    } else {
        // Convert the double reference into a single reference
        ret.data = reference.decay();
    }

    return ret;
};

/**
 * Converts a single or a list of STOP reference into their referenced values
 * @param {ProgramState} state The current program state
 * @param {*} data A stop data type
 * @returns {{state: ProgramState, data: *}} The updated program state and the
 * dereferenced values
 */
const collectReferences = (state, data) => {
    if (hasReferences(data)) {
        if (isList(data)) {
            data.reduce(
                (aggregate, datum) => {
                    const {state: updatedState, data: dereferencedData} =
                        collectReferences(aggregate.state, datum);
                    return Object.assign(
                        {},
                        aggregate,
                        {
                            state: updatedState,
                            data: [...aggregate.data, dereferencedData]
                        });
                },
                {
                    state,
                    data: []
                });
        } else if (isReference(data)) {
            const {instructions, data: dereferencedData} =
                dereference(state, data);

            return {
                state: Object.assign(
                    {},
                    state,
                    {
                        instructions
                    }),
                data: dereferencedData
            };
        }
    }

    return {
        state,
        data
    };
};

/**
 * Converts all STOP references in an instruction to their referenced values
 * @param {ProgramState} state The current program state
 * @param {module:./parsing.ParsedInstruction} instruction The executing instruction
 * @returns {{state: ProgramState, instruction: module:./parsing.ParsedInstruction}} The
 * updated program state and the instruction with the dereferenced data values
 */
const applyReferences = (state, instruction) => {
    if (hasReferences(instruction.data)) {
        if (isList(instruction.data)) {
            return instruction.data.reduce(
                (aggregate, datum) => {
                    const {state: updatedState, data: dereferencedData} =
                        collectReferences(aggregate.state, datum);

                    return {
                        state: Object.assign(
                            {},
                            aggregate.state,
                            {
                                instructions: updatedState.instructions
                            }),
                        instruction: Object.assign(
                            {},
                            aggregate.instruction,
                            {
                                data: [
                                    ...aggregate.instruction.data,
                                    dereferencedData
                                ]
                            })
                    };
                },
                {
                    state,
                    instruction: Object.assign(
                        {},
                        instruction,
                        {
                            data: []
                        })
                });
        } else if (isReference(instruction.data)) {
            const {instructions, data} =
                dereference(state, instruction.data);

            return {
                state: Object.assign(
                    {},
                    state,
                    {
                        instructions
                    }),
                instruction: Object.assign(
                    {},
                    instruction,
                    {
                        data
                    })
            };
        }
    }

    return {
        state,
        instruction
    };
};

/**
 * Prevents references from being passed to an instruction handler
 * @param {StateTransition} op
 * @returns {ProgramState}
 */
const disallowReferences = op =>
    (state, instruction) => {
        const name = instruction.name;

        if (hasReferences(instruction.data)) {
            throw new SyntaxError(
                `${name} cannot take double references ${instruction}`);
        }

        return op(state, instruction);
    };

/**
 * Ensures a specific number of arguments
 * @param {number} min The minimum number of arguments
 * @param {number} max The maximum number of arguments
 * @returns {*}
 */
const argumentCount = (min, max) => op =>
    (state, instruction) => {
        const name = instruction.name;

        let argumentCount = 0;
        if (isList(instruction.data)) {
            argumentCount = instruction.data.length;
        } else if (isUndefined(instruction.data)) {
            argumentCount = 0;
        } else {
            argumentCount = 1;
        }

        if (min !== max) {
            if (argumentCount < min) {
                throw new SyntaxError(
                    `${name} must take at least ${min} arguments`);
            }

            if (!isUndefined(max) && (argumentCount > max)) {
                throw new SyntaxError(
                    `${name} cannot take more than ${max} arguments`);
            }
        } else if (argumentCount !== min) {
            throw new SyntaxError(`${name} must take ${min} arguments`);
        }

        return op(state, instruction);
    };

/**
 * Returns the passed in data unchanged
 * @type {StateTransition}
 */
const noop = disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: instruction.data
        }));

/**
 * Finds the first index of a label within the set of instructions
 * @param {string} label
 * @param {module:./parsing.ParsedInstruction[]} instructions
 * @returns {number}
 */
const findLabelIndex = (label, instructions) =>
    instructions.findIndex(instruction =>
        instruction.label === label);

/**
 * Moves a label to a new location within the set of instructions
 * @type {StateTransition}
 */
const alter = argumentCount(2, 2)((state, instruction) => {
    if ((!isString(instruction.data[0]) &&
         !isUndefined(instruction.data[0])) ||
        !isInteger(instruction.data[1])) {
        throw new SyntaxError(
            `ALTER must take a string or UNDEFINED and an integer ${instruction}`);
    }

    const labelIp = findLabelIndex(instruction.data[0], state.instructions);
    const newLabelIp = instruction.data[1] % state.instructions.length;
    let newInstructions = [...state.instructions];

    if (labelIp !== newLabelIp) {
        if (labelIp !== -1) {
            const removeFrom = {
                name: state.instructions[labelIp].name,
                data: state.instructions[labelIp].data
            };

            newInstructions.splice(labelIp, 1, removeFrom);
        }

        const addTo = {
            name: state.instructions[newLabelIp].name,
            data: state.instructions[newLabelIp].data,
            label: instruction.data[0]
        };

        newInstructions.splice(newLabelIp, 1, addTo);
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            instructions: newInstructions,
            data: undefined
        });
});

/**
 * Conditionally moves the instruction pointer to a label
 * @type {StateTransition}
 */
const gotoLabel = argumentCount(1, 2)((state, instruction) => {
    if (!(isList(instruction.data) &&
            (instruction.data.length === 2) &&
            isString(instruction.data[0]) &&
            ((instruction.data[1] === 0) || (instruction.data[1] === 1))) &&
        !isString(instruction.data)) {
        throw new SyntaxError(
            `GOTO must take a string and may take a condition ${instruction}`);
    }

    let label;
    let condition;
    if (isList(instruction.data)) {
        label = instruction.data[0];
        condition = instruction.data[1];
    } else {
        label = instruction.data;
        condition = true;
    }

    const labelIp = findLabelIndex(label, state.instructions);
    if (labelIp === -1) {
        throw new SyntaxError(`Unable to find label ${instruction}`);
    }

    const newIp = condition ? labelIp : state.ip + 1;

    return Object.assign(
        {},
        state,
        {
            ip: newIp,
            data: undefined
        });
});

/**
 * Adds a new instruction to the front of the set of instructions
 * @type {StateTransition}
 */
const push = argumentCount(1)((state, instruction) => {
    if (isUndefined(instruction.data) ||
        (isList(instruction.data) &&
         ((instruction.data.length === 0) ||
           !isString(instruction.data[0]))) &&
        !isString(instruction.data)) {
        throw new SyntaxError(
            `PUSH must take an instruction ${instruction}`);
    }

    let newInstruction;
    if (isList(instruction.data)) {
        const instructionString = [
            instruction.data[0],
            ...instruction.data.
                slice(1).
                map(Operations.valueToString)
        ].join(' ');

        newInstruction = parseInstruction(instructionString);
    } else {
        newInstruction = parseInstruction(instruction.data);
    }

    const newInstructions = [newInstruction, ...state.instructions];

    // Move the IP forward by two since we are adding an instruction to the
    // front and so the next instruction will be this one with if moved
    // normally.
    const newIp = state.ip + 2;

    return Object.assign(
        {},
        state,
        {
            ip: newIp,
            instructions: newInstructions,
            data: undefined
        });
});

/**
 * Removes the first instruction from the set of instructions
 * @type {StateTransition}
 */
const pop = argumentCount(0, 0)(state => {
    const newInstructions = [...state.instructions];
    newInstructions.shift();

    // Since we have removed an instruction from the front, the instruction
    // pointer automatically points to the next instruction.
    return Object.assign(
        {},
        state,
        {
            instructions: newInstructions,
            data: undefined
        });
});

/**
 * Adds a new instruction to the end of the set of instructions
 * @type {StateTransition}
 */
const inject = argumentCount(1)((state, instruction) => {
    if (isUndefined(instruction.data) ||
        (isList(instruction.data) &&
         ((instruction.data.length === 0) ||
           !isString(instruction.data[0]))) &&
        !isString(instruction.data)) {
        throw new SyntaxError(
            `INJECT must take an instruction ${instruction}`);
    }

    let newInstruction;
    if (isList(instruction.data)) {
        const instructionString = [
            instruction.data[0],
            ...instruction.data.
                slice(1).
                map(Operations.valueToString)
        ].join(' ');

        newInstruction = parseInstruction(instructionString);
    } else {
        newInstruction = parseInstruction(instruction.data);
    }

    const newInstructions = [...state.instructions, newInstruction];

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            instructions: newInstructions,
            data: undefined
        });
});

/**
 * Removes the last instruction from the set of instructions
 * @type {StateTransition}
 */
const eject = argumentCount(0, 0)(state => {
    const newInstructions = [...state.instructions];
    newInstructions.pop();

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            instructions: newInstructions,
            data: undefined
        });
});

/**
 * Adds two values or adds an item to the end of a list
 * @type {StateTransition}
 */
const add = argumentCount(2)(disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: instruction.data.reduce(Operations.add)
        })));

/**
 * Subtracts two numbers or removes values at specified indices in strings and
 * lists
 * @type {StateTransition}
 */
const subtract = argumentCount(2)(disallowReferences((state, instruction) => {
    const rhsArguments = instruction.data.slice(1);

    let ret;
    if (rhsArguments.every(isNonnegativeInteger) &&
        (rhsArguments.length > 0) &&
        (isString(instruction.data[0]) || isList(instruction.data[0]))) {
        ret = Operations.subtract(instruction.data[0], rhsArguments);
    } else {
        ret = instruction.data.reduce(Operations.subtract);
    }


    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: ret
        });
}));

/**
 * Multiplies numbers or repeats strings and arrays
 * @type {StateTransition}
 */
const multiply = argumentCount(2)(disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: instruction.data.reduce(Operations.multiply)
        })));

/**
 * Divides values
 * @type {StateTransition}
 */
const divide = argumentCount(2)(disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: instruction.data.reduce(Operations.divide)
        })));

/**
 * Performs the modulus operation against values
 * @type {StateTransition}
 */
const mod = argumentCount(2)(disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: instruction.data.reduce(Operations.mod)
        })));

/**
 * Bitwise ANDs values or finds the intersection of lists
 * @type {StateTransition}
 */
const and = disallowReferences((state, instruction) => {
    let ret = 0;
    if (isList(instruction.data) && (instruction.data.length > 0)) {
        ret = instruction.data.reduce(Operations.and);
    } else {
        ret = Operations.truthy(instruction.data);
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: ret
        });
});

/**
 * Bitwise ORs values or finds the union of lists
 * @type {StateTransition}
 */
const or = disallowReferences((state, instruction) => {
    let ret = 0;
    if (isList(instruction.data) && (instruction.data.length > 0)) {
        ret = instruction.data.reduce(Operations.or);
    } else {
        ret = Operations.truthy(instruction.data);
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: ret
        });
});

/**
 * Bitwise NOTs values or finds the set difference between lists
 * @type {StateTransition}
 */
const not = disallowReferences((state, instruction) => {
    let ret = 1;
    if (isList(instruction.data) &&
        (instruction.data.length > 0) &&
        instruction.data.every(isList)) {
        const rest = [].concat(...instruction.data.slice(1));
        ret = instruction.data[0].filter(datum => rest.indexOf(datum) === -1);
    } else {
        ret = Operations.falsey(instruction.data);
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: ret
        });
});

/**
 * Returns 1 if all STOP values are equal and 0 otherwise
 * @type {StateTransition}
 */
const equal = argumentCount(2)(disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: instruction.data.every(datum =>
                Operations.areEqual(
                    datum,
                    instruction.data[0])) ? 1 : 0
        })));

/**
 * Returns 0 is any STOP value is not equal to the others and 1 otherwise
 * @type {StateTransition}
 */
const notEqual = argumentCount(2)(disallowReferences((state, instruction) => {
    const equalResult = equal(state, instruction);

    return Object.assign(
        {},
        equalResult,
        {
            data: equalResult.data ? 0 : 1
        });
}));

/**
 * Returns 1 if the arguments form a monotonically decreasing series
 * @type {StateTransition}
 */
const less = argumentCount(2)(disallowReferences((state, instruction) => {
    let ret = 1;
    for (let i = 1; i < instruction.data.length; ++i) {
        const previousValue = instruction.data[i - 1];

        // Use not less than since some types (like undefined) are not ordered
        // with other types and so will return false for all comparisons.
        if (!Operations.less(previousValue, instruction.data[i])) {
            ret = 0;
            break;
        }
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: ret
        });
}));

/**
 * Returns the length of a list or string
 * @type {StateTransition}
 */
const dataLength = argumentCount(1)(disallowReferences(
    (state, instruction) => {
        if (!isString(instruction.data) && !isList(instruction.data)) {
            throw new SyntaxError(
                `LENGTH data must be a string or list ${instruction}`);
        }

        return Object.assign(
            {},
            state,
            {
                ip: state.ip + 1,
                data: instruction.data.length
            });
    }));

/**
 * Retrieves the value at a given index in a list or string
 * @type {StateTransition}
 */
const item = argumentCount(2, 2)(disallowReferences((state, instruction) => {
    if (!isString(instruction.data[0]) && !isList(instruction.data[0])) {
        throw new SyntaxError(
            `ITEM data must be a string or list ${instruction}`);
    }

    if (!isNonnegativeInteger(instruction.data[1])) {
        throw new SyntaxError(
            `ITEM index must be a nonnegative integer ${instruction}`);
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: instruction.data[0][instruction.data[1]]
        });
}));

/**
 * Returns a line from standard input
 * @type {StateTransition}
 */
const readInput = argumentCount(0, 0)(disallowReferences(state => {
    const line = state.stdin();
    const virtualInstruction = `NOOP ${line}`;
    const parsed = parseInstruction(virtualInstruction);

    if (hasReferences(parsed.data)) {
        throw new Error('READ cannot read references');
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: parsed.data
        });
}));

/**
 * Writes a line to standard output
 * @type {StateTransition}
 */
const writeOutput = disallowReferences((state, instruction) => {
    state.stdout(Operations.valueToString(instruction.data));

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: undefined
        });
});

/**
 * Writes a line to standard error
 * @type {StateTransition}
 */
const errorOutput = disallowReferences((state, instruction) => {
    state.stderr(Operations.valueToString(instruction.data));

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            data: undefined
        });
});

/**
 * A mapping between instruction names and instruction handlers
 */
const knownInstructions = new Map([
    ['ADD', add],
    ['ALTER', alter],
    ['AND', and],
    ['DIV', divide],
    ['EJECT', eject],
    ['ERROR', errorOutput],
    ['EQUAL', equal],
    ['GOTO', gotoLabel],
    ['INJECT', inject],
    ['READ', readInput],
    ['ITEM', item],
    ['LENGTH', dataLength],
    ['LESS', less],
    ['MOD', mod],
    ['MUL', multiply],
    ['NEQUAL', notEqual],
    ['NOOP', noop],
    ['NOT', not],
    ['OR', or],
    ['POP', pop],
    ['PUSH', push],
    ['SUB', subtract],
    ['WRITE', writeOutput]
]);

/**
 * Executes an instruction
 * @param {ProgramState} state The instruction pointer
 * @returns {ProgramState}
 */
const executeInstruction = state => {
    const instruction = state.instructions[state.ip];
    if (!knownInstructions.has(instruction.name)) {
        throw new SyntaxError(`Unknown instruction ${instruction.name}`);
    }

    const instructionHandler = knownInstructions.get(instruction.name);
    const {state: updatedState, instruction: dereferencedInstruction} =
        applyReferences(state, instruction);
    return instructionHandler(updatedState, dereferencedInstruction);
};

/**
 * A STOP program
 */
export default class Program {
    /**
     * Creates a STOP program
     * @param {module:./parsing.ParsedInstruction[]}
     * @param {inputCallback} stdin
     * @param {outputCallback} stdout
     * @param {outputCallback} stderr
     */
    constructor(
        instructions = [],
        stdin = () => {},
        stdout = () => {},
        stderr = () => {}) {
        this.state = {
            ip: 0,
            instructions: instructions.map(parseInstruction),
            stdin,
            stdout,
            stderr
        };
    }

    /**
     * Executes the STOP program and returns the result of the final
     * instruction
     */
    execute() {
        while (this.state.ip < this.state.instructions.length) {
            this.state = executeInstruction(this.state);
        }

        return this.state.data;
    }
}
