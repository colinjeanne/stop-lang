const stopLang = require('../../umd/stop.js');

describe('The EJECT instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`EJECT ${dataString}`]);
        program.go();
        return program.currentResult;
    };

    it('can be empty', () => {
        const instructions = [
            'EJECT',
            'NOOP 2',
            'NOOP 1'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(2);
    });

    it('must be empty', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });

    it('can remove itself', () => {
        expect(getResult('')).not.toBeDefined();
    });
});
