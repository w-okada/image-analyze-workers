const path = require('path');
const WorkerPlugin = require('worker-plugin');

const manager = {
    mode: 'production',
    entry: './src/googlemeet-segmentation-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            crypto: false,
            path: false,
            fs: false,
            // os:false,
            "os": require.resolve("os-browserify/browser"),
        }
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'googlemeet-segmentation-worker.js', // <-- (2)
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
    entry: './src/googlemeet-segmentation-worker-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            crypto: false,
            path: false,
            fs: false,
            // os:false,
            "os": require.resolve("os-browserify/browser") ,

        }
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'googlemeet-segmentation-worker-worker.js', // <-- (2)
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