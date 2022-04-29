const path = require("path");
const webpack = require("webpack");

const build_type = process.env.BUILD_TYPE || "";
console.log("build_type::", build_type);

const manager = {
    // mode: "development",
    mode: "production",
    entry: "./src/blaze-pose-worker.ts",
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
                            BUILD_TYPE: build_type,
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
        filename: `blaze-pose-worker${build_type}.js`,
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
