const path = require('path');
const WorkerPlugin = require('worker-plugin');

module.exports = {
    mode: 'development',
    entry: './src/opencv-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'opencv-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (2)
        new WorkerPlugin()
    ],
    node: {
        fs: 'empty'
      },
};
