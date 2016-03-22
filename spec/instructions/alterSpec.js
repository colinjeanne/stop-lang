const stopLang = require('../../umd/stop.js');

describe('The ALTER instruction', () => {
    const getResult = (dataString, label) => {
        const instructions = [
            `ALTER ${dataString}`,
            `LABEL "${label}"`
        ];
        
        const program = new stopLang(instructions);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('', "foo")).toThrowError(SyntaxError);
    });
    
    it('cannot have one argument', () => {
        expect(() => getResult('"foo"', "foo")).toThrowError(SyntaxError);
    });
    
    it('cannot have more than two arguments', () => {
        expect(() => getResult('"foo" 0 1', 'foo')).toThrowError(SyntaxError);
    });
    
    it('fails if it cannot find the label', () => {
        expect(() => getResult('"bar" 0', 'foo')).toThrowError(SyntaxError);
    });
    
    it('must take a string and an integer', () => {
        expect(() => getResult('0 1', "foo")).toThrowError(SyntaxError);
        expect(() => getResult('[1] 1', "foo")).toThrowError(SyntaxError);
        expect(() => getResult('"foo" "bar"', "foo")).
            toThrowError(SyntaxError);
        expect(() => getResult('"foo" [1]', "foo")).toThrowError(SyntaxError);
        
        const undefinedLabel = new stopLang([
            'NOOP',
            'ALTER $0 0',
            'LABEL "foo"'
        ]);
        
        expect(() => undefinedLabel.execute()).toThrowError(SyntaxError);
        
        const undefinedIndex = new stopLang([
            'NOOP',
            'ALTER "foo" $0',
            'LABEL "foo"'
        ]);
        
        expect(() => undefinedIndex.execute()).toThrowError(SyntaxError);

        expect(getResult('"foo" 0', 'foo')).not.toBeDefined();
    });
    
    it('executes always executes the next instruction', () => {
        const allBefore = new stopLang([
            'NOOP 0',
            'NOOP 0',
            'NOOP 0',
            'LABEL "test"',
            'ALTER "test" 0',
            'GOTO "end"',
            'ALTER "bad" ; We should skip this',
            'LABEL "end"'
        ]);
        
        expect(allBefore.execute()).not.toBeDefined();
        
        const allAfter = new stopLang([
            'ALTER "test" 2',
            'GOTO "end"',
            'NOOP 0',
            'NOOP 0',
            'NOOP 0',
            'LABEL "test"',
            'ALTER "bad" ; We should skip this',
            'LABEL "end"'
        ]);
        
        expect(allAfter.execute()).not.toBeDefined();
        
        const removeBeforeAddAfter = new stopLang([
            'NOOP 0',
            'LABEL "test"',
            'ALTER "test" 3',
            'GOTO "end"',
            'ALTER "bad" ; We should skip this',
            'LABEL "end"'
        ]);
        
        expect(removeBeforeAddAfter.execute()).not.toBeDefined();
        
        const removeBetweenAddBefore = new stopLang([
            'NOOP 0',
            'ALTER "test" 0',
            'LABEL "test"',
            'GOTO "end"',
            'ALTER "bad" ; We should skip this',
            'LABEL "end"'
        ]);
        
        expect(removeBetweenAddBefore.execute()).not.toBeDefined();
        
        const removeAfterAddBefore = new stopLang([
            'NOOP 0',
            'ALTER "test" 0',
            'GOTO "end"',
            'LABEL "test"',
            'ALTER "bad" ; We should skip this',
            'LABEL "end"'
        ]);
        
        expect(removeAfterAddBefore.execute()).not.toBeDefined();
    });
    
    it('alters the first label', () => {
        const program = new stopLang([
            'ALTER "first" 6',
            'GOTO "test"',
            'LABEL "first"',
            'GOTO ; Bad: we should skip this',
            'LABEL "test"',
            'GOTO "first"',
            'GOTO "end"',
            'LABEL "first"',
            'GOTO ; Bad: we should skip this',
            'LABEL "end"'
        ]);
        
        expect(program.execute()).not.toBeDefined();
    });
});
