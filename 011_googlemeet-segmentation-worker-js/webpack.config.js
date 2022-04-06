const path = require("path");
const webpack = require("webpack");

const manager = {
    mode: "development",
    // mode: "production",
    entry: "./src/googlemeet-segmentation-worker.ts",
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            crypto: false,
            path: false,
            fs: false,
            buffer: require.resolve("buffer/"),
        },
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: "ts-loader" },
            { test: /resources\/.*\.bin/, type: "asset/inline" },
            { test: /resources\/.*\.json/, type: "asset/source" },
            // { test: /\.wasm$/, loader: "url-loader" },
            { test: /\.wasm$/, type: "asset/inline" },
        ],
    },
    output: {
        filename: "googlemeet-segmentation-worker.js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "umd",
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
    stats: {
        children: true,
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
        }),
    ],
};

module.exports = [manager];
