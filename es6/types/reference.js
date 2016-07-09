/**
 * Reference type
 * @module ./types/reference
 */

import { isUndefined } from './undefined';

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
    constructor(ref, isIndirect, isRelative) {
        this.ref = ref;
        this.isIndirect = isIndirect;
        this.isRelative = isRelative;
    }

    /**
     * Returns a direct reference from an indirect reference
     */
    decay() {
        if (!this.isIndirect) {
            throw new Error('Cannot decay a direct reference');
        }

        return new Reference(this.ref, false, this.isRelative);
    }

    /**
     * Retrieves the referenced instruction's index
     * @param {number} ip The current instruction pointer
     * @param {ParsedInstruction[]} instructions The list of instructions
     */
    instruction(ip, instructions) {
        // If the reference is negative then modding by the length will result
        // in a number between 0 and -instructions.length. Adding
        // instructions.length will return the value to the correct positive
        // range and behave as if the reference was counting from the end
        // rather than from the start.
        const base = this.isRelative ? ip : 0;
        const modded = (this.ref + base) % instructions.length;
        return modded < 0 ? modded + instructions.length : modded;
    }

    /**
     * Converts the reference to a string
     */
    toString() {
        let s = '$';
        if (this.isIndirect) {
            s += '$';
        }

        if (this.isRelative) {
            s += 'ip';
            if (this.ref !== 0) {
                s += this.ref.toString();
            }
        } else {
            s += this.ref.toString();
        }

        return s;
    }
}

/**
 * Whether a value is a STOP reference
 * @param {*} value
 * @returns {boolean}
 */
export const isReference = v => !isUndefined(v) && v.hasOwnProperty('ref');
