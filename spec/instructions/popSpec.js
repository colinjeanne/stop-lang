const stopLang = require('../../umd/stop.js');

describe('The POP instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`POP ${dataString}`]);
        return program.execute();
    };
    
    it('can be empty', () => {
        const instructions = [
            'NOOP 1',
            'NOOP 2',
            'POP',
            'NOOP $0'
        ];
        
        const program = new stopLang(instructions);
        expect(program.execute()).toBe(2);
    });
    
    it('must be empty', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });
});
