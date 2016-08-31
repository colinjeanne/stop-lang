const stopLang = require('../../umd/stop.js');

describe('The ASSTRING instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`ASSTRING ${dataString}`]);
        program.go();
        return program.currentResult;
    };

    it('cannot take double references', () => {
        expect(() => getResult('$$0')).toThrowError(SyntaxError);
    });

    it('can convert UNDEFINED', () => {
        expect(getResult('')).toBe('UNDEFINED');
        expect(getResult('UNDEFINED')).toBe('UNDEFINED');
    });

    it('can convert a number', () => {
        expect(getResult('3.2')).toBe('3.2');
        expect(getResult('-1')).toBe('-1');
    });

    it('can convert NAN', () => {
        expect(getResult('NAN')).toBe('NAN');
    });

    it('can convert INFINITY', () => {
        expect(getResult('INFINITY')).toBe('INFINITY');
        expect(getResult('-INFINITY')).toBe('-INFINITY');
    });

    it('can convert a list', () => {
        expect(getResult('1 1')).toBe('[1, 1]');
        expect(getResult('[1, 1]')).toBe('[1, 1]');
    });

    it('can convert a string', () => {
        expect(getResult('"foo"')).toBe('foo');
    });
});
