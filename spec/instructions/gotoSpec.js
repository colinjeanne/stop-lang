const stopLang = require('../../umd/stop.js');

describe('The GOTO instruction', () => {
    const getResult = (dataString, label) => {
        const instructions = [
            `GOTO ${dataString}`,
            `(${label}) NOOP`
        ];

        const program = new stopLang(instructions);
        return program.execute();
    };

    it('cannot be empty', () => {
        expect(() => getResult('', 'FOO')).toThrowError(SyntaxError);
    });

    it('must take 0 or 1 as its optional second argument', () => {
        expect(() => getResult('"FOO" "bar"', 'FOO')).
            toThrowError(SyntaxError);
        expect(() => getResult('"FOO" -1', 'FOO')).
            toThrowError(SyntaxError);
        expect(() => getResult('"FOO" 0.1', 'FOO')).
            toThrowError(SyntaxError);
        expect(() => getResult('"FOO" 1.1', 'FOO')).
            toThrowError(SyntaxError);
        expect(() => getResult('"FOO" []', 'FOO')).
            toThrowError(SyntaxError);

        expect(getResult('"FOO" 0', 'FOO')).not.toBeDefined();
        expect(getResult('"FOO" 1', 'FOO')).not.toBeDefined();
    });

    it('fails if it cannot find the label', () => {
        expect(() => getResult('"BAR"', 'FOO')).toThrowError(SyntaxError);
    });

    it('must take a string', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
        expect(() => getResult('[1]')).toThrowError(SyntaxError);

        const badInstructions = [
            'NOOP',
            'GOTO $0',
            '(FOO) NOOP'
        ];

        const badProgram = new stopLang(badInstructions);

        expect(() => badProgram.execute()).toThrowError(SyntaxError);

        expect(getResult('"FOO"', 'FOO')).not.toBeDefined();
    });

    it('goes to the first label', () => {
        const program = new stopLang([
            'GOTO "TEST"',
            '(FIRST) NOOP',
            'GOTO "END"',
            '(TEST) NOOP',
            'GOTO "FIRST"',
            '(FIRST) NOOP',
            'GOTO ; Bad: we should skip this',
            '(END) NOOP'
        ]);

        expect(program.execute()).not.toBeDefined();
    });

    it('jumps if the conditional is 1', () => {
        const program = new stopLang([
            'GOTO "GOOD" 1',
            'GOTO ; Bad: we should skip this',
            '(GOOD) NOOP'
        ]);

        expect(program.execute()).not.toBeDefined();
    });

    it('does not jump if the conditional is 0', () => {
        const program = new stopLang([
            'GOTO "BAD" 0',
            'GOTO "GOOD"',
            '(BAD) NOOP',
            'GOTO ; Bad: we should skip this',
            '(GOOD) NOOP'
        ]);

        expect(program.execute()).not.toBeDefined();
    });
});
