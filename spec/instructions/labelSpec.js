const stopLang = require('../../umd/stop.js');

describe('The LABEL instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`LABEL ${dataString}`]);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });
    
    it('cannot have more than one argument', () => {
        expect(() => getResult('"foo" "bar"')).toThrowError(SyntaxError);
    });
    
    it('must take a string', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
        expect(() => getResult('[1]')).toThrowError(SyntaxError);
        
        const instructions = [
            'NOOP',
            'LABEL $0'
        ];
        
        const program = new stopLang(instructions);
        
        expect(() => program.execute()).toThrowError(SyntaxError);
        
        expect(getResult('"foo"')).not.toBeDefined();
    });
});
