/**
 * Instruction parser
 * @module ./parsing
 */

import Reference from './types/reference';

/**
 * The result of a type extraction
 * @typedef {Object} ExtractionResult
 * @property {number} endIndex The first index that can begin a new extraction
 * @property {*} value The extracted value
 * @property {?string} label The label associated with the instruction
 */

/**
 * Extracts undefined from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract undefined
 * @returns {ExtractionResult}
 */
const extractUndefined = (instruction, s) => {
    if (!s.startsWith('UNDEFINED')) {
        throw new SyntaxError(`Unexpected term in ${instruction}`);
    }

    return {endIndex: 'UNDEFINED'.length};
};

/**
 * Extracts a number from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract the number
 * @param {string} delimiters A string container the delimiters between each term
 * @returns {ExtractionResult}
 */
const extractNumber = (instruction, s, delimiters) => {
    const decimal = '(-|\\+)?((\\d+)(\\.\\d+)?|(\\d*)\\.\\d+)';
    const fullNumber = `^${decimal}((e|E)(-|\\+)?(\\d+))?`;

    const numberMatches = (new RegExp(fullNumber)).exec(s);
    if (numberMatches) {
        const value = parseFloat(s);
        return {endIndex: numberMatches[0].length, value};
    }

    const infinityRegex = new RegExp(`^(-|\\+)?INFINITY([${delimiters}]|$)`);
    const infinityMatches = infinityRegex.exec(s);
    if (infinityMatches) {
        const signLength = infinityMatches[1] ? 1 : 0;
        const value = infinityMatches[1] === '-' ? -Infinity : Infinity;
        return {endIndex: signLength + 'INFINITY'.length, value};
    }

    const nanRegex =  new RegExp(`^NAN([${delimiters}]|$)`);
    const nanMatches = nanRegex.exec(s);
    if (nanMatches) {
        return {endIndex: 'NAN'.length, value: NaN};
    }

    throw new SyntaxError(`Unexpected term in ${instruction}`);
};

/**
 * Extracts a string from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract the string
 * @returns {ExtractionResult}
 */
const extractString = (instruction, s) => {
    let value = '';
    let isEscapeCharacter = false;
    let i = 1;
    for (; i < s.length; ++i) {
        const c = s[i];
        if (isEscapeCharacter) {
            // Quoted strings can escape quotes and backslashes
            if ((c === '"' || c === '\\')) {
                value += c;
                isEscapeCharacter = false;
            } else {
                throw new SyntaxError(`Unknown escaped character "\\${c}`);
            }
        } else if (c === '\\') {
            isEscapeCharacter = true;
        } else if (c === '"') {
            break;
        } else {
            value += c;
        }
    }

    if (i === s.length) {
        throw new SyntaxError(`Unexpected end of instruction ${instruction}`);
    }

    return {endIndex: i + 1, value};
};

/**
 * Extracts a list from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract the list
 * @returns {ExtractionResult}
 */
const extractList = (instruction, s) => {
    let value = [];
    let endIndex = 0;
    let itemValue = undefined;
    let elementHasValue = false;
    let i = 1;
    for (; i < s.length; ++i) {
        const c = s[i];
        if (c === ']') {
            break;
        } else if (c === ',') {
            if (!elementHasValue) {
                throw new SyntaxError(`Unexpected comma ${instruction}`);
            }

            elementHasValue = false;
        } else if (c === ' ') {
            continue;
        } else {
            if (elementHasValue) {
                throw new SyntaxError(`Unexpected term ${instruction}`);
            }

            ({endIndex, value: itemValue} =
                extractItem(instruction, s.substr(i), ' ,\\]'));
            value.push(itemValue);
            i += endIndex - 1;
            elementHasValue = true;
        }
    }

    if (!elementHasValue && (value.length > 0)) {
        throw new SyntaxError(`Unexpected end of list ${instruction}`);
    }

    if (i === s.length) {
        throw new SyntaxError(`Unexpected end of instruction ${instruction}`);
    }

    return {endIndex: i + 1, value};
};

/**
 * A parsed instruction
 * @typedef {Object} ParsedInstruction
 * @property {string} name The name of the instruction
 * @property {*[]} data An array of extracted values
 * @property {?string} label The instruction label
 */

/**
 * Extracts a reference from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract the reference
 * @param {string} delimiters A string container the delimiters between each term
 * @returns {ExtractionResult}
 */
