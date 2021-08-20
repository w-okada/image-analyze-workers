const path = require('path');
const WorkerPlugin = require('worker-plugin');

const manager = {
    mode: 'production',
    entry: './src/super-resolution-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            crypto: false,
            path: false,
            fs: false,
        }
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'super-resolution-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (3)
        new WorkerPlugin()
    ]
};



const worker = {
    mode: 'production',
    entry: './src/super-resolution-worker-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            crypto: false,
            path: false,
            fs: false,
        }
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'super-resolution-worker-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (3)
        new WorkerPlugin()
    ]
};

module.exports = [
    manager, worker
]

