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
 */

/**
 * Updates a program state
 * @callback StateTransition
 * @param {number} ip The current instruction pointer
 * @param {module:./parsing.ParsedInstruction[]} instructions The current
 * instructions
 * @param {*} data The STOP data for the current instruction
 * @param {inputCallback} stdin
 * @param {outputCallback} stdout
 * @param {outputCallback} stderr
 * @returns {ProgramState}
 */

/**
 * Converts a STOP reference into its referenced value
 * @type {StateTransition}
 */
const applyReference = (ip, instructions, datum, stdin, stdout, stderr) => {
    let ret = {
        ip,
        instructions,
        data: datum
    };

    if (isReference(datum)) {
        if (!datum.isIndirect) {
            if (datum.isRelative && (datum.ref === 0)) {
                ret.data = ip;
            } else {
                const finalIp = datum.instruction(ip, instructions);
                const instructionRet =
                    executeInstruction(
                        finalIp,
                        instructions,
                        stdin,
                        stdout,
                        stderr);

                ret.instructions = instructionRet.instructions;
                ret.data = instructionRet.ret;
            }
        } else {
            // Convert the double reference into a single reference
            ret.data = datum.decay();
        }
    } else if (isList(datum)) {
        ({instructions: ret.instructions, data: ret.data} =
            applyReferences(
                ip,
                instructions,
                datum,
                stdin,
                stdout,
                stderr));
    }
    return ret;
};

/**
 * Converts all STOP references in an instruction to their referenced values
 * @type {StateTransition}
 */
const applyReferences = (ip, instructions, data, stdin, stdout, stderr) =>
    data.reduce(
        (state, datum) => {
            const appliedRet =
                applyReference(
                    ip,
                    state.instructions,
                    datum,
                    stdin,
                    stdout,
                    stderr);
            state.instructions = appliedRet.instructions;
            state.data.push(appliedRet.data);
            return state;
        },
        {
            instructions,
            data: []
        });

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
 * Prevents references from being passed to an instruction handler
 * @param {StateTransition} op
 * @returns {ProgramState}
 */
const disallowReferences = op =>
    (ip, instructions, data, stdin, stdout, stderr) => {
        const instruction = instructions[ip];
        const name = instruction.name;

        if (hasReferences(data)) {
            throw new SyntaxError(
                `${name} cannot take double references ${instruction}`);
        }

        return op(ip, instructions, data, stdin, stdout, stderr);
    };

/**
 * Ensures a specific number of arguments
 * @param {StateTransition} op
 * @returns {ProgramState}
 */