const extractReference = (instruction, s, delimiters) => {
    const isIndirect = s.startsWith('$$');
    const startIndex = isIndirect ? 2 : 1;
    const delimiterIndex = s.search(`[${delimiters}]`);
    const endIndex = delimiterIndex === -1 ? s.length : delimiterIndex;
    const rest = s.substring(startIndex, endIndex);

    let value = null;
    if (/^(-|\+)?\d+$/.test(rest)) {
        // This references an absolute instruction index
        const offset = parseInt(rest, 10);
        if (isFinite(offset)) {
            value = new Reference('', offset, isIndirect);
        }
    }

    const ipMatch = /^(ip|ci)((?:-|\+)\d+)?$/.exec(rest);
    if (ipMatch) {
        // This references an instruction relative to the current instruction
        // pointer or the location of the current instruction
        const offset = ipMatch[2] === undefined ? 0 : parseInt(ipMatch[2]);
        if (isFinite(offset)) {
            value = new Reference(ipMatch[1], offset, isIndirect);
        }
    }

    const labelMatch = /^([A-Z]|[A-Z]+[A-Z-]*[A-Z]+)((?:-|\+)\d+)?$/.
        exec(rest);
    if (labelMatch) {
        // This references an instruction relative to a label
        const label = labelMatch[1];
        const offset = labelMatch[2] === undefined ?
            0 :
            parseInt(labelMatch[2]);
        if (isFinite(offset)) {
            value = new Reference(label, offset, isIndirect);
        }
    }

    if (rest === 'stdin') {
        // This references the next data available from the input stream
        value = new Reference(rest, 0, isIndirect);
    }

    if (!value) {
        throw new SyntaxError(
            `Invalid reference line in instruction ${instruction}`);
    }

    return {endIndex, value};
};

/**
 * Extracts a STOP type from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract the type
 * @param {string} delimiters A string container the delimiters between each term
 * @returns {ExtractionResult}
 */
const extractItem = (instruction, s, delimiters) => {
    let endIndex = s.length;
    let value = undefined;

    // Remove leading spaces
    const firstNonspaceIndex = s.search('[^ ]');
    if (firstNonspaceIndex !== -1) {
        const trimmed = s.substr(firstNonspaceIndex);
        switch (s[firstNonspaceIndex]) {
        case '"':
            ({endIndex, value} = extractString(instruction, trimmed));
            break;

        case '[':
            ({endIndex, value} = extractList(instruction, trimmed));
            break;

        case '$':
            ({endIndex, value} = extractReference(
                instruction,
                trimmed,
                delimiters));
            break;

        case 'U':
            ({endIndex, value} = extractUndefined(instruction, trimmed));
            break;

        case ';':
            throw new SyntaxError(`Unexpected comment in ${instruction}`);

        default:
            ({endIndex, value} = extractNumber(
                instruction,
                trimmed,
                delimiters));
            break;
        }

        // Remove trailing spaces
        if ((endIndex !== -1) && (s[endIndex] === ' ')) {
            // If the instruction ends with whitespace then there wont be a
            // next non-space character
            const nextNonSpaceIndex = s.substr(endIndex).search('[^ ]');
            if (nextNonSpaceIndex !== -1) {
                endIndex += nextNonSpaceIndex;
            }
        }

        endIndex += firstNonspaceIndex;
    }

    return {endIndex, value};
};

/**
 * Extracts a STOP type from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} dataAndComment The data and comment parts of the instruction
 * @returns {*[]} An array of extracted values
 */
const parseDataAndComment = (instruction, dataAndComment) => {
    const data = [];
    let endIndex = 0;
    let value = undefined;
    for (let i = 0; i < dataAndComment.length; ++i) {
        const c = dataAndComment[i];
        if (c === ';') {
            break;
        } else if (c !== ' ') {
            ({endIndex, value} =
                extractItem(instruction, dataAndComment.substr(i), ' '));
            data.push(value);
            i += endIndex - 1;
        }
    }

    if (data.length === 0) {
        return undefined;
    } else if (data.length === 1) {
        return data[0];
    }

    return data;
};

/**
 * Parses an instruction
 * @param {string} instruction The complete instruction
 * @returns {ParsedInstruction}
 * @throws {SyntaxError} Malformed instruction
 */
export default instruction => {
    let data = undefined;

    const matches = /^ *(?:\(([A-Z]|[A-Z]+[A-Z-]*[A-Z]+)\) +)?([A-Z-]+)(?: +(.*))? *$/.exec(instruction);
    if (!matches) {
        throw new SyntaxError(`Invalid instruction ${instruction}`);
    }

    const label = matches[1];
    const name = matches[2];
    if (matches[3]) {
        data = parseDataAndComment(instruction, matches[3]);
    }

    const parsed = { name, data, label };
    parsed.toString = () => instruction;

    return parsed;
};
