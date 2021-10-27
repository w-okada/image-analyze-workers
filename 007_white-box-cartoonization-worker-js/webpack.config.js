const path = require("path");
const webpack = require("webpack");

const manager = {
    mode: "production",
    entry: "./src/white-box-cartoonization-worker.ts",
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            os: false,
            buffer: require.resolve("buffer/"),
        },
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: "ts-loader" },
            { test: /resources\/.*\.bin/, type: "asset/inline" },
            { test: /resources\/.*\.json/, type: "asset/source" },
        ],
    },
    output: {
        filename: "white-box-cartoonization-worker.js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "umd",
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
    stats: {
        children: true,
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: "process/browser.js",
            Buffer: ["buffer", "Buffer"],
        }),
    ],
};

module.exports = [manager];
