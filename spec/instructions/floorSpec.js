const stopLang = require('../../umd/stop.js');

describe('The FLOOR instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`FLOOR ${dataString}`]);
        program.go();
        return program.currentResult;
    };

    it('can floor a single number', () => {
        expect(getResult('3.2')).toBe(3);
        expect(getResult('-3.2')).toBe(-4);
    });

    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });

    it('can floor UNDEFINED', () => {
        expect(getResult('')).toEqual(NaN);
        expect(getResult('UNDEFINED')).toEqual(NaN);
    });

    it('can floor NAN', () => {
        expect(getResult('NAN')).toEqual(NaN);
    });

    it('can floor INFINITY', () => {
        expect(getResult('INFINITY')).toBe(Infinity);
        expect(getResult('-INFINITY')).toEqual(-Infinity);
    });

    it('can floor a list', () => {
        expect(getResult('1 1')).toEqual(NaN);
        expect(getResult('[1, 1]')).toEqual(NaN);
    });

    it('can floor a string', () => {
        expect(getResult('"foo"')).toEqual(NaN);
    });
});
