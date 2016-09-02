/**
 * STOP program
 * @module ./exec
 */

import { isList } from './types/list';
import { isInteger, isNonnegativeInteger } from './types/number';
import * as Operations from './operations';
import parseInstruction from './parsing';
import {
    isDirectReference,
    isInstructionLocationReference,
    isInstructionPointerReference,
    isReference,
    isSpecialDirectReference,
    isStandardInputReference } from './types/reference';
import { isString } from './types/string';
import { isUndefined } from './types/undefined';

/**
 * Data input stream. Input should be STOP-parsable.
 * @callback inputCallback
 * @return {string}
 */

/**
 * Data output stream
 * @callback outputCallback
 * @param {string} data A STOP-parsable string.
 */

/**
 * State change callback. Notifies callers about program state changes.
 * @callback stateChangeCallback
 * @param {ProgramState} newState The new state of the program.
 * @param {ProgramState} oldState The old state of the program.
 * @returns {boolean} Whether the program should pause
 */

/**
 * A program state
 * @typedef {Object} ProgramState
 * @property {number} ip The instruction pointer
 * @property {module:./parsing.ParsedInstruction[]} instructions
 * @property {{instruction: module:./parsing.ParsedInstruction, pointer: number}[]} evaluationStack A stack of instructions to process while evaluating instruction arguments
 * @property {*} lastReturnedData The data returned by the last instruction
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
 * Whether the data has any direct references
 * @param {*} data
 * @returns {boolean}
 */
const hasDirectReferences = data => {
    if (isList(data)) {
        return data.some(hasDirectReferences);
    }

    return isDirectReference(data);
};

/**
 * Whether the data has any direct references
 * @param {*} data
 * @returns {boolean}
 */
const hasNonSpecialDirectReferences = data => {
    if (isList(data)) {
        return data.some(hasNonSpecialDirectReferences);
    }

    return isDirectReference(data) && !isSpecialDirectReference(data);
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
            lastReturnedData: instruction.data
        }));

/**
 * Finds the first index of a label within the set of instructions
 * @param {string|number|undefined} label
 * @param {module:./parsing.ParsedInstruction[]} instructions
 * @returns {number}
 */
const findLabelIndex = (label, instructions) => {
    if (isString(label)) {
        return instructions.findIndex(instruction =>
            instruction.label === label);
    } else if (isInteger(label)) {
        const modded = label % instructions.length;
        return modded < 0 ? modded + instructions.length : modded;
    }

    return -1;
};

/**
 * Builds an instruction string from instruction data
 * @param {module:./parsing.ParsedInstruction[]} instruction
 * @returns {string}
 */
const buildInstructionString = instruction => {
    let s = '';

    if (instruction.label) {
        s += `(${instruction.label}) `;
    }

    s += `${instruction.name} ${Operations.asInstructionString(instruction.data)}`;

    return s;
};

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
    const newLabelIp = findLabelIndex(instruction.data[1], state.instructions);
    let newInstructions = [...state.instructions];

    if (labelIp !== newLabelIp) {
        if (labelIp !== -1) {
            const removeFrom = {
                name: state.instructions[labelIp].name,
                data: state.instructions[labelIp].data
            };

            const removedFromString = buildInstructionString(removeFrom);
            removeFrom.toString = () => removedFromString;

            newInstructions.splice(labelIp, 1, removeFrom);
        }

        const addTo = {
            name: state.instructions[newLabelIp].name,
            data: state.instructions[newLabelIp].data,
            label: instruction.data[0]
        };

        const addToString = buildInstructionString(addTo);
        addTo.toString = () => addToString;

        newInstructions.splice(newLabelIp, 1, addTo);
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            instructions: newInstructions,
            lastReturnedData: undefined
        });
});

/**
 * Conditionally moves the instruction pointer to a label
 * @type {StateTransition}
 */
