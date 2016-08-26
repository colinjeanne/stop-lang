const stopLang = require('../../umd/stop.js');

describe('The SHIFT instruction', () => {
    const getResult = (dataString, amountString) => {
        amountString = amountString || '';
        const program = new stopLang([`SHIFT ${dataString} ${amountString}`]);
        program.go();
        return program.currentResult;
    };

    it('defaults to shifting by 1', () => {
        expect(getResult('1')).toBe(2);
    });

    it('can shift two items', () => {
        expect(getResult('1 1')).toBe(2);
        expect(getResult('1 2')).toBe(4);
    });

    it('must have an integral second argument', () => {
        expect(() => getResult('1 1.1')).toThrowError(SyntaxError);
        expect(() => getResult('1 "a"')).toThrowError(SyntaxError);
        expect(() => getResult('1 [1]')).toThrowError(SyntaxError);
        expect(() => getResult('1 UNDEFINED')).toThrowError(SyntaxError);
        expect(() => getResult('1 NAN')).toThrowError(SyntaxError);
        expect(() => getResult('1 INFINITY')).toThrowError(SyntaxError);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0')).toThrowError(SyntaxError);
        expect(() => getResult('1 $$0')).toThrowError(SyntaxError);
    });

    it('can reverse shift', () => {
        expect(getResult('1 -1')).toBe(0);
        expect(getResult('2 -1')).toBe(1);
        expect(getResult('-2 -1')).toBe(-1);
    });

    it('can handle large shifts for numbers', () => {
        expect(getResult('1 32')).toBe(0);
        expect(getResult('-1 32')).toBe(0);
        expect(getResult('2147483647 -32')).toBe(0);
        expect(getResult('-2147483648 -32')).toBe(-1);
    });

    it('can rotate a list', () => {
        expect(getResult('[]')).toEqual([]);
        expect(getResult('[1, 2, 3]')).toEqual([2, 3, 1]);
        expect(getResult('[1, 2, 3] 2')).toEqual([3, 1, 2]);
        expect(getResult('[1, 2, 3] 6')).toEqual([1, 2, 3]);
        expect(getResult('[1, 2, 3] -1')).toEqual([3, 1, 2]);
    });

    it('can rotate a string', () => {
        expect(getResult('""')).toEqual('');
        expect(getResult('"abc"')).toEqual('bca');
        expect(getResult('"abc" 2')).toEqual('cab');
        expect(getResult('"abc" 6')).toEqual('abc');
        expect(getResult('"abc" -1')).toEqual('cab');
    });

    it('can shift infinities', () => {
        expect(getResult('INFINITY')).toBe(Infinity);
        expect(getResult('-INFINITY')).toBe(-Infinity);
        expect(getResult('INFINITY 1')).toBe(Infinity);
        expect(getResult('-INFINITY 1')).toBe(-Infinity);
    });

    it('can shift NaNs', () => {
        expect(getResult('NAN')).toEqual(NaN);
        expect(getResult('NAN 1')).toEqual(NaN);
    });

    it('can shift nonintegral numbers by shifting the floor of the number', () => {
        expect(getResult('1.1')).toBe(2);
        expect(getResult('-1.1')).toBe(-2);
    });

    it('can shift UNDEFINED', () => {
        expect(getResult('UNDEFINED')).not.toBeDefined();
        expect(getResult('UNDEFINED 1')).not.toBeDefined();
    });
});
