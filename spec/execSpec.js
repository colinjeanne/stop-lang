const stopLang = require('../umd/stop.js');

describe('An empty program', () => {
    const empty = new stopLang();
    
    it('returns undefined', () => {
        expect(empty.execute()).not.toBeDefined();
    });
});

describe('Instructions', () => {
    const getResult = instruction => {
        const program = new stopLang([instruction]);
        return program.execute();
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
});
