/**
 * STOP program
 * @module ./exec
 */

import parseInstruction from './parsing';

/**
 * Whether a value is undefined
 * @param {*} value
 * @returns {boolean}
 */
const isUndefined = v => typeof v === 'undefined';

/**
 * Whether a value is a string
 * @param {*} value
 * @returns {boolean}
 */
const isString = v => typeof v === 'string';

/**
 * Whether a value is a number
 * @param {*} value
 * @returns {boolean}
 */
const isNumber = v => typeof v === 'number';

/**
 * Whether a value is an integer
 * @param {*} value
 * @returns {boolean}
 */
const isInteger = v => isNumber(v) && (v === Math.floor(v));

/**
 * Whether a value is a nonnegative integer
 * @param {*} value
 * @returns {boolean}
 */
const isNonnegativeInteger = v => isInteger(v) && (v >= 0);

/**
 * Whether a value is a STOP reference
 * @param {*} value
 * @returns {boolean}
 */
const isReference = v => !isUndefined(v) && v.hasOwnProperty('ref');

/**
 * Whether two STOP values are equal
 * @param {*} u
 * @param {*} v
 * @return {boolean}
 */
const areEqual = (u, v) => {
    if (Array.isArray(u) && Array.isArray(v)) {
        if (u.length === v.length) {
            return u.every((item, index) => areEqual(item, v[index]));
        }
        
        return false;
    }
    
    return u === v;
};

/**
 * Converts a STOP value to a STOP-parsable string
 * @param {*} value
 * @returns {string}
 */
const valueToString = v => {
    let s = '';
    if (isUndefined(v)) {
        s = '';
    } else if (isString(v)) {
        s = '"' + v.replace('\\', '\\\\').replace('\"', '\\"') + '"';
    } else if (isNumber(v)) {
        s = v.toString();
    } else if (isReference(v)) {
        s = v.toString();
    } else if (Array.isArray(v)) {
        s = '[' + v.map(valueToString).join(', ') + ']';
    }
    
    return s;
};

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
    } else if (Array.isArray(datum)) {
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
    if (Array.isArray(data)) {
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
 * Returns the passed in data unchanged
 * @type {StateTransition}
 */
const noop = disallowReferences((ip, instructions, data) => ({
    ip: ++ip,
    instructions,
    ret: data
}));

/**
 * Acts as a marker for GOTO instructions
 * @type {StateTransition}
 */
const label = (ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!isString(data)) {
        throw new SyntaxError(
            `LABEL must take a single string ${instruction}`);
    }
    
    return {
        ip: ++ip,
        instructions,
        ret: undefined
    };
};

/**
 * Finds the first index of a label within the set of instructions
 * @param {string} label
 * @param {module:./parsing.ParsedInstruction[]} instructions
 * @returns {number}
 */
const findLabelIndex = (label, instructions) =>
    instructions.findIndex(instruction =>
        (instruction.name === 'LABEL') &&
        (instruction.data.length === 1) &&
        (instruction.data[0] === label));

/**
 * Moves a label to a new location within the set of instructions
 * @type {StateTransition}
 */
const alter = (ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) ||
        (data.length !== 2) ||
        !isString(data[0]) ||
        !isInteger(data[1])) {
        throw new SyntaxError(
            `ALTER must take a string and an integer ${instruction}`);
    }
    
    const labelIp = findLabelIndex(data[0], instructions);
    if (labelIp === -1) {
        throw new SyntaxError(`Unable to find label ${instruction}`);
    }
    
    const newLabelIp = data[1] % instructions.length;
    let newInstructions = [...instructions];
    const label = instructions[labelIp];
    
    if (labelIp > newLabelIp) {
        // Remove first since we aren't disrupting the new location of the
        // label.
        newInstructions.splice(labelIp, 1);
        newInstructions.splice(newLabelIp, 0, label);
    } else if (labelIp < newLabelIp) {
        // Remove last since we are disrupting the new location of the label.
        newInstructions.splice(newLabelIp, 0, label);
        newInstructions.splice(labelIp, 1);
    }
    
    let newIp = ++ip;
    if ((newLabelIp > ip) && (labelIp < ip)) {
        // We have removed but not added back an instruction before the current
        // instruction pointer and so we are already sitting on the next
        // instruction.
        // If newLabelIp equals the current pointer in this case then the
        // current instruction is at IP - 1 and the next instruction we want to
        // execute is at IP + 1. As a result, we must keep the instruction
        // pointer moving as normal rather than keeping it in place.
        newIp = ip;
    } else if ((newLabelIp <= ip) && (labelIp > ip + 1)) {
        // We have added but not removed an instruction before the current
        // instruction pointer and so we are sitting on the previous
        // instruction.
        // If newLabelIp equals the current pointer in this case then the
        // current instruction is at IP + 1. We don't want to execute this
        // instruction again so we will skip executing the label even though it
        // may have side-effects. We cant attempt to execute the label here
        // since we have no idea what those side-effects may be and so we
        // cannot reason about where we will need the instruction pointer to go
        // in that case.
        newIp = ip + 2;
    }
    
    return {
        ip: newIp,
        instructions: newInstructions,
        ret: undefined
    };
};

