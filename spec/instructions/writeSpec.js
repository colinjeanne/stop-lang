const stopLang = require('../../umd/stop.js');

describe('The WRITE instruction', () => {
    'use strict';

    const getResult = (dataString, stdout) => {
        const program = new stopLang(
            [`WRITE ${dataString}`],
            {
                stdout
            });
        program.go();
        return program.currentResult;
    };

    it('can be empty', () => {
        let output = undefined;
        const stdout = v => output = v;

        expect(getResult('', stdout)).not.toBeDefined();
        expect(output).toBe('');
    });

    it('can write numbers', () => {
        let output = undefined;
        const stdout = v => output = v;

        expect(getResult('1', stdout)).not.toBeDefined();
        expect(output).toBe('1');

        expect(getResult('-1', stdout)).not.toBeDefined();
        expect(output).toBe('-1');

        expect(getResult('1.25', stdout)).not.toBeDefined();
        expect(output).toBe('1.25');

        expect(getResult('1e2', stdout)).not.toBeDefined();
        expect(output).toBe('100');
    });

    it('can write strings', () => {
        let output = undefined;
        const stdout = v => output = v;

        expect(getResult('""', stdout)).not.toBeDefined();
        expect(output).toBe('""');

        expect(getResult('"foo"', stdout)).not.toBeDefined();
        expect(output).toBe('"foo"');
    });

    it('can write lists', () => {
        let output = undefined;
        const stdout = v => output = v;

        expect(getResult('[1,2]', stdout)).not.toBeDefined();
        expect(output).toEqual('[1, 2]');

        expect(getResult('1 2', stdout)).not.toBeDefined();
        expect(output).toEqual('[1, 2]');

        expect(getResult('[]', stdout)).not.toBeDefined();
        expect(output).toEqual('[]');

        expect(getResult('[1]', stdout)).not.toBeDefined();
        expect(output).toEqual('[1]');

        expect(getResult('[[1], 2]', stdout)).not.toBeDefined();
        expect(output).toEqual('[[1], 2]');
    });

    it('can write undefined', () => {
        let output = undefined;
        const stdout = v => output = v;

        expect(getResult('UNDEFINED', stdout)).not.toBeDefined();
        expect(output).toEqual('');
    });
});
