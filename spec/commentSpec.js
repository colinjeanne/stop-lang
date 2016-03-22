const stopLang = require('../umd/stop.js');

const getResult = dataString => {
    const instruction = `NOOP ${dataString}`;
    const program = new stopLang([instruction]);
    return program.execute();
};

describe('Comments', () => {
    it('come at the end of an instruction', () => {
        expect(getResult('; Foo')).not.toBeDefined();
    });
});
