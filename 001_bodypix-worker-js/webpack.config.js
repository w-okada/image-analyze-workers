const path = require('path');
const WorkerPlugin = require('worker-plugin');
const manager  = {
    mode: 'development',
    entry: './src/bodypix-worker.ts',
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'bodypix-worker.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　
        new WorkerPlugin()
    ]
};
const worker  = {
    mode: 'development',
    entry: './src/bodypix-worker-worker.ts',
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'bodypix-worker-worker.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　
        new WorkerPlugin()
    ]
};

module.exports = [
    manager, worker
];
