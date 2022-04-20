const path = require("path");

const manager = {
    mode: "development",
    // mode: "production",
    entry: "./src/face-landmark-detection-worker.ts",
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            os: false,
        },
    },
    module: {
        rules: [{ test: /\.ts$/, loader: "ts-loader" }],
    },
    output: {
        filename: "face-landmark-detection-worker.js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "umd",
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
};

module.exports = [manager];