const argumentCount = (min, max) => op =>
    (ip, instructions, data, stdin, stdout, stderr) => {
        const instruction = instructions[ip];
        const name = instruction.name;

        let argumentCount = 0;
        if (isList(data)) {
            argumentCount = data.length;
        } else if (isUndefined(data)) {
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

        return op(ip, instructions, data, stdin, stdout, stderr);
    };

/**
 * Returns the passed in data unchanged
 * @type {StateTransition}
 */
const noop = disallowReferences((ip, instructions, data) => ({
    ip: ++ip,
    instructions,
    ret: data
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
const alter = argumentCount(2, 2)((ip, instructions, data) => {
    const instruction = instructions[ip];

    if (!isString(data[0]) || !isInteger(data[1])) {
        throw new SyntaxError(
            `ALTER must take a string and an integer ${instruction}`);
    }

    const labelIp = findLabelIndex(data[0], instructions);
    if (labelIp === -1) {
        throw new SyntaxError(`Unable to find label ${instruction}`);
    }

    const newLabelIp = data[1] % instructions.length;
    let newInstructions = [...instructions];

    if (labelIp !== newLabelIp) {
        const removeFrom = {
            name: instructions[labelIp].name,
            data: instructions[labelIp].data
        };

        const addTo = {
            name: instructions[newLabelIp].name,
            data: instructions[newLabelIp].data,
            label: data[0]
        };
        newInstructions.splice(labelIp, 1, removeFrom);
        newInstructions.splice(newLabelIp, 1, addTo);
    }

    return {
        ip: ++ip,
        instructions: newInstructions
    };
});

/**
 * Conditionally moves the instruction pointer to a label
 * @type {StateTransition}
 */
const gotoLabel = argumentCount(1, 2)((ip, instructions, data) => {
    const instruction = instructions[ip];

    if (!(isList(data) &&
            (data.length === 2) &&
            isString(data[0]) &&
            ((data[1] === 0) || (data[1] === 1))) &&
        !isString(data)) {
        throw new SyntaxError(
            `GOTO must take a string and may take a condition ${instruction}`);
    }

    let label;
    let condition;
    if (isList(data)) {
        label = data[0];
        condition = data[1];
    } else {
        label = data;
        condition = true;
    }

    const labelIp = findLabelIndex(label, instructions);
    if (labelIp === -1) {
        throw new SyntaxError(`Unable to find label ${instruction}`);
    }

    const newIp = condition ? labelIp : ++ip;

    return {
        ip: newIp,
        instructions
    };
});

/**
 * Adds a new instruction to the front of the set of instructions
 * @type {StateTransition}
 */
const push = argumentCount(1)((ip, instructions, data) => {
    const instruction = instructions[ip];

    if (isUndefined(data) ||
        (isList(data) && ((data.length === 0) || !isString(data[0]))) &&
        !isString(data)) {
        throw new SyntaxError(
            `PUSH must take an instruction ${instruction}`);
    }

    let newInstruction;
    if (isList(data)) {
        newInstruction = {
            name: data[0],
            data: data.slice(1)
        };
    } else {
        newInstruction = {
            name: data,
            data: []
        };
    }

    const newInstructions = [newInstruction, ...instructions];

    // Move the IP forward by two since we are adding an instruction to the
    // front and so the next instruction will be this one with if moved
    // normally.
    const newIp = ip + 2;

    return {
        ip: newIp,
        instructions: newInstructions
    };
});

/**
 * Removes the first instruction from the set of instructions
 * @type {StateTransition}
 */
const pop = argumentCount(0, 0)((ip, instructions) => {
    const newInstructions = [...instructions];
    newInstructions.shift();

    return {
        // Since we have removed an instruction from the front, the instruction
        // pointer automatically points to the next instruction.
        ip: ip,
        instructions: newInstructions
    };
});

/**
 * Adds a new instruction to the end of the set of instructions
 * @type {StateTransition}
 */
const inject = argumentCount(1)((ip, instructions, data) => {
    const instruction = instructions[ip];

    if (isUndefined(data) ||
        (isList(data) && ((data.length === 0) || !isString(data[0]))) &&
        !isString(data)) {
        throw new SyntaxError(
            `INJECT must take an instruction ${instruction}`);
    }

    let newInstruction;
    if (isList(data)) {
        newInstruction = {
            name: data[0],
            data: data.slice(1)
        };
    } else {
        newInstruction = {
            name: data,
            data: []
        };
    }

    const newInstructions = [...instructions, newInstruction];

    return {
        ip: ++ip,
        instructions: newInstructions
    };
});

/**
 * Removes the last instruction from the set of instructions
 * @type {StateTransition}
 */
const eject = argumentCount(0, 0)((ip, instructions) => {
    const newInstructions = [...instructions];
    newInstructions.pop();

    return {
        ip: ++ip,
        instructions: newInstructions
    };
});

/**
 * Adds two values or adds an item to the end of a list
 * @type {StateTransition}
 */
const add = argumentCount(2)(disallowReferences((ip, instructions, data) => {
    return {
        ip: ++ip,
        instructions,
        ret: data.reduce(Operations.add)
    };
}));

/**
 * Subtracts two numbers or removes values at specified indices in strings and
 * lists
 * @type {StateTransition}
 */
const subtract = argumentCount(2)(
    disallowReferences((ip, instructions, data) => {
        const rhsArguments = data.slice(1);

        let ret;
        if (rhsArguments.every(isNonnegativeInteger) &&
            (rhsArguments.length > 0) &&
            (isString(data[0]) || isList(data[0]))) {
            ret = Operations.subtract(data[0], rhsArguments);
        } else {
            ret = data.reduce(Operations.subtract);
        }


        return {
            ip: ++ip,
            instructions,
            ret
        };
    }));

/**
 * Multiplies numbers or repeats strings and arrays
 * @type {StateTransition}
 */
const multiply = argumentCount(2)(
    disallowReferences((ip, instructions, data) => {
        return {
            ip: ++ip,
            instructions,
            ret: data.reduce(Operations.multiply)
        };
    }));

/**
 * Divides values
 * @type {StateTransition}
 */
const divide = argumentCount(2)(
    disallowReferences((ip, instructions, data) => {
        return {
            ip: ++ip,
            instructions,
            ret: data.reduce(Operations.divide)
        };
    }));

/**
 * Performs the modulus operation against values
 * @type {StateTransition}
 */
const mod = argumentCount(2)(disallowReferences((ip, instructions, data) => {
    return {
        ip: ++ip,
        instructions,
        ret: data.reduce(Operations.mod)
    };
}));

/**
 * Bitwise ANDs values or finds the intersection of lists
 * @type {StateTransition}
 */
const and = disallowReferences((ip, instructions, data) => {
    let ret = 0;
    if (isList(data) && (data.length > 0)) {
        ret = data.reduce(Operations.and);
    } else {
        ret = Operations.truthy(data);
    }

    return {
        ip: ++ip,
        instructions,
        ret: ret
    };
});

/**
 * Bitwise ORs values or finds the union of lists
 * @type {StateTransition}
 */
const or = disallowReferences((ip, instructions, data) => {
    let ret = 0;
    if (isList(data) && (data.length > 0)) {
        ret = data.reduce(Operations.or);
    } else {
        ret = Operations.truthy(data);
    }

    return {
        ip: ++ip,
        instructions,
        ret: ret
    };
});

/**
 * Bitwise NOTs values or finds the set difference between lists
 * @type {StateTransition}
 */
const not = disallowReferences((ip, instructions, data) => {
    let ret = 1;
    if (isList(data) && (data.length > 0) && data.every(isList)) {
        const rest = [].concat(...data.slice(1));
        ret = data[0].filter(datum => rest.indexOf(datum) === -1);
    } else {
        ret = Operations.falsey(data);
    }

    return {
        ip: ++ip,
        instructions,
        ret: ret
    };
});

/**
 * Returns 1 if all STOP values are equal and 0 otherwise
 * @type {StateTransition}
 */
const equal = argumentCount(2)(disallowReferences((ip, instructions, data) => {
    return {
        ip: ++ip,
        instructions,
        ret: data.every(datum => Operations.areEqual(datum, data[0])) ? 1 : 0
    };
}));

/**
 * Returns 0 is any STOP value is not equal to the others and 1 otherwise
 * @type {StateTransition}
 */
const notEqual = argumentCount(2)(
    disallowReferences((ip, instructions, data) => {
        const equalResult = equal(ip, instructions, data);

        return {
            ip: ++ip,
            instructions,
            ret: equalResult.ret ? 0 : 1
        };
    }));

/**
 * Returns 1 if the arguments form a monotonically decreasing series
 * @type {StateTransition}
 */
const less = argumentCount(2)(disallowReferences((ip, instructions, data) => {
    let ret = 1;
    for (let i = 1; i < data.length; ++i) {
        const previousValue = data[i - 1];

        // Use not less than since some types (like undefined) are not ordered
        // with other types and so will return false for all comparisons.
        if (!Operations.less(previousValue, data[i])) {
            ret = 0;
            break;
        }
    }

    return {
        ip: ++ip,
        instructions,
        ret
    };
}));

/**
 * Returns the length of a list or string
 * @type {StateTransition}
 */
const dataLength = argumentCount(1)(
    disallowReferences((ip, instructions, data) => {
        const instruction = instructions[ip];

        if (!isString(data) && !isList(data)) {
            throw new SyntaxError(
                `LENGTH data must be a string or list ${instruction}`);
        }

        return {
            ip: ++ip,
            instructions,
            ret: data.length
        };
    }));

/**
 * Retrieves the value at a given index in a list or string
 * @type {StateTransition}
 */
const item = argumentCount(2, 2)(
    disallowReferences((ip, instructions, data) => {
        const instruction = instructions[ip];

        if (!isString(data[0]) && !isList(data[0])) {
            throw new SyntaxError(
                `ITEM data must be a string or list ${instruction}`);
        }

        if (!isNonnegativeInteger(data[1])) {
            throw new SyntaxError(
                `ITEM index must be a nonnegative integer ${instruction}`);
        }

        return {
            ip: ++ip,
            instructions,
            ret: data[0][data[1]]
        };
    }));

/**
 * Returns a line from standard input
 * @type {StateTransition}
 */
const readInput = argumentCount(0, 0)(
    disallowReferences((ip, instructions, data, stdin) => {
        const line = stdin();
        const virtualInstruction = `NOOP ${line}`;
        const parsed = parseInstruction(virtualInstruction);

        if (hasReferences(parsed.data)) {
            throw new Error('READ cannot read references');
        }

        let finalData = undefined;
        if (parsed.data.length === 1) {
            finalData = parsed.data[0];
        } else if (parsed.data.length > 1) {
            finalData = parsed.data;
        }

        return {
            ip: ++ip,
            instructions,
            ret: finalData
        };
    }));

/**
 * Writes a line to standard output
 * @type {StateTransition}
 */
const writeOutput = disallowReferences(
    (ip, instructions, data, stdin, stdout) => {
        stdout(Operations.valueToString(data));

        return {
            ip: ++ip,
            instructions
        };
    });

/**
 * Writes a line to standard error
 * @type {StateTransition}
 */
const errorOutput = disallowReferences(
    (ip, instructions, data, stdin, stdout, stderr) => {
        stderr(Operations.valueToString(data));

        return {
            ip: ++ip,
            instructions
        };
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
 * @param {number} ip The instruction pointer
 * @param {module:./parsing.ParsedInstruction[]} instructions The instructions
 * @param {inputCallback} stdin
 * @param {outputCallback} stdout
 * @param {outputCallback} stderr
 * @returns {ProgramState}
 */
const executeInstruction = (ip, instructions, stdin, stdout, stderr) => {
    const {name, data} = instructions[ip];
    if (!knownInstructions.has(name)) {
        throw new SyntaxError(`Unknown instruction ${name}`);
    }

    const {
        instructions: updatedInstructions,
        data: parsedData
    } = applyReferences(
        ip,
        instructions,
        data,
        stdin,
        stdout,
        stderr);

    // Do unto yourself as you would do unto others
    let finalData = undefined;
    if (parsedData.length === 1) {
        finalData = parsedData[0];
    } else if (parsedData.length > 1) {
        finalData = parsedData;
    }

    const instructionHandler = knownInstructions.get(name);
    return instructionHandler(
        ip,
        updatedInstructions,
        finalData,
        stdin,
        stdout,
        stderr);
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
        this.ip = 0;
        this.instructions = instructions.map(parseInstruction);
        this.stdin = stdin;
        this.stdout = stdout;
        this.stderr = stderr;
    }

    /**
     * Executes the STOP program and returns the result of the final
     * instruction
     */
    execute() {
        let finalData = undefined;
        while (this.ip < this.instructions.length) {
            const {ip, instructions, ret} =
                executeInstruction(
                    this.ip,
                    this.instructions,
                    this.stdin,
                    this.stdout,
                    this.stderr);

            this.ip = ip;
            this.instructions = instructions;
            finalData = ret;
        }

        return finalData;
    }
}
