const stopLang = require('../../umd/stop.js');

describe('The MOD instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`MOD ${dataString}`]);
        return program.execute();
    };

    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });

    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });

    it('can mod two numbers', () => {
        expect(getResult('49 2')).toBe(1);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('can mod more than two numbers', () => {
        expect(getResult('49 5 3')).toBe(1);
    });

    it('can mod numbers in a list', () => {
        expect(getResult('[49, 2]')).toBe(1);
    });

    it('can mod any type to any type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'MOD $0 $0 ; undefined % undefined',
            'MOD $0 $1 ; undefined % string',
            'MOD $0 $2 ; undefined % number',
            'MOD $0 $3 ; undefined % list',
            'MOD $1 $0 ; string % undefined',
            'MOD $1 $1 ; string % string',
            'MOD $1 $2 ; string % number',
            'MOD $1 $3 ; string % list',
            'MOD $2 $0 ; number % undefined',
            'MOD $2 $1 ; number % string',
            'MOD $2 $3 ; number % list',
            'MOD $3 $0 ; list % undefined',
            'MOD $3 $1 ; list % string',
            'MOD $3 $2 ; list % number',
            'MOD $3 $3 ; list % list',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 $16 $17 $18'
        ];

        const program = new stopLang(instructions);

        expect(program.execute()).toEqual([
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            NaN,
            NaN,
            NaN,
            undefined,
            NaN,
            NaN,
            undefined,
            NaN,
            NaN,
            NaN
        ]);
    });
});
