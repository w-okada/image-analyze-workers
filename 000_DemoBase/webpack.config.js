/* eslint @typescript-eslint/no-var-requires: "off" */
const path = require("path");

module.exports = {
    // mode: "development",
    mode: "production",
    entry: path.resolve(__dirname, "src/index.ts"),
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
        libraryTarget: "umd",
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
    resolve: {
        modules: [path.resolve(__dirname, "node_modules")],
        extensions: [".ts", ".tsx", ".js"],
    },
    module: {
        rules: [
            {
                test: [/\.ts$/, /\.tsx$/],
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ["@babel/preset-env", "@babel/preset-react", "@babel/preset-typescript"],
                            plugins: ["@babel/plugin-transform-runtime"],
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                use: ["style-loader", { loader: "css-loader", options: { importLoaders: 1 } }, "postcss-loader"],
            },
        ],
    },
    externals: {
        react: "react",
        "react-dom": "reactDOM",
    },
};
