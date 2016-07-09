const stopLang = require('../../umd/stop.js');

describe('The EQUAL instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`EQUAL ${dataString}`]);
        return program.execute();
    };

    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });

    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });

    it('returns if two numbers are equal', () => {
        expect(getResult('1 1')).toBe(1);
        expect(getResult('1 0')).toBe(0);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('returns if a sequence are all equal', () => {
        expect(getResult('0 0 0')).toBe(1);
        expect(getResult('0 0 1')).toBe(0);
        expect(getResult('0 1 0')).toBe(0);
    });

    it('returns if the first item in a list is equal to the second', () => {
        expect(getResult('[1, 1]')).toBe(1);
    });

    it('returns that NaN does not equal NaN', () => {
        expect(getResult('NAN NAN')).toBe(0);
    });

    it('returns if any type is equal to any other type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'EQUAL $0 $0 ; undefined === undefined',
            'EQUAL $0 $1 ; undefined === string',
            'EQUAL $0 $2 ; undefined === number',
            'EQUAL $0 $3 ; undefined === list',
            'EQUAL $1 $0 ; string === undefined',
            'EQUAL $1 $1 ; string === string',
            'EQUAL $1 $2 ; string === number',
            'EQUAL $1 $3 ; string === list',
            'EQUAL $2 $0 ; number === undefined',
            'EQUAL $2 $1 ; number === string',
            'EQUAL $2 $2 ; number === number',
            'EQUAL $2 $3 ; number === list',
            'EQUAL $3 $0 ; list === undefined',
            'EQUAL $3 $1 ; list === string',
            'EQUAL $3 $2 ; list === number',
            'EQUAL $3 $3 ; list === list',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 $16 $17 $18 $19'
        ];

        const program = new stopLang(instructions);

        expect(program.execute()).toEqual([
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            1
        ]);
    });
});
