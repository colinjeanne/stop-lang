/**
 * Reference type
 * @module ./types/reference
 */

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
 * Returns the base instruction index for a reference
 * @param {string} base The base of the reference
 * @param {module:./../exec.ProgramState} state The current program state
 * @returns {number}
 */
const baseInstructionIndex = (base, state) => {
    if (base === '') {
        return 0;
    } else if (base === 'ip') {
        return state.ip;
    } else if (base === 'ci') {
        const lastIndex = state.evaluationStack.length - 1;
        return state.evaluationStack[lastIndex].pointer;
    }

    const labelIndex = findLabelIndex(base, state.instructions);
    if (labelIndex === -1) {
        throw new Error(`Unable to find label ${base}`);
    }

    return labelIndex;
};

/**
 * A reference
 */
export default class Reference {
    /**
     * Creates a reference
     * @param {number} ref The referenced instruction index
     * @param {boolean} isIndirect Whether the reference is indirect
     * @param {boolean} isRelative Whether the reference is relative to the
     * instruction pointer
     */
    constructor(base, offset, isIndirect) {
        this.base = base;
        this.offset = offset;
        this.isIndirect = isIndirect;
    }

    /**
     * Returns a direct reference from an indirect reference
     */
    decay() {
        if (!this.isIndirect) {
            throw new Error('Cannot decay a direct reference');
        }

        return new Reference(this.base, this.offset, false);
    }

    /**
     * Retrieves the referenced instruction's index
     * @param {module:./../exec.ProgramState} state The current program state
     * @returns {number}
     */
    instruction(state) {
        // If the reference is negative then modding by the length will result
        // in a number between 0 and -instructions.length. Adding
        // instructions.length will return the value to the correct positive
        // range and behave as if the reference was counting from the end
        // rather than from the start.
        const baseIndex = baseInstructionIndex(this.base, state);
        const modded = (baseIndex + this.offset) % state.instructions.length;
        return modded < 0 ? modded + state.instructions.length : modded;
    }

    /**
     * Converts the reference to a string
     */
    toString() {
        let s = '$';
        if (this.isIndirect) {
            s += '$';
        }

        s += this.base;

        if ((this.offset !== 0) || (this.base === '')) {
            s += this.offset.toString();
        }

        return s;
    }
}

/**
 * Whether a value is a STOP reference
 * @param {*} value
 * @returns {boolean}
 */
export const isReference = v => v instanceof Reference;

/**
 * Whether a value is a STOP direct reference
 * @param {*} value
 * @returns {boolean}
 */
export const isDirectReference = v => isReference(v) && !v.isIndirect;

/**
 * Whether a value is a STOP indirect reference
 * @param {*} value
 * @returns {boolean}
 */
export const isIndirectReference = v => isReference(v) && v.isIndirect;

/**
 * Whether the reference is for the current value of the instruction pointer
 * @param {*} value
 * @returns {boolean}
 */
export const isInstructionPointerReference = v =>
    isDirectReference(v) && (v.base === 'ip') && (v.offset === 0);

/**
 * Whether the reference is for the location of the current instruction
 * @param {*} value
 * @returns {boolean}
 */
export const isInstructionLocationReference = v =>
    isDirectReference(v) && (v.base === 'ci') && (v.offset === 0);

/**
 * Whether the reference is for the next value on standard input
 * @param {*} value
 * @returns {boolean}
 */
export const isStandardInputReference = v =>
    isDirectReference(v) && (v.base === 'stdin') && (v.offset === 0);
