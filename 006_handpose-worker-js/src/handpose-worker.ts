import { HandPoseConfig, HandPoseOperatipnParams, HandPoseFunctionType, BackendTypes } from "./const";
import * as handpose from "@tensorflow-models/handpose";
import * as tf from "@tensorflow/tfjs";
import { setWasmPath, setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

export { HandPoseConfig, HandPoseOperatipnParams };
export { AnnotatedPrediction } from "@tensorflow-models/handpose";
export { FingerLookupIndices, BackendTypes } from "./const";
// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./handpose-worker-worker.ts";
import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";

export const generateHandPoseDefaultConfig = (): HandPoseConfig => {
    const defaultConf: HandPoseConfig = {
        browserType: getBrowserType(),
        model: {
            maxContinuousChecks: Infinity,
            detectionConfidence: 0.8,
            iouThreshold: 0.3,
            scoreThreshold: 0.75,
        },
        backendType: BackendTypes.WebGL,
        processOnLocal: false,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
    };
    // WASMバージョンがあまり早くないので、Safariはローカルで実施をデフォルトにする。
    if (defaultConf.browserType == BrowserTypes.SAFARI) {
        defaultConf.processOnLocal = true;
    }

    return defaultConf;
};

export const generateDefaultHandPoseParams = () => {
    const defaultParams: HandPoseOperatipnParams = {
        type: HandPoseFunctionType.EstimateHands,
        estimateHands: {
            flipHorizontal: false,
        },
        processWidth: 300,
        processHeight: 300,
    };
    return defaultParams;
};

export class LocalHP extends LocalWorker {
    model: handpose.HandPose | null = null;
    canvas: HTMLCanvasElement = (() => {
        const newCanvas = document.createElement("canvas");
        newCanvas.style.display = "none";
        //document!.getRootNode()!.lastChild!.appendChild(newCanvas)
        return newCanvas;
    })();

    load_module = async (config: HandPoseConfig) => {
        if (config.backendType === BackendTypes.wasm) {
            const dirname = config.pageUrl.substr(0, config.pageUrl.lastIndexOf("/"));
            const wasmPaths: { [key: string]: string } = {};
            Object.keys(config.wasmPaths).forEach((key) => {
                wasmPaths[key] = `${dirname}${config.wasmPaths[key]}`;
            });
            setWasmPaths(wasmPaths);
            console.log("use wasm backend", wasmPaths);
            await tf.setBackend("wasm");
        } else if (config.backendType === BackendTypes.cpu) {
            await tf.setBackend("cpu");
        } else {
            console.log("use webgl backend");
            await tf.setBackend("webgl");
        }
    };

    init = async (config: HandPoseConfig) => {
        await this.load_module(config);
        await tf.ready();
        this.model = await handpose.load(config.model);
    };

    predict = async (config: HandPoseConfig, params: HandPoseOperatipnParams, targetCanvas: HTMLCanvasElement): Promise<handpose.AnnotatedPrediction[]> => {
        // console.log("Loacal BACKEND:", tf.getBackend());

        const processWidth = params.processWidth <= 0 || params.processHeight <= 0 ? targetCanvas.width : params.processWidth;
        const processHeight = params.processWidth <= 0 || params.processHeight <= 0 ? targetCanvas.height : params.processHeight;

        this.canvas.width = processWidth;
        this.canvas.height = processHeight;
        const ctx = this.canvas.getContext("2d")!;
        ctx.drawImage(targetCanvas, 0, 0, processWidth, processHeight);
        const newImg = ctx.getImageData(0, 0, processWidth, processHeight);

        const prediction = await this.model!.estimateHands(newImg);
        return prediction;
    };
}

export class HandPoseWorkerManager extends WorkerManagerBase {
    private config = generateHandPoseDefaultConfig();
    localWorker = new LocalHP();

    init = async (config: HandPoseConfig | null) => {
        this.config = config || generateHandPoseDefaultConfig();
        await this.initCommon(
            {
                useWorkerForSafari: false,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            config
        );
        return;
    };

    predict = async (params: HandPoseOperatipnParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction;
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(this.config, currentParams, imageData.data)) as handpose.AnnotatedPrediction[];
        return prediction;
    };
}

const fingerLookupIndices: { [key: string]: number[] } = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20],
};

export const drawHandSkelton = (srcCanvas: HTMLCanvasElement, prediction: any, params: HandPoseOperatipnParams) => {
    const canvas = document.createElement("canvas");
    canvas.width = srcCanvas.width;
    canvas.height = srcCanvas.height;
    const ctx = canvas.getContext("2d")!;

    const scaleX = srcCanvas.width / params.processWidth;
    const scaleY = srcCanvas.height / params.processHeight;
    prediction.forEach((x: any) => {
        const landmarks = x.landmarks as number[][];
        landmarks.forEach((landmark) => {
            const x = landmark[0] * scaleX;
            const y = landmark[1] * scaleY;
            ctx.fillRect(x, y, 5, 5);
        });

        const fingers = Object.keys(fingerLookupIndices);
        fingers.forEach((x) => {
            const points = fingerLookupIndices[x].map((idx) => landmarks[idx]);

            ctx.beginPath();
            ctx.moveTo(points[0][0] * scaleX, points[0][1] * scaleY);
            for (let i = 1; i < points.length; i++) {
                const point = points[i];
                ctx.lineTo(point[0] * scaleX, point[1] * scaleY);
            }
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
        });
    });

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.remove();
    return image;
};