/**
 * Conditionally moves the instruction pointer to a label
 * @type {StateTransition}
 */
const gotoLabel = (ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!(Array.isArray(data) &&
            (data.length === 2) &&
            isString(data[0]) &&
            ((data[1] === 0) || (data[1] === 1))) &&
        !isString(data)) {
        throw new SyntaxError(
            `GOTO must take a string and may take a condition ${instruction}`);
    }
    
    let label;
    let condition;
    if (Array.isArray(data)) {
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
        instructions,
        ret: undefined
    };
};

/**
 * Adds a new instruction to the front of the set of instructions
 * @type {StateTransition}
 */
const push = (ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (isUndefined(data) ||
        (Array.isArray(data) &&
            ((data.length === 0) || !isString(data[0]))) &&
        !isString(data)) {
        throw new SyntaxError(
            `PUSH must take an instruction ${instruction}`);
    }
    
    let newInstruction;
    if (Array.isArray(data)) {
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
        instructions: newInstructions,
        ret: undefined
    };
};

/**
 * Removes the first instruction from the set of instructions
 * @type {StateTransition}
 */
const pop = (ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!isUndefined(data)) {
        throw new SyntaxError(
            `POP cannot take any arguments ${instruction}`);
    }
    
    const newInstructions = [...instructions];
    newInstructions.shift();
    
    return {
        // Since we have removed an instruction from the front, the instruction
        // pointer automatically points to the next instruction.
        ip: ip,
        instructions: newInstructions,
        ret: undefined
    };
};

/**
 * Adds a new instruction to the end of the set of instructions
 * @type {StateTransition}
 */
const inject = (ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (isUndefined(data) ||
        (Array.isArray(data) &&
            ((data.length === 0) || !isString(data[0]))) &&
        !isString(data)) {
        throw new SyntaxError(
            `INJECT must take an instruction ${instruction}`);
    }
    
    let newInstruction;
    if (Array.isArray(data)) {
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
        instructions: newInstructions,
        ret: undefined
    };
};

/**
 * Removes the last instruction from the set of instructions
 * @type {StateTransition}
 */
const eject = (ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!isUndefined(data)) {
        throw new SyntaxError(
            `EJECT cannot take any arguments ${instruction}`);
    }
    
    const newInstructions = [...instructions];
    newInstructions.pop();
    
    return {
        ip: ++ip,
        instructions: newInstructions,
        ret: undefined
    };
};

/**
 * Adds two values or adds an item to the end of a list
 * @type {StateTransition}
 */
const add = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `ADD must take at least two arguments ${instruction}`);
    }
    
    return {
        ip: ++ip,
        instructions,
        ret: data.reduce((sum, datum) => {
            if (Array.isArray(sum)) {
                if (Array.isArray(datum)) {
                    return [...sum, ...datum];
                } else {
                    return [...sum, datum];
                }
            } else {
                return sum + datum;
            }
        })
    };
});

