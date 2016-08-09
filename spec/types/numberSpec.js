const stopLang = require('../../umd/stop.js');

const getResult = dataString => {
    const instruction = `NOOP ${dataString}`;
    const program = new stopLang([instruction]);
    program.go();
    return program.currentResult;
};

describe('Numbers', () => {
    it('can be an integer', () => {
        expect(getResult('3')).toBe(3);
    });

    it('can have multiple digits', () => {
        expect(getResult('13')).toBe(13);
    });

    it('can have a leading sign', () => {
        expect(getResult('+3')).toBe(3);
        expect(getResult('-3')).toBe(-3);
    });

    it('can be a decimal', () => {
        expect(getResult('.2')).toBeCloseTo(0.2, 1);
    });

    it('can have multiple decimal digits', () => {
        expect(getResult('.25')).toBeCloseTo(0.25, 2);
    });

    it('can integer and decimal digits', () => {
        expect(getResult('30.25')).toBeCloseTo(30.25, 2);
    });

    it('can have an integral exponential', () => {
        expect(getResult('3e2')).toBe(300);
        expect(getResult('3E2')).toBe(300);
    });

    it('large numbers equal infinity', () => {
        expect(getResult('3e100000000')).toBe(Infinity);
    });

    it('can read infinity', () => {
        expect(getResult('INFINITY')).toBe(Infinity);
        expect(getResult('+INFINITY')).toBe(Infinity);
        expect(getResult('-INFINITY')).toBe(-Infinity);
    });

    it('can read NAN', () => {
        expect(getResult('NAN')).toEqual(NaN);
    });
});
