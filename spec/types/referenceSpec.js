const stopLang = require('../../umd/stop.js');

describe('References', () => {
    'use strict';

    it('can reference the current instruction pointer', () => {
        const instructions = [
            'NOOP',
            'NOOP',
            'NOOP $ip'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(2);
    });

    it('can reference the current instruction pointer while handling a reference', () => {
        const instructions = [
            'NOOP',
            'NOOP $ip',
            'NOOP $1'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(2);
    });

    it('can reference a value relative to the instruction pointer', () => {
        const forwardProgram = new stopLang([
            'NOOP 2',
            'NOOP 1',
            'NOOP $ip+1'
        ]);
        forwardProgram.go();
        expect(forwardProgram.currentResult).toBe(2);

        const reverseProgram = new stopLang([
            'NOOP 2',
            'NOOP 1',
            'NOOP $ip-1'
        ]);
        reverseProgram.go();
        expect(reverseProgram.currentResult).toBe(1);

        const deepProgram = new stopLang([
            'NOOP 2',
            'NOOP $ip-3',
            'NOOP $ip-2',
            'NOOP $ip-1'
        ]);
        deepProgram.go();
        expect(deepProgram.currentResult).toBe(2);
    });

    it('can reference the location of the current instruction', () => {
        const instructions = [
            'NOOP',
            'NOOP',
            'NOOP $ci'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(2);
    });

    it('can reference the location of the current instruction while handling a reference', () => {
        const instructions = [
            'NOOP',
            'NOOP $ci',
            'NOOP $1'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(1);
    });

    it('can reference a value relative to the location of the current instruction', () => {
        const forwardProgram = new stopLang([
            'NOOP 3',
            'NOOP 1',
            'NOOP $ci+1'
        ]);
        forwardProgram.go();
        expect(forwardProgram.currentResult).toBe(3);

        const reverseProgram = new stopLang([
            'NOOP 2',
            'NOOP 1',
            'NOOP $ci-1'
        ]);
        reverseProgram.go();
        expect(reverseProgram.currentResult).toBe(1);

        const deepProgram = new stopLang([
            'NOOP 2',
            'NOOP $ci-1',
            'NOOP $ci-1',
            'NOOP $ci-1'
        ]);
        deepProgram.go();
        expect(deepProgram.currentResult).toBe(2);
    });

    it('can reference the return value of another instruction', () => {
        const instructions = [
            'NOOP 3',
            'NOOP $0'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(3);
    });

    it('are calculated modulo the number of instructions', () => {
        const instructions = [
            'NOOP 3',
            'NOOP 1',
            'NOOP $4'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(1);
    });

    it('updates the set of instructions', () => {
        const instructions = [
            'NOOP $2',
            'GOTO "TEST"',
            'ALTER "TEST" 4',
            '(TEST) ALTER ; Bad instruction',
            'NOOP 1'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(1);
    });

    it('can be a negative number', () => {
        const instructions = [
            'NOOP 6',
            'NOOP 5',
            'NOOP 4',
            'NOOP 3',
            'NOOP $-2',
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(3);
    });

    it('may reference labels', () => {
        const instructions = [
            '(TEST) NOOP 3',
            'NOOP $TEST',
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe(3);
    });

    it('may be relative to labels', () => {
        const forwardProgram = new stopLang([
            '(TEST) NOOP 3',
            'NOOP 2',
            'NOOP 1',
            'NOOP $TEST+2',
        ]);
        forwardProgram.go();
        expect(forwardProgram.currentResult).toBe(1);

        const reverseProgram = new stopLang([
            'NOOP 2',
            'NOOP 1',
            '(TEST) NOOP 3',
            'NOOP $TEST-2',
        ]);
        reverseProgram.go();
        expect(reverseProgram.currentResult).toBe(2);
    });

    it('label references must be upper case', () => {
        const instructions = [
            'NOOP $g',
            '(G) NOOP'
        ];

        expect(() => new stopLang(instructions)).toThrowError(SyntaxError);
    });

    it('label references must reference actual labels', () => {
        const instructions = [
            'NOOP $TEST'
        ];

        const program = new stopLang(instructions);
        expect(() => program.go()).toThrowError(Error);
    });

    it('may be a double reference', () => {
        const instructions = [
            'NOOP "foo"',
            'INJECT "NOOP" $$0',
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toBe('foo');
    });

    it('can appear multiple times in instruction data', () => {
        const instructions = [
            'NOOP 3',
            'NOOP 2',
            'INJECT "NOOP" $$0 $$1'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toEqual([3, 2]);
    });

    it('can reference instructions which themselves contain references', () => {
        const instructions = [
            'NOOP 3',
            'NOOP 2',
            'NOOP $0 $1',
            'NOOP $1 $0',
            'NOOP $2 $3 $1'
        ];

        const program = new stopLang(instructions);
        program.go();
        expect(program.currentResult).toEqual([[3, 2], [2, 3], 2]);
    });

    it('can refer to stdin', () => {
        const instructions = [
            'NOOP $stdin',
        ];

        const program = new stopLang(
            instructions,
            {
                stdin: () => '"test"'
            });
        program.go();
        expect(program.currentResult).toBe('test');
    });

    it('pass through stdout', () => {
        const instructions = [
            'GOTO "FOO"',
            'WRITE "bar"',
            '(FOO) NOOP $1',
        ];

        let output = undefined;
        let stdout = v => output = v;

        const program = new stopLang(
            instructions,
            {
                stdout
            });
        program.go();
        expect(program.currentResult).not.toBeDefined();
        expect(output).toBe('"bar"');
    });

    it('pass through stderr', () => {
        const instructions = [
            'GOTO "FOO"',
            'ERROR "bar"',
            '(FOO) NOOP $1',
        ];

        let output = undefined;
        let stderr = v => output = v;

        const program = new stopLang(
            instructions,
            {
                stderr
            });
        program.go();
        expect(program.currentResult).not.toBeDefined();
        expect(output).toBe('"bar"');
    });

    describe('The $stdin reference', () => {
        const getResult = stdin => {
            const program = new stopLang(
                ['NOOP $stdin'],
                {
                    stdin
                });
            program.go();
            return program.currentResult;
        };

        it('cannot read references', () => {
            const stdin = () => '$1';
            expect(() => getResult(stdin)).toThrowError(SyntaxError);
        });

        it('cannot read malformed data', () => {
            const stdin = () => 'foo';
            expect(() => getResult(stdin)).toThrowError(SyntaxError);
        });

        it('can read undefined', () => {
            expect(getResult(() => 'UNDEFINED')).not.toBeDefined();
        });

        it('can read numbers', () => {
            expect(getResult(() => '1')).toBe(1);
            expect(getResult(() => '-1')).toBe(-1);
            expect(getResult(() => '1.25')).toBe(1.25);
            expect(getResult(() => '1e2')).toBe(100);
        });

        it('can read strings', () => {
            expect(getResult(() => '""')).toBe('');
            expect(getResult(() => '"foo"')).toBe('foo');
        });

        it('can read lists', () => {
            expect(getResult(() => '[1,2]')).toEqual([1,2]);
            expect(getResult(() => '1 2')).toEqual([1,2]);
            expect(getResult(() => '[]')).toEqual([]);
            expect(getResult(() => '[1]')).toEqual([1]);
            expect(getResult(() => '[[1], 2]')).toEqual([[1], 2]);
        });
    });
});
