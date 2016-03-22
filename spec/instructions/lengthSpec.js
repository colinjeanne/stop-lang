const stopLang = require('../../umd/stop.js');

describe('The LENGTH instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`LENGTH ${dataString}`]);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });
    
    it('cannot take a numeric argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });
    
    it('cannot take double references', () => {
        expect(() => getResult('$$0')).toThrowError(SyntaxError);
    });
    
    it('cannot take an null argument', () => {
        const instructions = [
            'LENGTH $1',
            'NOOP'
        ];
        
        const program = new stopLang(instructions);
        
        expect(() => program.execute()).toThrowError(SyntaxError);
    });
    
    it('can return the length of a list', () => {
        expect(getResult('[1, 2]')).toBe(2);
    });
    
    it('can return the length of an implicit list', () => {
        expect(getResult('1 2')).toBe(2);
    });
    
    it('can return the length of a string', () => {
        expect(getResult('"abc"')).toBe(3);
    });
});
