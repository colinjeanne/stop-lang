/**
 * STOP type operations
 * @module ./operations
 */

import { isList } from './types/list';
import { isNumber, isNonnegativeInteger } from './types/number';
import { isReference } from './types/reference';
import { isString } from './types/string';
import { isUndefined } from './types/undefined';

/**
 * Whether two STOP values are equal
 * @param {*} u
 * @param {*} v
 * @return {boolean}
 */
export const areEqual = (u, v) => {
    if (isList(u) && isList(v)) {
        if (u.length === v.length) {
            return u.every((item, index) => areEqual(item, v[index]));
        }

        return false;
    }

    return u === v;
};

/**
 * Adds two values together
 *
 * If the LHS and RHS are both lists then they are concatenated.
 * If The LHS is a list then the RHS is appended to the list.
 * If the RHS is a list then the LHS is added to each element in the list.
 * Otherwise, if either value is undefined then the result is undefined.
 * Otherwise, if either value is not a number then the two values are casted
 * to strings and concatenated.
 * Otherwise, the two values are added numerically.
 *
 * @param {*} u
 * @param {*} v
 * @return {*}
 */
export const add = (u, v) => {
    if (isList(u)) {
        if (isList(v)) {
            return [...u, ...v];
        } else {
            return [...u, v];
        }
    } else {
        if (isList(v)) {
            return v.map(datum => add(u, datum));
        } else if (isUndefined(u) || isUndefined(v)) {
            return undefined;
        } else if (!isNumber(u) && !isNumber(v)) {
            return asString(u) + asString(v);
        }
        return u + v;
    }
};

/**
 * Subtracts one value from another
 *
 * If either value is undefined then the result is undefined.
 * Otherwise, LHS is a list or string and the RHS is a non-empty array of
 * nonnegative integers then the RHS is interpreted as a set of indices to
 * remove from the LHS.
 * Otherwise the RHS is subtracted from the LHS numerically.
 *
 * @param {*} u
 * @param {*} v
 * @return {*}
 */
export const subtract = (u, v) => {
    if (isUndefined(u) || isUndefined(v)) {
        return undefined;
    } else if (isList(v) &&
        (v.length > 0) &&
        v.every(isNonnegativeInteger) &&
        (isString(u) || isList(u))) {
        if (isString(u)) {
            return u.
                split('').
                filter((datum, index) => v.indexOf(index) === -1).
                join('');
        } else {
            return u.filter((datum, index) => v.indexOf(index) === -1);
        }
    }

    return u - v;
};

/**
 * Multiples one value by another
 *
 * If either value is undefined then the result is undefined.
 * Otherwise, LHS is a list or string and the RHS is a nonnegative integer then
 * the LHS is repeated by the value of the RHS.
 * Otherwise the LHS and RHS are multiplied numerically.
 *
 * @param {*} u
 * @param {*} v
 * @return {*}
 */
export const multiply = (u, v) => {
    if (isUndefined(u) || isUndefined(v)) {
        return undefined;
    } else if (isNonnegativeInteger(v) &&
        (isString(u) || isList(u))) {
        if (isString(u)) {
            return u.repeat(v);
        } else {
            var ret = [];
            for (let i = 0; i < v; ++i) {
                ret = [...ret, ...u];
            }

            return ret;
        }
    }

    return u * v;
};

/**
 * Divides one value by another
 *
 * If either value is undefined then the result is undefined.
 * Otherwise the LHS and RHS are divided numerically such that lists and
 * strings are treated as NAN.
 *
 * @param {*} u
 * @param {*} v
 * @return {*}
 */
export const divide = (u, v) => {
    if (isUndefined(u) || isUndefined(v)) {
        return undefined;
    }

    return u / v;
};

/**
 * Modulos one value by another
 *
 * If either value is undefined then the result is undefined.
 * Otherwise the LHS and RHS are moduloed numerically such that lists and
 * strings are treated as NAN.
 *
 * @param {*} u
 * @param {*} v
 * @return {*}
 */
export const mod = (u, v) => {
    if (isUndefined(u) || isUndefined(v)) {
        return undefined;
    }

    return u % v;
};

/**
 * Returns whether a value is truthy
 *
 * A value is truthy if it is truthy in JavaScript with the exception that
 * empty lists are not truthy.
 *
 * @param {*} u
 * @param {*} v
 * @return {boolean}
 */
export const truthy = u => {
    if (!isList(u)) {
        return u ? 1 : 0;
    } else if (u.length === 0) {
        // Javascript considers the empty array to be truthy; STOP does not.
        return 0;
    }

    return 1;
};

/**
 * Returns whether a value is falsey
 *
 * A value is falsey if it is not truthy.
 *
 * @param {*} u
 * @param {*} v
 * @return {boolean}
 */
export const falsey = u => {
    return truthy(u) ? 0 : 1;
};

/**
 * ANDs one value by another
 *
 * If the LHS and RHS are both lists then the result is the intersection of the
 * two lists
 * If the LHS and RHS are both numbers then the result is the logical AND of
 * the two numbers.
 * Otherwise the result is 1 if both values are truthy and 0 otherwise.
 *
 * @param {*} u
 * @param {*} v
 * @return {*}
 */
export const and = (u, v) => {
    if (isList(u) && isList(v)) {
        return u.filter(datum => v.indexOf(datum) !== -1);
    } else if (isNumber(u) && isNumber(v)) {
        return u & v;
    }

    return truthy(u) & truthy(v);
};