const gotoLabel = argumentCount(1, 2)((state, instruction) => {
    if (!(isList(instruction.data) &&
            (instruction.data.length === 2) &&
            (isString(instruction.data[0]) || isInteger(instruction.data[0])) &&
            ((instruction.data[1] === 0) || (instruction.data[1] === 1))) &&
        !(isString(instruction.data) || isInteger(instruction.data))) {
        throw new SyntaxError(
            `GOTO must take a string or integer and may take a condition ${instruction}`);
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
            lastReturnedData: undefined
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
                map(Operations.asInstructionString)
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

    // Since we've added a new instruction, every instruction in the evaluation
    // stack has moved forward by one.
    const newEvaluationStack = state.evaluationStack.map(evaluationItem =>
        Object.assign(
            {},
            evaluationItem,
            {
                pointer: evaluationItem.pointer + 1
            }));

    return Object.assign(
        {},
        state,
        {
            ip: newIp,
            instructions: newInstructions,
            evaluationStack: newEvaluationStack,
            lastReturnedData: undefined
        });
});

/**
 * Removes the first instruction from the set of instructions
 * @type {StateTransition}
 */
const pop = argumentCount(0, 0)(state => {
    const newInstructions = [...state.instructions];
    newInstructions.shift();

    // Since we've added a new instruction, every instruction in the evaluation
    // stack has moved forward by one.
    const newEvaluationStack = state.evaluationStack.map(evaluationItem =>
        Object.assign(
            {},
            evaluationItem,
            {
                pointer: evaluationItem.pointer - 1
            }));

    // Since we have removed an instruction from the front, the instruction
    // pointer automatically points to the next instruction.
    return Object.assign(
        {},
        state,
        {
            instructions: newInstructions,
            evaluationStack: newEvaluationStack,
            lastReturnedData: undefined
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
                map(Operations.asInstructionString)
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
            lastReturnedData: undefined
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
            lastReturnedData: undefined
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
            lastReturnedData: instruction.data.reduce(Operations.add)
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
            lastReturnedData: ret
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
            lastReturnedData: instruction.data.reduce(Operations.multiply)
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
            lastReturnedData: instruction.data.reduce(Operations.divide)
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
            lastReturnedData: instruction.data.reduce(Operations.mod)
        })));

/**
 * Performs the floor operation against a value
 * @type {StateTransition}
 */
const floor = disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            lastReturnedData: Operations.floor(instruction.data)
        }));

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
            lastReturnedData: ret
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
            lastReturnedData: ret
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
            lastReturnedData: ret
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
            lastReturnedData: instruction.data.every(datum =>
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
            lastReturnedData: equalResult.lastReturnedData ? 0 : 1
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
            lastReturnedData: ret
        });
}));

/**
 * Performs the shift operation on the values
 * @type {StateTransition}
 */
const shift = disallowReferences((state, instruction) => {
    let data;
    let amount;
    if (isList(instruction.data) && (instruction.data.length === 2)) {
        data = instruction.data[0];
        amount = instruction.data[1];

        if (!isInteger(amount)) {
            throw new SyntaxError(
                `SHIFT amount must be an integer ${instruction}`);
        }
    } else {
        data = instruction.data;
        amount = 1;
    }

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            lastReturnedData: Operations.shift(data, amount)
        });
});

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
                lastReturnedData: instruction.data.length
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
            lastReturnedData: instruction.data[0][instruction.data[1]]
        });
}));

/**
 * Writes a line to standard output
 * @type {StateTransition}
 */
const writeOutput = disallowReferences((state, instruction) => {
    state.stdout(Operations.asOutputString(instruction.data));

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            lastReturnedData: undefined
        });
});

/**
 * Writes a line to standard error
 * @type {StateTransition}
 */
const errorOutput = disallowReferences((state, instruction) => {
    state.stderr(Operations.asOutputString(instruction.data));

    return Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            lastReturnedData: undefined
        });
});

/**
 * Casts the instruction data to a number
 * @type {StateTransition}
 */
const asNumber = disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            lastReturnedData: Operations.asNumber(instruction.data)
        }));

/**
 * Casts the instruction data to a string
 * @type {StateTransition}
 */
const asString = disallowReferences((state, instruction) =>
    Object.assign(
        {},
        state,
        {
            ip: state.ip + 1,
            lastReturnedData: Operations.asString(instruction.data)
        }));

/**
 * A mapping between instruction names and instruction handlers
 */
const knownInstructions = new Map([
    ['ADD', add],
    ['ALTER', alter],
    ['AND', and],
    ['ASNUMBER', asNumber],
    ['ASSTRING', asString],
    ['DIV', divide],
    ['EJECT', eject],
    ['ERROR', errorOutput],
    ['EQUAL', equal],
    ['FLOOR', floor],
    ['GOTO', gotoLabel],
    ['INJECT', inject],
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
    ['SHIFT', shift],
    ['SUB', subtract],
    ['WRITE', writeOutput]
]);

