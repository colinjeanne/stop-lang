/**
 * Number type
 * @module ./types/number
 */

/**
 * Whether a value is a number
 * @param {*} value
 * @returns {boolean}
 */
export const isNumber = v => typeof v === 'number';

/**
 * Whether a value is an integer
 * @param {*} value
 * @returns {boolean}
 */
export const isInteger = v => isNumber(v) &&
    (v === Math.floor(v)) &&
    !isNaN(v) &&
    isFinite(v);

/**
 * Whether a value is a nonnegative integer
 * @param {*} value
 * @returns {boolean}
 */
export const isNonnegativeInteger = v => isInteger(v) && (v >= 0);
