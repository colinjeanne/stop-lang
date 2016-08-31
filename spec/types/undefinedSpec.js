const stopLang = require('../../umd/stop.js');

const getResult = dataString => {
    const instruction = `NOOP ${dataString}`;
    const program = new stopLang([instruction]);
    program.go();
    return program.currentResult;
};

describe('Undefined', () => {
    it('can be created from nothing', () => {
        expect(getResult('')).not.toBeDefined();
    });

    it('can explicitly created', () => {
        expect(getResult('UNDEFINED')).not.toBeDefined();
    });

    it('can be in a list', () => {
        expect(getResult('[UNDEFINED, UNDEFINED]')).
            toEqual([undefined, undefined]);
    });
});
