import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

export default {
    dest: 'umd/stop.js',
    entry: 'es6/exec.js',
    format: 'umd',
    moduleName: 'stopLang',
    plugins: [
        babel(),
        //uglify()
    ]
};