/**
 * Pushes the referenced instruction to the head of the evaulation stack
 * @param {ProgramState} state The current program state
 * @param {module:./types/reference.Reference} reference The reference to deference
 * @returns {ProgramState} The updated program state
 */
const descendIntoDirectReference = (state, reference) => {
    const pointer = reference.instruction(state);
    const evaluationItem = {
        pointer,
        instruction: state.instructions[pointer]
    };

    return Object.assign(
        {},
        state,
        {
            evaluationStack: [...state.evaluationStack, evaluationItem]
        });
};

/**
 * Decays all indirect references into a direct references
 * @param {*} data The data which contains indirect references
 * @returns {*}
 */
const decayIndirectReferences = data => {
    if (isList(data)) {
        return data.map(datum => {
            if (isReference(datum)) {
                return datum.decay();
            }

            return datum;
        });
    } else if (isReference(data)) {
        return data.decay();
    }

    return data;
};

/**
 * Decays a reference to standard input
 * @returns {*}
 */
const decayStandardInputReference = state => {
    const line = state.stdin();
    const virtualInstruction = `NOOP ${line}`;
    const parsed = parseInstruction(virtualInstruction);

    if (hasReferences(parsed.data)) {
        throw new SyntaxError('$stdin cannot read references');
    }

    return parsed.data;
};

/**
 * Decays a special reference if possible
 * @param {ProgramState} state The current program state
 * @param {*} data The data which may contain a reference
 * @returns {*}
 */
const decaySpecialDirectReference = (state, data) => {
    if (isInstructionPointerReference(data)) {
        return state.ip;
    } else if (isInstructionLocationReference(data)) {
        const lastIndex = state.evaluationStack.length - 1;
        return state.evaluationStack[lastIndex].pointer;
    } else if (isStandardInputReference(data)) {
        return decayStandardInputReference(state);
    }

    return data;
};

/**
 * Decays all instruction pointer references to the left of the first direct
 * references
 * @param {ProgramState} state The current program state
 * @param {*} data The data which may contain references
 * @returns {*}
 */
const decayKnownInstructionPointerReferences = (state, data) => {
    if (isList(data)) {
        let hasSeenDirectReference = false;
        return data.map(datum => {
            if (!hasSeenDirectReference) {
                // As long as we have not seen a normal direct reference we can
                // decay the special direct references
                if (isSpecialDirectReference(datum)) {
                    // Decay the special direct reference
                    return decaySpecialDirectReference(state, datum);
                } else if (isList(datum) && hasDirectReferences(datum)) {
                    // Decay special direct references within a list
                    hasSeenDirectReference =
                        hasNonSpecialDirectReferences(datum);
                    return datum.map(item =>
                        decayKnownInstructionPointerReferences(state, item));
                } else if (isDirectReference(datum)) {
                    // A direct reference has been seen
                    hasSeenDirectReference = true;
                }
            }

            return datum;
        });
    }

    return decaySpecialDirectReference(state, data);
};

/**
 * Replaces the left-most direct reference with the given data
 * @param {*} originalData The data with a direct reference
 * @param {*} data The data which may contain references
 * @returns {*}
 */
const replaceFirstDirectReference = (originalData, data) => {
    if (isList(originalData)) {
        const index = originalData.findIndex(hasDirectReferences);

        let updatedData;
        if (index === 0) {
            updatedData = [
                replaceFirstDirectReference(originalData[0], data),
                ...originalData.slice(1)
            ];
        } else if (index === (originalData.length - 1)) {
            updatedData = [
                ...originalData.slice(0, -1),
                replaceFirstDirectReference(originalData[index], data)
            ];
        } else {
            updatedData = [
                ...originalData.slice(0, index),
                replaceFirstDirectReference(originalData[index], data),
                ...originalData.slice(index + 1)
            ];
        }

        return updatedData;
    }

    // The instruction's data must be a reference, just replace it.
    return data;
};

/**
 * Finds the first direct reference
 * @param {*} data The data to search for a direct reference
 * @returns {?module:./types/reference.Reference}
 */
const findFirstDirectReference = data => {
    if (isDirectReference(data)) {
        return data;
    }

    if (isList(data)) {
        const innerData = data.find(hasDirectReferences);
        return findFirstDirectReference(innerData);
    }

    return undefined;
};

