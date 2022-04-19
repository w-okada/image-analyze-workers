/* eslint @typescript-eslint/no-var-requires: "off" */
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    // mode: "development",
    mode: "production",
    entry: path.resolve(__dirname, "src/index.tsx"),
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
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
            {
                test: /\.html$/,
                loader: "html-loader",
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "public/index.html"),
            filename: "./index.html",
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "dist"),
        },
    },
};
