const path = require('path');
const WorkerPlugin = require('worker-plugin');

const manager = {
    mode: 'development',
    entry: './src/white-box-cartoonization-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'white-box-cartoonization-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (2)
        new WorkerPlugin()
    ]
};
const worker = {
    mode: 'development',
    entry: './src/white-box-cartoonization-worker-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'white-box-cartoonization-worker-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (2)
        new WorkerPlugin()
    ]
};

module.exports = [
    manager, worker
]