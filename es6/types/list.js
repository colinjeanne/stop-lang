/**
 * List type
 * @module ./types/list
 */

/**
 * Whether a value is a list
 * @param {*} value
 * @returns {boolean}
 */
export const isList = v => Array.isArray(v);