/**
 * ORs one value by another
 *
 * If the LHS and RHS are both lists then the result is the union of the two
 * lists
 * If the LHS and RHS are both numbers then the result is the logical OR of the
 * two numbers.
 * Otherwise the result is 1 if either value is truthy and 0 otherwise.
 *
 * @param {*} u
 * @param {*} v
 * @return {*}
 */
export const or = (u, v) => {
    if (isList(u) && isList(v)) {
        return [
            ...u,
            ...v.filter(datum => u.indexOf(datum) === -1)
        ];
    } else if (isNumber(u) && isNumber(v)) {
        return u | v;
    }

    return truthy(u) | truthy(v);
};

/**
 * NOTs a value
 *
 * If the LHS is a finite number then the result is the bitwise NOT of the
 * value where the number is interpreted as a 32-bit signed integer.
 * Otherwise the result is 1 if either value is falsey and 0 otherwise.
 *
 * @param {*} value
 * @return {*}
 */
export const not = value => {
    if (isNumber(value) && isFinite(value)) {
        return ~value;
    }

    return falsey(value);
};

/**
 * Floors a value numerically
 *
 * If the value is not a numeric value then the result is NAN. Otherwise the
 * return is the nearest integer which is less than the value.
 *
 * @param {*} u
 * @return {number}
 */
export const floor = u => {
    return Math.floor(u);
};

/**
 * Returns whether one value is less than another
 *
 * If both values are numbers then they are compared numerically.
 * If both values are strings then they are compare alphabetically.
 * Otherwise the result is 0.
 *
 * @param {*} u
 * @param {*} v
 * @return {boolean}
 */
export const less = (u, v) => {
    if ((isNumber(u) && isNumber(v)) ||
        (isString(u) && isString(v))) {
        return (u < v) ? 1 : 0;
    }

    return 0;
};

/**
 * Returns the type shifted by some value
 *
 * UNDEFINED, NAN, and INFINITY always return themselves.
 * Strings and lists are rotated element-wise.
 * Finite numbers are shifted bitwise such that positive amounts are left
 * shifts and negative amounts are right shifts. Right shifts preserve sign.
 * Numbers are treated as signed 32 bit numbers in two's complement format.
 *
 * @param {*} u
 * @param {number} v
 * @return {*}
 */
export const shift = (u, amount) => {
    if (isUndefined(u)) {
        return undefined;
    } else if (isString(u) || isList(u)) {
        if (u.length === 0) {
            return u;
        }

        const moddedAmount = amount % u.length;
        const shiftAmount = moddedAmount < 0 ?
            moddedAmount + u.length :
            moddedAmount;

        if (isString(u)) {
            return u.slice(shiftAmount) + u.slice(0, shiftAmount);
        } else {
            return [
                ...u.slice(shiftAmount),
                ...u.slice(0, shiftAmount)
            ];
        }
    } else if (isNaN(u)) {
        return NaN;
    } else if (!isFinite(u)) {
        return u;
    }

    if (amount >= 0) {
        if (amount >= 32) {
            // The number is treated as 32 bits and at or beyond a shift of 32
            // bits all bits would have been discarded.
            return 0;
        }
        return u << amount;
    }

    if (amount <= -32) {
        if (u < 0) {
            // The number is treated as 32 bits and at or beyond a shift of 32
            // bits the sign bit would have been filled to every bit.
            return -1;
        }

        return 0;
    }
    return u >> -amount;
};

/**
 * Converts a STOP value to a STOP-parsable string suitable to use in a STOP
 * instruction
 * @param {*} value
 * @returns {string}
 */
export const asInstructionString = v => {
    let s = '';
    if (isUndefined(v)) {
        s = 'UNDEFINED';
    } else if (isString(v)) {
        s = '"' + v.replace('\\', '\\\\').replace('\"', '\\"') + '"';
    } else if (isNumber(v)) {
        if (Number.isNaN(v)) {
            s = 'NAN';
        } else if (v === Infinity) {
            s = 'INFINITY';
        } else if (v === -Infinity) {
            s = '-INFINITY';
        } else {
            s = v.toString();
        }
    } else if (isReference(v)) {
        s = v.toString();
    } else if (isList(v)) {
        s = '[' + v.map(asInstructionString).join(', ') + ']';
    }

    return s;
};

/**
 * Converts a STOP value to a STOP-parsable string
 * @param {*} value
 * @returns {string}
 */
export const asString = v => isString(v) ? v : asInstructionString(v);

/**
 * Converts a STOP value to a STOP-parsable string suitable to pass to an
 * output stream
 * @param {*} value
 * @returns {string}
 */
export const asOutputString = v =>
    isUndefined(v) ? '' : asInstructionString(v);

/**
 * Converts a STOP value to a STOP-parsable number
 * @param {*} value
 * @returns {string}
 */
export const asNumber = v => {
    let s = NaN;
    if (isUndefined(v)) {
        s = NaN;
    } else if (isString(v)) {
        if ((v === 'INFINITY') || (v === '+INFINITY')) {
            s = Infinity;
        } else if (v === '-INFINITY') {
            s = -Infinity;
        } else if (v === 'NAN') {
            s = NaN;
        } else {
            s = Number.parseFloat(v);
        }
    } else if (isNumber(v)) {
        s = v;
    }

    return s;
};
