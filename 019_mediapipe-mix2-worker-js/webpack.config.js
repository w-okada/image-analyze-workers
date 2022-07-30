const path = require("path");
const webpack = require("webpack");

const manager = {
    // mode: "development",
    mode: "production",
    entry: "./src/index.ts",
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
                use: [{ loader: "ts-loader" }],
            },
            // { test: /\.bin$/, type: "asset/resource" },
            // { test: /\.wasm$/, type: "asset/resource" },
        ],
    },
    externals: {
        "./resources/wasm/tflite-simd.wasm": "commonjs ./resources/wasm/tflite-simd.wasm",

        "./resources/tflite/detector/palm_detection_lite.bin": "commonjs ./resources/tflite/detector/palm_detection_lite.bin",
        "./resources/tflite/landmark/hand_landmark_lite.bin": "commonjs ./resources/tflite/landmark/hand_landmark_lite.bin",

        "./resources/tflite/detector/face_detection_short_range.bin": "commonjs ./resources/tflite/detector/face_detection_short_range.bin",
        "./resources/tflite/landmark/model_float16_quant.bin": "commonjs ./resources/tflite/landmark/model_float16_quant.bin",

        "./resources/tflite/detector/pose_detection.bin": "commonjs ./resources/tflite/detector/pose_detection.bin",
        "./resources/tflite/landmark/pose_landmark_lite.bin": "commonjs ./resources/tflite/landmark/pose_landmark_lite.bin",
        "": "commonjs ",
    },
    output: {
        filename: `index.js`,
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
