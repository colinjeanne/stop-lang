const stopLang = require('../../umd/stop.js');

describe('The NEQUAL instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`NEQUAL ${dataString}`]);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });
    
    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });
    
    it('returns if two numbers are not equal', () => {
        expect(getResult('1 1')).toBe(0);
        expect(getResult('1 0')).toBe(1);
    });
    
    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });
    
    it('returns if any item in a sequence is not equal to any other', () => {
        expect(getResult('0 0 0')).toBe(0);
        expect(getResult('0 0 1')).toBe(1);
        expect(getResult('0 1 0')).toBe(1);
    });
    
    it('returns if two list items are not equal', () => {
        expect(getResult('[1, 1]')).toBe(0);
    });
    
    it('returns if any type is not equal to any other type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'NEQUAL $0 $0 ; undefined === undefined',
            'NEQUAL $0 $1 ; undefined === string',
            'NEQUAL $0 $2 ; undefined === number',
            'NEQUAL $0 $3 ; undefined === list',
            'NEQUAL $1 $0 ; string === undefined',
            'NEQUAL $1 $1 ; string === string',
            'NEQUAL $1 $2 ; string === number',
            'NEQUAL $1 $3 ; string === list',
            'NEQUAL $2 $0 ; number === undefined',
            'NEQUAL $2 $1 ; number === string',
            'NEQUAL $2 $2 ; number === number',
            'NEQUAL $2 $3 ; number === list',
            'NEQUAL $3 $0 ; list === undefined',
            'NEQUAL $3 $1 ; list === string',
            'NEQUAL $3 $2 ; list === number',
            'NEQUAL $3 $3 ; list === list',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 $16 $17 $18 $19'
        ];
        
        const program = new stopLang(instructions);
        
        expect(program.execute()).toEqual([
            0,
            1,
            1,
            1,
            1,
            0,
            1,
            1,
            1,
            1,
            0,
            1,
            1,
            1,
            1,
            0
        ]);
    });
});
