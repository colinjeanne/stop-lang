const stopLang = require('../../umd/stop.js');

describe('The READ instruction', () => {
    const getResult = (dataString, stdin) => {
        const program = new stopLang([`READ ${dataString}`], stdin);
        return program.execute();
    };

    it('can be empty', () => {
        const stdin = () => '"foo"';
        expect(getResult('', stdin)).toBe('foo');
    });

    it('cannot take arguments', () => {
        const stdin = () => '"foo"';
        expect(() => getResult('1', stdin)).toThrowError(SyntaxError);
    });

    it('cannot read references', () => {
        const stdin = () => '$1';
        expect(() => getResult('1', stdin)).toThrowError(SyntaxError);
    });

    it('cannot read malformed data', () => {
        const stdin = () => 'foo';
        expect(() => getResult('1', stdin)).toThrowError(SyntaxError);
    });

    it('can read undefined', () => {
        expect(getResult('', () => 'UNDEFINED')).not.toBeDefined();
    });

    it('can read numbers', () => {
        expect(getResult('', () => '1')).toBe(1);
        expect(getResult('', () => '-1')).toBe(-1);
        expect(getResult('', () => '1.25')).toBe(1.25);
        expect(getResult('', () => '1e2')).toBe(100);
    });

    it('can read strings', () => {
        expect(getResult('', () => '""')).toBe('');
        expect(getResult('', () => '"foo"')).toBe('foo');
    });

    it('can read lists', () => {
        expect(getResult('', () => '[1,2]')).toEqual([1,2]);
        expect(getResult('', () => '1 2')).toEqual([1,2]);
        expect(getResult('', () => '[]')).toEqual([]);
        expect(getResult('', () => '[1]')).toEqual([1]);
        expect(getResult('', () => '[[1], 2]')).toEqual([[1], 2]);
    });
});
