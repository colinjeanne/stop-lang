const stopLang = require('../../umd/stop.js');

describe('The ERROR instruction', () => {
    'use strict';

    const getResult = (dataString, stderr) => {
        const program = new stopLang(
            [`ERROR ${dataString}`],
            () => {},
            () => {},
            stderr);
        return program.execute();
    };

    it('can be empty', () => {
        let output = undefined;
        const stderr = v => output = v;

        expect(getResult('', stderr)).not.toBeDefined();
        expect(output).toBe('');
    });

    it('can write numbers', () => {
        let output = undefined;
        const stderr = v => output = v;

        expect(getResult('1', stderr)).not.toBeDefined();
        expect(output).toBe('1');

        expect(getResult('-1', stderr)).not.toBeDefined();
        expect(output).toBe('-1');

        expect(getResult('1.25', stderr)).not.toBeDefined();
        expect(output).toBe('1.25');

        expect(getResult('1e2', stderr)).not.toBeDefined();
        expect(output).toBe('100');
    });

    it('can write strings', () => {
        let output = undefined;
        const stderr = v => output = v;

        expect(getResult('""', stderr)).not.toBeDefined();
        expect(output).toBe('""');

        expect(getResult('"foo"', stderr)).not.toBeDefined();
        expect(output).toBe('"foo"');
    });

    it('can write lists', () => {
        let output = undefined;
        const stderr = v => output = v;

        expect(getResult('[1,2]', stderr)).not.toBeDefined();
        expect(output).toEqual('[1, 2]');

        expect(getResult('1 2', stderr)).not.toBeDefined();
        expect(output).toEqual('[1, 2]');

        expect(getResult('[]', stderr)).not.toBeDefined();
        expect(output).toEqual('[]');

        expect(getResult('[1]', stderr)).not.toBeDefined();
        expect(output).toEqual('[1]');

        expect(getResult('[[1], 2]', stderr)).not.toBeDefined();
        expect(output).toEqual('[[1], 2]');
    });

    it('can write undefined', () => {
        let output = undefined;
        const stderr = v => output = v;

        expect(getResult('UNDEFINED', stderr)).not.toBeDefined();
        expect(output).toEqual('');
    });
});
