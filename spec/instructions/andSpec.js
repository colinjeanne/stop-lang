const stopLang = require('../../umd/stop.js');

describe('The AND instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`AND ${dataString}`]);
        return program.execute();
    };

    it('can be empty', () => {
        expect(getResult('')).toBe(0);
    });

    it('returns the truthy-ness of a single argument', () => {
        expect(getResult('UNDEFINED')).toBe(0);
        expect(getResult('0')).toBe(0);
        expect(getResult('1')).toBe(1);
        expect(getResult('NAN')).toBe(0);
        expect(getResult('INFINITY')).toBe(1);
        expect(getResult('[]')).toBe(0);
        expect(getResult('[0]')).toBe(0);
        expect(getResult('[1]')).toBe(1);
        expect(getResult('""')).toBe(0);
        expect(getResult('"1"')).toBe(1);
    });

    it('can AND two numbers', () => {
        expect(getResult('13 7')).toBe(5);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('can AND more than two numbers', () => {
        expect(getResult('13 7 2')).toBe(0);
    });

    it('can AND numbers in a list', () => {
        expect(getResult('[13, 7]')).toBe(5);
    });

    it('can intersect two lists', () => {
        expect(getResult('[1, 2, 3] [2, 3, 4]')).toEqual([2, 3]);
    });

    it('can intersect more than two lists', () => {
        expect(getResult('[1, 2, 3, 4] [2, 3, 4, 5] [1, 3, 4]')).
            toEqual([3, 4]);
    });

    it('can AND any type to any type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'AND $0 $0 ; undefined & undefined',
            'AND $0 $1 ; undefined & string',
            'AND $0 $2 ; undefined & number',
            'AND $0 $3 ; undefined & list',
            'AND $1 $0 ; string & undefined',
            'AND $1 $1 ; string & string',
            'AND $1 $2 ; string & number',
            'AND $1 $3 ; string & list',
            'AND $2 $0 ; number & undefined',
            'AND $2 $1 ; number & string',
            'AND $2 $3 ; number & list',
            'AND $3 $0 ; list & undefined',
            'AND $3 $1 ; list & string',
            'AND $3 $2 ; list & number',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 $16 $17'
        ];

        const program = new stopLang(instructions);

        expect(program.execute()).toEqual([
            0,
            0,
            0,
            0,
            0,
            1,
            1,
            1,
            0,
            1,
            1,
            0,
            1,
            1
        ]);
    });
});
