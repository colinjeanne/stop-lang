const stopLang = require('../../umd/stop.js');

describe('The NOOP instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`NOOP ${dataString}`]);
        return program.execute();
    };

    it('can take zero arguments', () => {
        expect(getResult('')).not.toBeDefined();
    });

    it('can have multiple arguments', () => {
        expect(getResult('3 "foo" [] 3')).
            toEqual([3, 'foo', [], 3]);
    });
});
