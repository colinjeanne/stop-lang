const stopLang = require('../../umd/stop.js');

describe('The ASNUMBER instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`ASNUMBER ${dataString}`]);
        program.go();
        return program.currentResult;
    };

    it('cannot take double references', () => {
        expect(() => getResult('$$0')).toThrowError(SyntaxError);
    });

    it('can convert UNDEFINED', () => {
        expect(getResult('')).toEqual(NaN);
        expect(getResult('UNDEFINED')).toEqual(NaN);
    });

    it('can convert a number', () => {
        expect(getResult('3.2')).toBe(3.2);
        expect(getResult('-1')).toBe(-1);
    });

    it('can convert NAN', () => {
        expect(getResult('NAN')).toEqual(NaN);
        expect(getResult('NAN')).toEqual(NaN);
        expect(getResult('NAN')).toEqual(NaN);
    });

    it('can convert INFINITY', () => {
        expect(getResult('INFINITY')).toBe(Infinity);
        expect(getResult('+INFINITY')).toBe(Infinity);
        expect(getResult('-INFINITY')).toBe(-Infinity);
    });

    it('can convert a list', () => {
        expect(getResult('1 1')).toEqual(NaN);
        expect(getResult('[1, 1]')).toEqual(NaN);
    });

    it('can convert a string', () => {
        expect(getResult('"foo"')).toEqual(NaN);
        expect(getResult('"3.2"')).toBe(3.2);
        expect(getResult('"-1"')).toBe(-1);
        expect(getResult('"NAN"')).toEqual(NaN);
        expect(getResult('"INFINITY"')).toBe(Infinity);
        expect(getResult('"+INFINITY"')).toBe(Infinity);
        expect(getResult('"-INFINITY"')).toBe(-Infinity);
    });
});
