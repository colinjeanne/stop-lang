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
 * @returns {ExtractionResult}
 */
const extractNumber = (instruction, s) => {
    const decimal = '(-|\\+)?((\\d+)(\\.\\d+)?|(\\d*)\\.\\d+)';
    const fullNumber = `^${decimal}((e|E)(-|\\+)?(\\d+))?`;

    const numberMatches = (new RegExp(fullNumber)).exec(s);
    if (numberMatches) {
        const value = parseFloat(s);
        return {endIndex: numberMatches[0].length, value};
    }

    const infinityRegex = /^(-|\+)?INFINITY( |$)/;
    const infinityMatches = infinityRegex.exec(s);
    if (infinityMatches) {
        const value = infinityMatches[1] === '-' ? -Infinity : Infinity;
        return {endIndex: infinityMatches[0].length, value};
    }

    const nanRegex = /^NAN( |$)/;
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
                extractItem(instruction, s.substr(i)));
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
 */

/**
 * Extracts a reference from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract the reference
 * @returns {ExtractionResult}
 */
const extractReference = (instruction, s) => {
    const matches = /^((\$|\$\$)?(?:((?:-|\+)?\d+)|ip((?:-|\+)\d+)?))/.exec(s);
    if (!matches) {
        throw new SyntaxError(
            `Invalid reference in instruction ${instruction}`);
    }

    const isIndirect = matches[2] === '$$';
    const isRelative = matches[3] === undefined;

    let refString = '0';
    if (isRelative && matches[4] !== undefined) {
        refString = matches[4];
    } else if (!isRelative) {
        refString = matches[3];
    }

    const ref = parseInt(refString, 10);
    if (isNaN(ref) || !isFinite(ref)) {
        throw new SyntaxError(
            `Invalid reference line in instruction ${instruction}`);
    }

    const value = new Reference(ref, isIndirect, isRelative);
    const endIndex = matches[1].length;

    return {endIndex, value};
};

/**
 * Extracts a STOP type from the instruction data string
 * @param {string} instruction The complete instruction
 * @param {string} s The substring from which to extract the type
 * @returns {ExtractionResult}
 */
const extractItem = (instruction, s) => {
    let endIndex = s.length;
    let value = undefined;

    // Remove leading spaces
    let firstNonspaceIndex = s.search('[^ ]');
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
            ({endIndex, value} = extractReference(instruction, trimmed));
            break;

        case 'U':
            ({endIndex, value} = extractUndefined(instruction, trimmed));
            break;

        case ';':
            throw new SyntaxError(`Unexpected comment in ${instruction}`);

        default:
            ({endIndex, value} = extractNumber(instruction, trimmed));
            break;
        }

        // Remove trailing spaces
        if ((endIndex !== -1) && (s[endIndex] == ' ')) {
            endIndex += s.substr(endIndex).search('[^ ]');
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
        } else {
            ({endIndex, value} =
                extractItem(instruction, dataAndComment.substr(i)));
            data.push(value);
            i += endIndex - 1;
        }
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
    let data = [];

    const matches = /^ *(?:\(([A-Z-]+)\) +)?([A-Z-]+)(?: +(.*))? *$/.exec(instruction);
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
