const stopLang = require('../../umd/stop.js');

const getResult = dataString => {
    const instruction = `NOOP ${dataString}`;
    const program = new stopLang([instruction]);
    program.go();
    return program.currentResult;
};

describe('Quoted strings', () => {
    it('can be empty', () => {
        expect(getResult('""')).toBe('');
    });

    it('can a simple string', () => {
        expect(getResult('"foo"')).toBe('foo');
    });

    it('can have escaped quotes', () => {
        expect(getResult('"foo \\"bar\\""')).toBe('foo "bar"');
    });

    it('can have escaped backslashes', () => {
        expect(getResult('"foo \\\\bar\\\\"')).toBe('foo \\bar\\');
    });

    it('can have semicolons', () => {
        expect(getResult('"foo ; bar"')).toBe('foo ; bar');
    });

    it('can be in a list', () => {
        expect(getResult('["foo", "bar"]')).toEqual(['foo', 'bar']);
    });

    it('throws on unknown escaped characters', () => {
        expect(() => getResult('"\\b"')).toThrowError(SyntaxError);
    });

    it('throws on missing end quotes', () => {
        expect(() => getResult('"foo')).toThrowError(SyntaxError);
    });
});
