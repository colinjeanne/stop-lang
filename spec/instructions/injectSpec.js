const stopLang = require('../../umd/stop.js');

describe('The INJECT instruction', () => {
    const getResult = instructions => {
        const program = new stopLang(instructions);
        return program.execute();
    };

    it('cannot be empty', () => {
        const instructions = [
            'INJECT'
        ];

        expect(() => getResult(instructions)).toThrowError(SyntaxError);
    });

    it('can take empty instructions', () => {
        const instructions = [
            'INJECT "NOOP"',
        ];

        expect(getResult(instructions)).not.toBeDefined();
    });

    it('can take non-empty instructions', () => {
        const instructions = [
            'INJECT "NOOP" 1',
        ];

        expect(getResult(instructions)).toBe(1);
    });

    it('can take scalar types', () => {
        const instructions = [
            'INJECT "NOOP" 1 "foo" [3]',
        ];

        expect(getResult(instructions)).toEqual([1, 'foo', [3]]);
    });

    it('can take references', () => {
        const instructions = [
            'NOOP "foo"',
            'INJECT "NOOP" $0 "bar"',
        ];

        expect(getResult(instructions)).toEqual(['foo', 'bar']);
    });

    it('can take double references', () => {
        const instructions = [
            'NOOP "foo"',
            'INJECT "NOOP" $$0',
        ];

        expect(getResult(instructions)).toEqual('foo');
    });
});
