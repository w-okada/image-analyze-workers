const path = require('path');
const WorkerPlugin = require('worker-plugin');

const manager = {
    mode: 'production',
    entry: './src/bisenetv2-celebamask-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
        fallback: { "os": false }

    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'bisenetv2-celebamask-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (2)
        new WorkerPlugin()
    ]
};

const worker = {
    mode: 'production',
    entry: './src/bisenetv2-celebamask-worker-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
        fallback: { "os": false }
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'bisenetv2-celebamask-worker-worker.js', // <-- (2)
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