/**
 * Subtracts two numbers or removes values at specified indices in strings and
 * lists
 * @type {StateTransition}
 */
const subtract = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `SUB must take at least two arguments ${instruction}`);
    }
    
    const rhsArguments = data.slice(1);
    
    let ret;
    if (rhsArguments.every(isNonnegativeInteger) &&
        (isString(data[0]) || Array.isArray(data[0]))) {
        if (isString(data[0])) {
            ret = data[0].
                split('').
                filter((datum, index) => rhsArguments.indexOf(index) === -1).
                join('');
        } else {
            ret = data[0].filter(
                (datum, index) => rhsArguments.indexOf(index) === -1);
        }
    } else {
        ret = data.reduce((sum, datum) => sum - datum)
    }
    
    return {
        ip: ++ip,
        instructions,
        ret
    };
});

/**
 * Multiplies numbers or repeats strings and arrays
 * @type {StateTransition}
 */
const multiply = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `MUL must take at least two arguments ${instruction}`);
    }
    
    let ret;
    if (isNonnegativeInteger(data[1]) && isString(data[0])) {
        ret = data[0].repeat(data[1]);
    } else if (isNonnegativeInteger(data[1]) && Array.isArray(data[0])) {
        ret = [];
        for (let i = 0; i < data[1]; ++i) {
            ret = [...ret, ...data[0]];
        }
    } else {
        ret = data.reduce((sum, datum) => sum * datum)
    }
    
    return {
        ip: ++ip,
        instructions,
        ret
    };
});

/**
 * Divides values
 * @type {StateTransition}
 */
const divide = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `DIV must take at least two arguments ${instruction}`);
    }
    
    return {
        ip: ++ip,
        instructions,
        ret: data.reduce((sum, datum) => sum / datum)
    };
});

/**
 * Performs the modulus operation against values
 * @type {StateTransition}
 */
const mod = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `MOD must take at least two arguments ${instruction}`);
    }
    
    return {
        ip: ++ip,
        instructions,
        ret: data.reduce((sum, datum) => sum % datum)
    };
});

/**
 * Bitwise ANDs values or finds the intersection of lists
 * @type {StateTransition}
 */
const and = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    let ret = 0;
    if (isUndefined(data)) {
        ret = 0; 
    } else if (!Array.isArray(data)) {
        ret = data ? 1 : 0;
    } else {
        if (data.length === 0) {
            // Javascript considers the empty array to be truthy but that isn't
            // what STOP considers to be truthy.
            ret = 0;
        } else if (data.every(Array.isArray)) {
            ret = data.reduce(
                (intersection, datum) => intersection.
                    filter(v => datum.indexOf(v) !== -1));
        } else {
            ret = data.reduce((sum, datum) => {
                if (isNumber(sum) && isNumber(datum)) {
                    return sum & datum;
                } else {
                    // Ensure different types are evaluated according to if
                    // they are truthy.
                    return !!sum & !!datum;
                }
            });
        }
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
    const instruction = instructions[ip];
    
    let ret = 0;
    if (isUndefined(data)) {
        ret = 0; 
    } else if (!Array.isArray(data)) {
        ret = data ? 1 : 0;
    } else {
        if (data.length === 0) {
            // Javascript considers the empty array to be truthy but that isn't
            // what STOP considers to be truthy.
            ret = 0;
        } else if (data.every(Array.isArray)) {
            const allEntries = [].concat(...data);
            ret = data.reduce(
                (union, datum) => [
                    ...union,
                    ...datum.filter(v => union.indexOf(v) === -1)
                ],
                []);
        } else {
            ret = data.reduce((sum, datum) => {
                if (isNumber(sum) && isNumber(datum)) {
                    return sum | datum;
                } else {
                    // Ensure different types are evaluated according to if
                    // they are truthy.
                    return !!sum | !!datum;
                }
            });
        }
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
    const instruction = instructions[ip];
    
    let ret = 1;
    if (isUndefined(data)) {
        ret = 1; 
    } else if (!Array.isArray(data)) {
        ret = data ? 0 : 1;
    } else {
        if (data.length === 0) {
            // Javascript considers the empty array to be truthy but that isn't
            // what STOP considers to be truthy.
            ret = 1;
        } else if (data.every(Array.isArray)) {
            const rest = [].concat(...data.slice(1));
            ret = data[0].filter(datum => rest.indexOf(datum) === -1);
        } else {
            ret = 0;
        }
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
const equal = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `EQUAL must take at least two arguments ${instruction}`);
    }
    
    return {
        ip: ++ip,
        instructions,
        ret: data.every(datum => areEqual(datum, data[0])) ? 1 : 0
    };
});

