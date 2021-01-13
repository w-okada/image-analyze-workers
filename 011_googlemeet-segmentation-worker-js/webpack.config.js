const path = require('path');
const WorkerPlugin = require('worker-plugin');
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

const manager = {
    mode: 'development',
    entry: './src/googlemeet-segmentation-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js", ".wasm"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        webassemblyModuleFilename: "googlemeet-segmentation-jbf.wasm",        
        filename: 'googlemeet-segmentation-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (3)
        new WorkerPlugin(),
        new WasmPackPlugin({
            crateDirectory: path.join(__dirname, "crate"),
            forceMode: "production",
        })
    ],
    experiments: {
        asyncWebAssembly: true,
    }
};



const worker = {
    mode: 'development',
    entry: './src/googlemeet-segmentation-worker-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js", ".wasm"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
            // {
            //     test: /\.wasm$/,
            //     type: "webassembly/async"
            // }
        ],
    },
    output: {
        webassemblyModuleFilename: "googlemeet-segmentation-jbf.wasm",        
        filename: 'googlemeet-segmentation-worker-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (3)
        new WorkerPlugin(),
        new WasmPackPlugin({
            crateDirectory: path.join(__dirname, "crate"),
            forceMode: "production",
        })
    ],
    experiments: {
        asyncWebAssembly: true,
    }

};

module.exports = [
    manager, worker
]
