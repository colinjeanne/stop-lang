const stopLang = require('../../umd/stop.js');

describe('The OR instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`OR ${dataString}`]);
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

    it('can OR two numbers', () => {
        expect(getResult('5 3')).toBe(7);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('can OR more than two numbers', () => {
        expect(getResult('1 2 4')).toBe(7);
    });

    it('can OR numbers in a list', () => {
        expect(getResult('[5, 3]')).toBe(7);
    });

    it('can union two lists', () => {
        expect(getResult('[1, 2, 3] [2, 3, 4]')).toEqual([1, 2, 3, 4]);
    });

    it('can union more than two lists', () => {
        expect(getResult('[1, 2, 3, 4] [2, 3, 4, 5] [1, 3, 4]')).
            toEqual([1, 2, 3, 4, 5]);
    });

    it('can OR any type to any type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'OR $0 $0 ; undefined OR undefined',
            'OR $0 $1 ; undefined OR string',
            'OR $0 $2 ; undefined OR number',
            'OR $0 $3 ; undefined OR list',
            'OR $1 $0 ; string OR undefined',
            'OR $1 $1 ; string OR string',
            'OR $1 $2 ; string OR number',
            'OR $1 $3 ; string OR list',
            'OR $2 $0 ; number OR undefined',
            'OR $2 $1 ; number OR string',
            'OR $2 $3 ; number OR list',
            'OR $3 $0 ; list OR undefined',
            'OR $3 $1 ; list OR string',
            'OR $3 $2 ; list OR number',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 $16 $17'
        ];

        const program = new stopLang(instructions);

        expect(program.execute()).toEqual([
            0,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
        ]);
    });
});
