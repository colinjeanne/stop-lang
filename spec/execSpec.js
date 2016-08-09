const stopLang = require('../umd/stop.js');

describe('An empty program', () => {
    const empty = new stopLang();

    it('returns undefined', () => {
        empty.go();
        expect(empty.currentResult).not.toBeDefined();
    });
});

describe('Instructions', () => {
    const getResult = instruction => {
        const program = new stopLang([instruction]);
        program.go();
        return program.currentResult;
    };

    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });

    it('cannot contain only comments', () => {
        expect(() => getResult('; Foo')).toThrowError(SyntaxError);
    });

    it('must have a known name', () => {
        expect(() => getResult('FOO')).toThrowError(SyntaxError);
    });

    it('can have an argument', () => {
        expect(getResult('NOOP 3')).toEqual(3);
    });

    it('can have multiple arguments', () => {
        expect(getResult('NOOP 3 "foo" [] 3')).
            toEqual([3, 'foo', [], 3]);
    });

    it('can have a label', () => {
        expect(getResult('(FOO) NOOP 3 "foo" [] 3')).
            toEqual([3, 'foo', [], 3]);
    });
});

describe('State change callback', () => {
    it('can be omitted', () => {
        const instructions = [
            'NOOP'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).not.toBeDefined();
        expect(program.isCompleted).toBe(true);
    });

    it('can be included and not pause the program', () => {
        const instructions = [
            'NOOP 1',
            'NOOP 2'
        ];

        const onStateChange = jasmine.createSpy().and.returnValue(false);

        const program = new stopLang(
            instructions,
            {
                onStateChange
            });

        program.go();
        expect(program.currentResult).toBe(2);
        expect(program.isCompleted).toBe(true);
        expect(onStateChange.calls.count()).toBe(3);

        program.go();
        expect(program.currentResult).toBe(2);
        expect(program.isCompleted).toBe(true);
        expect(onStateChange.calls.count()).toBe(3);
    });

    it('can pause the program', () => {
        const instructions = [
            'NOOP 1',
            'NOOP 2'
        ];

        const onStateChange = jasmine.createSpy().and.returnValue(true);

        const program = new stopLang(
            instructions,
            {
                onStateChange
            });

        expect(program.currentResult).not.toBeDefined();
        expect(program.isCompleted).toBe(false);
        expect(onStateChange.calls.count()).toBe(1);

        program.go();
        expect(program.currentResult).toBe(1);
        expect(program.isCompleted).toBe(false);
        expect(onStateChange.calls.count()).toBe(2);

        program.go();
        expect(program.currentResult).toBe(2);
        expect(program.isCompleted).toBe(true);
        expect(onStateChange.calls.count()).toBe(3);

        program.go();
        expect(program.currentResult).toBe(2);
        expect(program.isCompleted).toBe(true);
        expect(onStateChange.calls.count()).toBe(3);
    });

    it('is called when the program is reset', () => {
        const instructions = [
            'NOOP 1',
            'NOOP 2'
        ];

        const onStateChange = jasmine.createSpy().and.returnValue(false);

        const program = new stopLang(
            instructions,
            {
                onStateChange
            });

        program.go();
        expect(program.currentResult).toBe(2);
        expect(program.isCompleted).toBe(true);
        expect(onStateChange.calls.count()).toBe(3);

        program.reset();
        expect(program.currentResult).not.toBeDefined();
        expect(program.isCompleted).toBe(false);
        expect(onStateChange.calls.count()).toBe(4);

        program.go();
        expect(program.currentResult).toBe(2);
        expect(program.isCompleted).toBe(true);
        expect(onStateChange.calls.count()).toBe(6);
    });
});
