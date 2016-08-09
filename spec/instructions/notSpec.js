const stopLang = require('../../umd/stop.js');

describe('The NOT instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`NOT ${dataString}`]);
        program.go();
        return program.currentResult;
    };

    it('can be empty', () => {
        expect(getResult('')).toBe(1);
    });

    it('returns the falsey-ness of a single argument', () => {
        expect(getResult('UNDEFINED')).toBe(1);
        expect(getResult('0')).toBe(1);
        expect(getResult('1')).toBe(0);
        expect(getResult('NAN')).toBe(1);
        expect(getResult('INFINITY')).toBe(0);
        expect(getResult('[]')).toBe(1);
        expect(getResult('[0]')).toBe(0);
        expect(getResult('[1]')).toBe(0);
        expect(getResult('[0, 0]')).toBe(0);
        expect(getResult('""')).toBe(1);
        expect(getResult('"1"')).toBe(0);
    });

    it('can NOT two arguments', () => {
        expect(getResult('0 0')).toBe(0);
        expect(getResult('5 3')).toBe(0);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0')).toThrowError(SyntaxError);
    });

    it('removes elements in the first list that are in later lists', () => {
        expect(getResult('[1, 2, 2, 3] [2]')).toEqual([1, 3]);
        expect(getResult('[1, 2, 2, 3] [2, 3]')).toEqual([1]);
        expect(getResult('[1, 2, 2, 3] [2] [3] [11, 20]')).toEqual([1]);
    });
});
