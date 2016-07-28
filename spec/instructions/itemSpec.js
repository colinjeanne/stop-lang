const stopLang = require('../../umd/stop.js');

describe('The ITEM instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`ITEM ${dataString}`]);
        return program.execute();
    };

    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });

    it('cannot have only one argument', () => {
        expect(() => getResult('[]')).toThrowError(SyntaxError);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('cannot have more than two arguments', () => {
        expect(() => getResult('[] 0 0')).toThrowError(SyntaxError);
    });

    it('cannot take a numeric first argument', () => {
        expect(() => getResult('1 0')).toThrowError(SyntaxError);
    });

    it('cannot take an undefined first argument', () => {
        const instructions = [
            'ITEM UNDEFINED 0',
        ];

        const program = new stopLang(instructions);

        expect(() => program.execute()).toThrowError(SyntaxError);
    });

    it('must take a positive integral second argument', () => {
        expect(() => getResult('[] UNDEFINED')).toThrowError(SyntaxError);
        expect(() => getResult('[] "f"')).toThrowError(SyntaxError);
        expect(() => getResult('[] []')).toThrowError(SyntaxError);
        expect(() => getResult('[] 3.1')).toThrowError(SyntaxError);
        expect(() => getResult('[] -3')).toThrowError(SyntaxError);
        expect(() => getResult('[] NAN')).toThrowError(SyntaxError);
        expect(() => getResult('[] INFINITY')).toThrowError(SyntaxError);
    });

    it('can return an item in a list', () => {
        expect(getResult('[1, 2] 1')).toBe(2);
    });

    it('can return an item in a string', () => {
        expect(getResult('"abc" 1')).toBe('b');
    });

    it('can return an item in a list', () => {
        expect(getResult('[1, 2] 1')).toBe(2);
    });

    it('returns undefined for an out of range index', () => {
        expect(getResult('"a" 1')).not.toBeDefined();
        expect(getResult('[] 0')).not.toBeDefined();
    });
});
