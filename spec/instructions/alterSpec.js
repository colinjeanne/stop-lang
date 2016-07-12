const stopLang = require('../../umd/stop.js');

describe('The ALTER instruction', () => {
    const getResult = (dataString, label) => {
        const instructions = [
            `ALTER ${dataString}`,
            `(${label}) NOOP`
        ];

        const program = new stopLang(instructions);
        return program.execute();
    };

    it('cannot be empty', () => {
        expect(() => getResult('', 'FOO')).toThrowError(SyntaxError);
    });

    it('cannot have one argument', () => {
        expect(() => getResult('"FOO"', 'FOO')).toThrowError(SyntaxError);
    });

    it('cannot have more than two arguments', () => {
        expect(() => getResult('"FOO" 0 1', 'FOO')).toThrowError(SyntaxError);
    });

    it('adds a label if one is not found', () => {
        const instructions = [
            'GOTO "FIRST"',
            'GOTO "END"',
            '(FIRST) ALTER "SECOND" 1',
            'GOTO "SECOND"',
            'ALTER "BAD" ; We should skip this',
            '(END) NOOP'
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).not.toBeDefined();
    });

    it('can remove a label', () => {
        const instructions = [
            'ALTER UNDEFINED 2',
            'GOTO "TEST"',
            '(TEST) ALTER "BAD" ; We should skip this',
            '(TEST) NOOP'
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).not.toBeDefined();
    });

    it('must take a string and an integer', () => {
        expect(() => getResult('0 1', 'FOO')).toThrowError(SyntaxError);
        expect(() => getResult('[1] 1', 'FOO')).toThrowError(SyntaxError);
        expect(() => getResult('"FOO" "bar"', 'FOO')).
            toThrowError(SyntaxError);
        expect(() => getResult('"FOO" [1]', 'FOO')).toThrowError(SyntaxError);

        const undefinedIndex = new stopLang([
            'NOOP',
            'ALTER "FOO" $0',
            '(FOO) NOOP'
        ]);

        expect(() => undefinedIndex.execute()).toThrowError(SyntaxError);

        expect(getResult('"FOO" 0', 'FOO')).not.toBeDefined();
    });

    it('can move the label to its own instruction', () => {
        const allBefore = new stopLang([
            'ALTER "END" 3',
            'GOTO "END"',
            'ALTER "BAD" ; We should skip this',
            '(END) NOOP'
        ]);

        expect(allBefore.execute()).not.toBeDefined();
    });

    it('can move the label to a different instruction', () => {
        const allBefore = new stopLang([
            'ALTER "END" 3',
            'GOTO "END"',
            '(END) ALTER "BAD" ; We should skip this',
            'NOOP'
        ]);

        expect(allBefore.execute()).not.toBeDefined();
    });

    it('alters the first label', () => {
        const program = new stopLang([
            'ALTER "FIRST" 6',
            'GOTO "TEST"',
            '(FIRST) NOOP',
            'GOTO ; Bad: we should skip this',
            '(TEST) GOTO "FIRST"',
            'GOTO ; Bad: we should skip this',
            'GOTO "END"',
            '(FIRST) NOOP',
            'GOTO ; Bad: we should skip this',
            '(END) NOOP'
        ]);

        expect(program.execute()).not.toBeDefined();
    });
});
