const stopLang = require('../../umd/stop.js');

describe('The MUL instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`MUL ${dataString}`]);
        program.go();
        return program.currentResult;
    };

    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });

    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });

    it('can multiply two numbers', () => {
        expect(getResult('2 3')).toBe(6);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('can multiply more than two numbers', () => {
        expect(getResult('2 3 4')).toBe(24);
    });

    it('can multiply numbers in a list', () => {
        expect(getResult('[2, 3]')).toBe(6);
    });

    it('can multiply strings by numbers to expand the string', () => {
        expect(getResult('"foo" 3')).toBe('foofoofoo');
        expect(getResult('"foo" 3.1')).toEqual(NaN);
        expect(getResult('"foo" -3')).toEqual(NaN);
    });

    it('can multiply lists by numbers to expand the list', () => {
        expect(getResult('[1, 2, 3] 3')).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);
        expect(getResult('[1, 2, 3] -3')).toEqual(NaN);
        expect(getResult('[1, 2, 3] 3.1')).toEqual(NaN);
    });

    it('can multiply any type to any type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'MUL $0 $0 ; undefined * undefined',
            'MUL $0 $1 ; undefined * string',
            'MUL $0 $2 ; undefined * number',
            'MUL $0 $3 ; undefined * list',
            'MUL $1 $0 ; string * undefined',
            'MUL $1 $1 ; string * string',
            'MUL $1 $3 ; string * list',
            'MUL $2 $0 ; number * undefined',
            'MUL $2 $1 ; number * string',
            'MUL $2 $3 ; number * list',
            'MUL $3 $0 ; list * undefined',
            'MUL $3 $1 ; list * string',
            'MUL $3 $3 ; list * list',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 $16'
        ];

        const program = new stopLang(instructions);
        program.go();

        expect(program.currentResult).toEqual([
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            NaN,
            NaN,
            undefined,
            NaN,
            NaN,
            undefined,
            NaN,
            NaN
        ]);
    });
});
