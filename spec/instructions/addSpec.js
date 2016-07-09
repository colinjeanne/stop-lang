const stopLang = require('../../umd/stop.js');

describe('The ADD instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`ADD ${dataString}`]);
        return program.execute();
    };

    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });

    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });

    it('can add two items', () => {
        expect(getResult('1 1')).toBe(2);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('can add more than two items', () => {
        expect(getResult('1 1 1')).toBe(3);
    });

    it('can add items in a list', () => {
        expect(getResult('[2, 1]')).toBe(3);
    });

    it('can add items to a list', () => {
        expect(getResult('[2, 1] 3')).toEqual([2, 1, 3]);
    });

    it('can concatenate lists', () => {
        expect(getResult('[2, 1] [3, 4]')).toEqual([2, 1, 3, 4]);
    });

    it('can element-wise add to lists', () => {
        expect(getResult('3 [3, 4]')).toEqual([6, 7]);
        expect(getResult('"foo" [3, 4]')).toEqual(['foo3', 'foo4']);
        expect(getResult('UNDEFINED [3, 4]')).toEqual([undefined, undefined]);
    });

    it('can concatenate string', () => {
        expect(getResult('"foo" "bar"')).toBe('foobar');
    });

    it('can concatenate strings and numbers', () => {
        expect(getResult('"foo" 3')).toBe('foo3');
        expect(getResult('3 "foo"')).toBe('3foo');
    });

    it('can add infinities', () => {
        expect(getResult('INFINITY INFINITY')).toBe(Infinity);
        expect(getResult('INFINITY -INFINITY')).toEqual(NaN);
        expect(getResult('-INFINITY INFINITY')).toEqual(NaN);
        expect(getResult('INFINITY 3')).toBe(Infinity);
        expect(getResult('3 INFINITY')).toBe(Infinity);
        expect(getResult('-INFINITY 3')).toBe(-Infinity);
        expect(getResult('3 -INFINITY')).toBe(-Infinity);
        expect(getResult('INFINITY NAN')).toEqual(NaN);
        expect(getResult('NAN INFINITY')).toEqual(NaN);
    });

    it('can add NaNs', () => {
        expect(getResult('NAN NAN')).toEqual(NaN);
        expect(getResult('NAN 3')).toEqual(NaN);
        expect(getResult('3 NAN')).toEqual(NaN);
    });

    it('can add undefined to any type', () => {
        expect(getResult('UNDEFINED UNDEFINED')).not.toBeDefined();
        expect(getResult('UNDEFINED "foo"')).not.toBeDefined();
        expect(getResult('UNDEFINED 3')).not.toBeDefined();
        expect(getResult('"foo" UNDEFINED')).not.toBeDefined();
        expect(getResult('3 UNDEFINED')).not.toBeDefined();
        expect(getResult('[1, 2] UNDEFINED')).toEqual([1, 2, undefined]);
    });
});