/**
 * Returns 0 is any STOP value is not equal to the others and 1 otherwise
 * @type {StateTransition}
 */
const notEqual = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `NEQUAL must take at least two arguments ${instruction}`);
    }
    
    const equalResult = equal(ip, instructions, data);
    
    return {
        ip: ++ip,
        instructions,
        ret: equalResult.ret ? 0 : 1
    };
});

/**
 * Returns 1 if the arguments form a monotonically decreasing series
 * @type {StateTransition}
 */
const less = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (!Array.isArray(data) || (data.length < 2)) {
        throw new SyntaxError(
            `LESS must take at least two arguments ${instruction}`);
    }
    
    let ret = 1;
    for (let i = 1; i < data.length; ++i) {
        const previousValue = data[i - 1];
        
        // Use not less than since some types (like undefined) are not ordered
        // with other types and so will return false for all comparisons.
        if (!(previousValue < data[i])) {
            ret = 0;
            break;
        }
    }
    
    return {
        ip: ++ip,
        instructions,
        ret
    };
});

/**
 * Returns the length of a list or string
 * @type {StateTransition}
 */
const dataLength = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (isUndefined(data)) {
        throw new SyntaxError(`LENGTH must take one argument ${instruction}`);
    }
    
    if (!isString(data) && !Array.isArray(data)) {
        throw new SyntaxError(
            `LENGTH data must be a string or list ${instruction}`);
    }
    
    return {
        ip: ++ip,
        instructions,
        ret: data.length
    };
});

/**
 * Retrieves the value at a given index in a list or string
 * @type {StateTransition}
 */
const item = disallowReferences((ip, instructions, data) => {
    const instruction = instructions[ip];
    
    if (isUndefined(data) || (data.length !== 2)) {
        throw new SyntaxError(`ITEM must take two arguments ${instruction}`);
    }
    
    if (!isString(data[0]) && !Array.isArray(data[0])) {
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
});

/**
 * Returns a line from standard input
 * @type {StateTransition}
 */
const readInput = disallowReferences((ip, instructions, data, stdin) => {
    const instruction = instructions[ip];
    
    if (!isUndefined(data)) {
        throw new SyntaxError(
            `READ cannot take arguments ${instruction}`);
    }
    
    const line = stdin();
    const virtualInstruction = `NOOP ${line}`;
    const parsed = parseInstruction(virtualInstruction);
    
    if (hasReferences(parsed.data)) {
        throw new Error(`READ cannot read references`);
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
});

/**
 * Writes a line to standard output
 * @type {StateTransition}
 */
const writeOutput = disallowReferences(
    (ip, instructions, data, stdin, stdout) => {
        const instruction = instructions[ip];
        
        stdout(valueToString(data));
        
        return {
            ip: ++ip,
            instructions,
            ret: undefined
        };
    });

/**
 * Writes a line to standard error
 * @type {StateTransition}
 */
const errorOutput = disallowReferences(
    (ip, instructions, data, stdin, stdout, stderr) => {
        const instruction = instructions[ip];
        
        stderr(valueToString(data));
        
        return {
            ip: ++ip,
            instructions,
            ret: undefined
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
    ['LABEL', label],
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
    
    // Do unto yourself as you would do until others
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
};
