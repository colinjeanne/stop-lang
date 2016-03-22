const stopLang = require('../../umd/stop.js');

describe('The SUB instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`SUB ${dataString}`]);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });
    
    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });
    
    it('can subtract two items', () => {
        expect(getResult('3 2')).toBe(1);
    });
    
    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });
    
    it('can subtract more than two items', () => {
        expect(getResult('1 1 1')).toBe(-1);
    });
    
    it('can subtract items in a list', () => {
        expect(getResult('[2, 1]')).toBe(1);
    });
    
    it('can remove items from a list', () => {
        expect(getResult('[2, 1] 0')).toEqual([1]);
        expect(getResult('[2, 1] 2')).toEqual([2, 1]);
        expect(getResult('[2, 1, 4, 5] 0 2')).toEqual([1, 5]);
    });
    
    it('can remove characters from a string', () => {
        expect(getResult('"foo" 0')).toEqual("oo");
        expect(getResult('"foo" 3')).toEqual("foo");
        expect(getResult('"foobar" 0 2')).toEqual("obar");
    });
    
    it('can subtract any type to any type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'SUB $0 $1 ; undefined - string',
            'SUB $0 $2 ; undefined - number',
            'SUB $0 $3 ; undefined - list',
            'SUB $1 $0 ; string - undefined',
            'SUB $1 $1 ; string - string',
            'SUB $1 $3 ; string - list',
            'SUB $2 $0 ; number - undefined',
            'SUB $2 $1 ; number - string',
            'SUB $2 $3 ; number - list',
            'SUB $3 $0 ; list - undefined',
            'SUB $3 $1 ; list - string',
            'SUB $3 $3 ; list - list',
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
