const stopLang = require('../../umd/stop.js');

describe('Lists', () => {
    const getResult = dataString => {
        const instruction = `NOOP ${dataString}`;
        const program = new stopLang([instruction]);
        return program.execute();
    };
    
    it('can be empty', () => {
        expect(getResult('[]')).toEqual([]);
        expect(getResult('[ ]')).toEqual([]);
    });
    
    it('can contain a single element', () => {
        expect(getResult('[3]')).toEqual([3]);
    });
    
    it('can have intermediate whitespace', () => {
        expect(getResult('[ 3 ]')).toEqual([3]);
    });
    
    it('can contain a multiple elements', () => {
        expect(getResult('[3, "foo", 4]')).toEqual([3, 'foo', 4]);
    });
    
    it('can contain lists', () => {
        expect(getResult('[[], [3]]')).toEqual([[], [3]]);
    });
    
    it('cannot contain comments', () => {
        expect(() => getResult('[;]')).toThrowError(SyntaxError);
    });
    
    it('cannot contain empty elements', () => {
        expect(() => getResult('[,]')).toThrowError(SyntaxError);
    });
    
    it('cannot multiple values per element', () => {
        expect(() => getResult('[3 3]')).toThrowError(SyntaxError);
    });
    
    it('cannot contain invalid values', () => {
        expect(() => getResult('["foo]')).toThrowError(SyntaxError);
        expect(() => getResult('[3, "foo]')).toThrowError(SyntaxError);
        expect(() => getResult('[3g, "foo"]')).toThrowError(SyntaxError);
    });
    
    it('must have an end bracket', () => {
        expect(() => getResult('[')).toThrowError(SyntaxError);
    });
});
