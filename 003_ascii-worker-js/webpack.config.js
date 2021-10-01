const path = require('path');

const manager  = {
    mode: 'production',
    entry: './src/asciiart-worker.ts',
    resolve: {
        extensions: [".ts", ".js"],
        fallback: { 
            "os": false 
        }
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader'},
        ],
    },
    output: {
        filename: 'asciiart-worker.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
};

module.exports = [
    manager
];