/**
 * Advances the state of a program
 * @param {ProgramState} state The instruction pointer
 * @returns {ProgramState}
 */
const advanceState = state => {
    const lastIndex = state.evaluationStack.length - 1;
    const instruction = state.evaluationStack[lastIndex].instruction;
    if (!knownInstructions.has(instruction.name)) {
        throw new SyntaxError(`Unknown instruction ${instruction.name}`);
    }

    // Decay any references to the value of the instruction pointer that occur
    // before any other direct references because direct references may change
    // the instruction pointer.
    const ipDecayedInstruction = Object.assign(
        {},
        instruction,
        {
            data: decayKnownInstructionPointerReferences(
                state,
                instruction.data)
        });

    const ipDecayedEvaluationItem = Object.assign(
        {},
        state.evaluationStack[lastIndex],
        {
            instruction: ipDecayedInstruction
        });

    const ipDecayedState = Object.assign(
        {},
        state,
        {
            evaluationStack: [
                ...state.evaluationStack.slice(0, -1),
                ipDecayedEvaluationItem
            ]
        });

    const directReference =
        findFirstDirectReference(ipDecayedInstruction.data);
    if (directReference) {
        return descendIntoDirectReference(ipDecayedState, directReference);
    }

    const decayedData = decayIndirectReferences(ipDecayedInstruction.data);
    const decayedInstruction = Object.assign(
        {},
        ipDecayedInstruction,
        {
            data: decayedData
        });

    const reducedEvaluationStackState = Object.assign(
        {},
        ipDecayedState,
        {
            evaluationStack: ipDecayedState.evaluationStack.slice(0, -1)
        });

    const instructionHandler = knownInstructions.get(ipDecayedInstruction.name);
    const updatedState = instructionHandler(
        reducedEvaluationStackState,
        decayedInstruction);

    if (updatedState.evaluationStack.length > 0) {
        // We must have recursed downward due to an earlier direct reference.
        // Replace that reference with the data generated by this instruction.
        const evaluationItem = updatedState.evaluationStack[lastIndex - 1];
        const updatedData = replaceFirstDirectReference(
            evaluationItem.instruction.data,
            updatedState.lastReturnedData);
        const updatedEvaluationItem = Object.assign(
            {},
            evaluationItem,
            {
                instruction: Object.assign(
                    {},
                    evaluationItem.instruction,
                    {
                        data: updatedData
                    })
            });

        return Object.assign(
            {},
            updatedState,
            {
                // The set of instructions may have been updated while
                // processing this instruction, reset the instruction pointer
                // to the current location of the top-level instruction.
                ip: updatedState.evaluationStack[0].pointer,
                evaluationStack: [
                    ...updatedState.evaluationStack.slice(0, -1),
                    updatedEvaluationItem
                ]
            });
    }

    return updatedState;
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
     * @param {stateChangeCallback} onStateChange
     */
    constructor(
        instructions = [],
        {
            stdin = () => 'UNDEFINED',
            stdout = () => {},
            stderr = () => {},
            onStateChange = () => {}
        } = {}) {
        this.state = {
            stdin,
            stdout,
            stderr
        };

        this.onStateChange = onStateChange;
        this.parsedInstructions = instructions.map(parseInstruction);
        this.reset();
    }

    /**
     * Runs the STOP program until the state change callback requests the
     * program to pause. Calling this method again will continue the execution.
     */
    go() {
        while (!this.isCompleted) {
            if (this.state.evaluationStack.length === 0) {
                this.state.evaluationStack.push({
                    instruction: this.state.instructions[this.state.ip],
                    pointer: this.state.ip
                });
            }

            const newState = advanceState(this.state);
            const shouldPause = this.onStateChange(newState, this.state);
            this.state = newState;

            if (shouldPause) {
                break;
            }
        }
    }

    /**
     * Resets the program to its original state.
     */
    reset() {
        this.state = Object.assign(
            {},
            this.state,
            {
                ip: 0,
                instructions: this.parsedInstructions,
                evaluationStack: [],
                lastReturnedData: undefined
            });

        this.onStateChange(this.state, this.state);
    }

    get currentResult() {
        return this.state.lastReturnedData;
    }

    get isCompleted() {
        return this.state.ip >= this.state.instructions.length;
    }
}
