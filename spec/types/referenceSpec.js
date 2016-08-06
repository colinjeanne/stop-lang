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
        expect(program.execute()).toBe(2);
    });

    it('can reference the current instruction pointer while handling a reference', () => {
        const instructions = [
            'NOOP',
            'NOOP $ip',
            'NOOP $1'
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).toBe(2);
    });

    it('can reference a value relative to the instruction pointer', () => {
        const forwardProgram = new stopLang([
            'NOOP 2',
            'NOOP 1',
            'NOOP $ip+1'
        ]);
        expect(forwardProgram.execute()).toBe(2);

        const reverseProgram = new stopLang([
            'NOOP 2',
            'NOOP 1',
            'NOOP $ip-1'
        ]);
        expect(reverseProgram.execute()).toBe(1);

        const deepProgram = new stopLang([
            'NOOP 2',
            'NOOP $ip-1',
            'NOOP $ip-1',
            'NOOP $ip-1'
        ]);
        expect(deepProgram.execute()).toBe(2);
    });

    it('can reference the return value of another instruction', () => {
        const instructions = [
            'NOOP 3',
            'NOOP $0'
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).toBe(3);
    });

    it('are calculated modulo the number of instructions', () => {
        const instructions = [
            'NOOP 3',
            'NOOP 1',
            'NOOP $4'
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).toBe(1);
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
        expect(program.execute()).toBe(1);
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
        expect(program.execute()).toBe(3);
    });

    it('may reference labels', () => {
        const instructions = [
            '(TEST) NOOP 3',
            'NOOP $TEST',
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).toBe(3);
    });

    it('may be relative to labels', () => {
        const forwardProgram = new stopLang([
            '(TEST) NOOP 3',
            'NOOP 2',
            'NOOP 1',
            'NOOP $TEST+2',
        ]);
        expect(forwardProgram.execute()).toBe(1);

        const reverseProgram = new stopLang([
            'NOOP 2',
            'NOOP 1',
            '(TEST) NOOP 3',
            'NOOP $TEST-2',
        ]);
        expect(reverseProgram.execute()).toBe(2);
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
        expect(() => program.execute()).toThrowError(Error);
    });

    it('may be a double reference', () => {
        const instructions = [
            'NOOP "foo"',
            'INJECT "NOOP" $$0',
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).toBe('foo');
    });

    it('can appear multiple times in instruction data', () => {
        const instructions = [
            'NOOP 3',
            'NOOP 2',
            'INJECT "NOOP" $$0 $$1'
        ];

        const program = new stopLang(instructions);
        expect(program.execute()).toEqual([3, 2]);
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
        expect(program.execute()).toEqual([[3, 2], [2, 3], 2]);
    });

    it('pass through stdin', () => {
        const instructions = [
            'GOTO "FOO"',
            'READ',
            '(FOO) NOOP $1',
        ];

        const program = new stopLang(instructions, () => '"test"');
        expect(program.execute()).toBe('test');
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
            () => 'test',
            stdout);
        expect(program.execute()).not.toBeDefined();
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
            () => 'test',
            () => {},
            stderr);
        expect(program.execute()).not.toBeDefined();
        expect(output).toBe('"bar"');
    });
});
