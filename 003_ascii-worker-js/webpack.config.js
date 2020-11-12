const path = require('path');
const WorkerPlugin = require('worker-plugin');
// module.exports = {
//     mode: 'development',
//     entry: './src/asciiart-worker.ts', 
//     resolve: {
//         extensions: [".ts", ".js"],
//     },
//     module: {
//         rules: [
//             { test: /\.ts$/, loader: 'ts-loader' },
//         ],
//     },
//     output: {
//         filename: 'asciiart-worker.js', // <-- (2)
//         path: path.resolve(__dirname, 'dist'),
//         libraryTarget: 'umd',
//         globalObject: 'typeof self !== \'undefined\' ? self : this'
//     },
//     plugins: [　　　　　　　　　　　　　　　　 // <--- (2)
//         new WorkerPlugin()
//     ]
// };

const main = {
    mode: 'development',
    entry: './src/asciiart-worker.ts', 
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'asciiart-worker.js', // <-- (2)
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
    entry: './src/asciiart-worker-worker.ts', 
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'asciiart-worker-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (2)
        new WorkerPlugin()
    ]
};

module.exports = [
    main, worker
];