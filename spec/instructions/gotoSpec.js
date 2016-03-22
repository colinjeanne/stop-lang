const stopLang = require('../../umd/stop.js');

describe('The GOTO instruction', () => {
    const getResult = (dataString, label) => {
        const instructions = [
            `GOTO ${dataString}`,
            `LABEL "${label}"`
        ];
        
        const program = new stopLang(instructions);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('', "foo")).toThrowError(SyntaxError);
    });
    
    it('must take 0 or 1 as its optional second argument', () => {
        expect(() => getResult('"foo" "bar"', 'foo')).
            toThrowError(SyntaxError);
        expect(() => getResult('"foo" -1', 'foo')).
            toThrowError(SyntaxError);
        expect(() => getResult('"foo" 0.1', 'foo')).
            toThrowError(SyntaxError);
        expect(() => getResult('"foo" 1.1', 'foo')).
            toThrowError(SyntaxError);
        expect(() => getResult('"foo" []', 'foo')).
            toThrowError(SyntaxError);
        
        expect(getResult('"foo" 0', 'foo')).not.toBeDefined();
        expect(getResult('"foo" 1', 'foo')).not.toBeDefined();
    });
    
    it('fails if it cannot find the label', () => {
        expect(() => getResult('"bar"', 'foo')).toThrowError(SyntaxError);
    });
    
    it('must take a string', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
        expect(() => getResult('[1]')).toThrowError(SyntaxError);
        
        const badInstructions = [
            'NOOP',
            'GOTO $0',
            'LABEL "foo"'
        ];
        
        const badProgram = new stopLang(badInstructions);
        
        expect(() => badProgram.execute()).toThrowError(SyntaxError);

        expect(getResult('"foo"', 'foo')).not.toBeDefined();
    });
    
    it('goes to the first label', () => {
        const program = new stopLang([
            'GOTO "test"',
            'LABEL "first"',
            'GOTO "end"',
            'LABEL "test"',
            'GOTO "first"',
            'LABEL "first"',
            'GOTO ; Bad: we should skip this',
            'LABEL "end"'
        ]);
        
        expect(program.execute()).not.toBeDefined();
    });
    
    it('jumps if the conditional is 1', () => {
        const program = new stopLang([
            'GOTO "good" 1',
            'GOTO ; Bad: we should skip this',
            'LABEL "good"'
        ]);
        
        expect(program.execute()).not.toBeDefined();
    });
    
    it('does not jump if the conditional is 0', () => {
        const program = new stopLang([
            'GOTO "bad" 0',
            'GOTO "good"',
            'LABEL "bad"',
            'GOTO ; Bad: we should skip this',
            'LABEL "good"'
        ]);
        
        expect(program.execute()).not.toBeDefined();
    });
});
