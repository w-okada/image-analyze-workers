const path = require("path");
const webpack = require("webpack");

const tflite_target = process.env.TFLITE || "";
console.log("tflite_target::", tflite_target);

const manager = {
    // mode: "development",
    mode: "production",
    entry: "./src/hand-pose-detection-worker.ts",
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
            {
                test: /\.ts$/,
                use: [
                    { loader: "ts-loader" },
                    {
                        loader: "ifdef-loader",
                        options: {
                            TFLITE_TARGET: tflite_target,
                        },
                    },
                ],
            },
            { test: /resources\/.*\.bin/, type: "asset/inline" },
            { test: /resources\/.*\.json/, type: "asset/source" },
            { test: /\.wasm$/, type: "asset/inline" },
        ],
    },
    output: {
        filename: `hand-pose-detection-worker${tflite_target}.js`,
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
