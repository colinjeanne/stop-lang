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
    
    it('can concatenate string', () => {
        expect(getResult('"foo" "bar"')).toBe("foobar");
    });
    
    it('can add any type to any type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'ADD $0 $1 ; undefined + string',
            'ADD $0 $2 ; undefined + number',
            'ADD $0 $3 ; undefined + list',
            'ADD $1 $0 ; string + undefined',
            'ADD $1 $2 ; string + number',
            'ADD $1 $3 ; string + list',
            'ADD $2 $0 ; number + undefined',
            'ADD $2 $1 ; number + string',
            'ADD $2 $3 ; number + list',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12'
        ];
        
        const program = new stopLang(instructions);
        
        expect(program.execute()).toEqual([
            'undefinedfoo',
            NaN,
            'undefined1,2',
            'fooundefined',
            'foo3',
            'foo1,2',
            NaN,
            '3foo',
            '31,2'
        ]);
    });
});