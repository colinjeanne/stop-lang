const stopLang = require('../../umd/stop.js');

describe('The DIV instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`DIV ${dataString}`]);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });
    
    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });
    
    it('can divide two numbers', () => {
        expect(getResult('6 3')).toBe(2);
    });
    
    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });
    
    it('can divide more than two numbers', () => {
        expect(getResult('24 3 4')).toBe(2);
    });
    
    it('can divide numbers in a list', () => {
        expect(getResult('[6, 3]')).toBe(2);
    });
    
    it('can divide any type to any type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'DIV $0 $1 ; undefined / string',
            'DIV $0 $2 ; undefined / number',
            'DIV $0 $3 ; undefined / list',
            'DIV $1 $0 ; string / undefined',
            'DIV $1 $2 ; string / number',
            'DIV $1 $3 ; string / list',
            'DIV $2 $0 ; number / undefined',
            'DIV $2 $1 ; number / string',
            'DIV $2 $3 ; number / list',
            'DIV $3 $0 ; list / undefined',
            'DIV $3 $1 ; list / string',
            'DIV $3 $2 ; list / number',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15'
        ];
        
        const program = new stopLang(instructions);
        
        expect(program.execute()).toEqual([
            NaN,
            NaN,
            NaN,
            NaN,
            NaN,
            NaN,
            NaN,
            NaN,
            NaN,
            NaN,
            NaN,
            NaN
        ]);
    });
});
