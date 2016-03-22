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
            'GOTO "test"',
            'ALTER "test" 5',
            'LABEL "test"',
            'ALTER ; Bad instruction',
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
    
    it('must be numeric', () => {
        const instructions = [
            'NOOP $g'
        ];
        
        expect(() => new stopLang(instructions)).toThrowError(SyntaxError);
    });
    
    it('may be a double reference', () => {
        const instructions = [
            'NOOP "foo"',
            'INJECT "NOOP" $$0',
        ];
        
        const program = new stopLang(instructions);
        expect(program.execute()).toBe('foo');
    });
    
    it('pass through stdin', () => {
        const instructions = [
            'GOTO "foo"',
            'READ',
            'LABEL "foo"',
            'NOOP $1',
        ];
        
        const program = new stopLang(instructions, () => '"test"');
        expect(program.execute()).toBe('test');
    });
    
    it('pass through stdout', () => {
        const instructions = [
            'GOTO "foo"',
            'WRITE "bar"',
            'LABEL "foo"',
            'NOOP $1',
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
            'GOTO "foo"',
            'ERROR "bar"',
            'LABEL "foo"',
            'NOOP $1',
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
