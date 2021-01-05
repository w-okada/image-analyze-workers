
# Setting up

```

### create work space
$ mkdir 005_posenet-worker-js
$ cd 005_posenet-worker-js


### npm環境構築
$ npm init -y
$ emacs package.json
<snip>
    "name": "@dannadori/posenet-worker-js", // <-- !! scoped !!

    "main": "dist/posenet-worker.js",
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "webpack": "npx webpack --config webpack.config.js",
        "clean": "rimraf dist/*",
        "build": "cp ../common/*.ts ./src; npm-run-all clean webpack"
    },
    "repository": {
        "type": "git",
        "url": "git+https://github.com/w-okada/image-analyze-workers.git"
    },
    "keywords": [
        "webworker",
        "image processing",
        "tensorflowjs"
    ],
    "author": "wataru.okada@flect.co.jp",
    "license": "MIT",
    "bugs": {
        "url": "https://github.com/w-okada/image-analyze-workers/issues"
    },
    "homepage": "https://github.com/w-okada/image-analyze-workers#readme",

<snip>

$ npm install --save-dev webpack webpack-cli
$ npm install --save-dev typescript ts-loader
$ npm install -D tsconfig-paths
$ npm install -D rimraf npm-run-all

### tsconfig設定
$ npx tsc --init
$cat tsconfig.json
<snip>
"lib": ["es2015" ,"dom"], 
"declaration": true, 
"sourceMap": true, 
"outDir": "./dist",

### webpack設定
$ npm install -D worker-plugin
cat > webpack.config.js
const path = require('path');
const WorkerPlugin = require('worker-plugin');

const manager = {
    mode: 'development',
    entry: './src/modnet-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'modnet-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (3)
        new WorkerPlugin()
    ]
};



const worker = {
    mode: 'development',
    entry: './src/modnet-worker-worker.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'modnet-worker-worker.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [　　　　　　　　　　　　　　　　 // <--- (3)
        new WorkerPlugin()
    ]
};

module.exports = [
    manager, worker
]
```





## ソースコード開発

```
$ npm install @tensorflow-models/posenet
$ npm install await-semaphore
$ npm install @tensorflow/tfjs
$ npm install @tensorflow/tfjs-backend-wasm
$ cat > .gitignore 
*~
*#
node_modules
dist
$ cat > .npmignore 
*~
*#
node_modules
demo
src

$ mkdir src
$ touch ./src/posenet-worker.ts

$ git add *
$ git commit -m "hoge"
$ git push

$ npm version patch
$ npm publish --access=public

```

## デモ開発

```
$ create-react-app 005demo_posenet-worker-js-demo/  --typescript
$ cd 005demo_posenet-worker-js-demo/
$ cat package.json
  "homepage": "./",
$ npm install
$ npm install semantic-ui-react;npm install semantic-ui-css
$ npm install @dannadori/posenet-worker-js
# from other package, copy and edit (1),(5)
#  (1)mod_build.sh, (2)app.py, (3)server.crt, (4))server.key, (5)sync.sh (6) DemoBase.tsx


# edit src

```