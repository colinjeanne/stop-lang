const stopLang = require('../../umd/stop.js');

describe('The LESS instruction', () => {
    const getResult = dataString => {
        const program = new stopLang([`LESS ${dataString}`]);
        return program.execute();
    };
    
    it('cannot be empty', () => {
        expect(() => getResult('')).toThrowError(SyntaxError);
    });
    
    it('cannot have only one argument', () => {
        expect(() => getResult('1')).toThrowError(SyntaxError);
    });
    
    it('returns if one number is less than another', () => {
        expect(getResult('1 2')).toBe(1);
        expect(getResult('1 1')).toBe(0);
        expect(getResult('1 0')).toBe(0);
    });
    
    it('cannot take double references', () => {
        expect(() => getResult('$$0 1')).toThrowError(SyntaxError);
    });
    
    it('returns if a sequence is increasing', () => {
        expect(getResult('0 1 2')).toBe(1);
        expect(getResult('0 0 2')).toBe(0);
        expect(getResult('0 1 1')).toBe(0);
    });
    
    it('returns if the first item in a list is less than the second', () => {
        expect(getResult('[1, 2]')).toBe(1);
    });
    
    it('returns if two strings are ordered alphabetically', () => {
        expect(getResult('"a" "b"')).toBe(1);
        expect(getResult('"a" "a"')).toBe(0);
        expect(getResult('"b" "a"')).toBe(0);
    });
    
    it('returns if a set of strings are ordered alphabetically', () => {
        expect(getResult('"a" "b" "c"')).toBe(1);
        expect(getResult('"a" "a" "c"')).toBe(0);
        expect(getResult('"a" "b" "b"')).toBe(0);
    });
    
    it('returns if any type is less than any other type', () => {
        const instructions = [
            'NOOP ; Create undefined',
            'NOOP "foo" ; Create string',
            'NOOP 3 ; Create number',
            'NOOP 1 2 ; Create list',
            'LESS $0 $0 ; undefined < undefined',
            'LESS $0 $1 ; undefined < string',
            'LESS $0 $2 ; undefined < number',
            'LESS $0 $3 ; undefined < list',
            'LESS $1 $0 ; string < undefined',
            'LESS $1 $2 ; string < number',
            'LESS $1 $3 ; string < list',
            'LESS $2 $0 ; number < undefined',
            'LESS $2 $1 ; number < string',
            'LESS $2 $3 ; number < list',
            'LESS $3 $0 ; list < undefined',
            'LESS $3 $1 ; list < string',
            'LESS $3 $2 ; list < number',
            'LESS $3 $3 ; list < list',
            'NOOP $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 $16 $17'
        ];
        
        const program = new stopLang(instructions);
        
        expect(program.execute()).toEqual([
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            1,
            0,
            0
        ]);
    });
});
