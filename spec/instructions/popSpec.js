const stopLang = require('../../umd/stop.js');

describe('The POP instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`POP ${dataString}`]);
        program.go();
        return program.currentResult;
    };

    it('can be empty', () => {
        const instructions = [
            'NOOP 1',
            'NOOP 2',
            'POP',
            'NOOP $0'
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

    it('can update the value instruction pointer', () => {
        const instructions = [
            'GOTO "TEST"',
            'POP',
            '(TEST) NOOP $ip $ci $1 $ip $ci'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toEqual([2, 2, undefined, 1, 1]);
    });
});
