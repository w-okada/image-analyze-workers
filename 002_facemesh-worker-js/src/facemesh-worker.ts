import { BackendTypes, FacemeshConfig, FacemeshFunctionTypes, FacemeshOperatipnParams, TRIANGULATION } from "./const";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs";
import { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import { Coords3D } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh/util";

export { FacemeshConfig, FacemeshOperatipnParams, NUM_KEYPOINTS, TRIANGULATION, BackendTypes } from "./const";
export { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
export { Coords3D } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh/util";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./facemesh-worker-worker.ts";
import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

export const generateFacemeshDefaultConfig = (): FacemeshConfig => {
    const defaultConf: FacemeshConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.WebGL,
        modelReloadInterval: 1024 * 60,
        model: {
            maxContinuousChecks: 5,
            detectionConfidence: 0.9,
            maxFaces: 10,
            iouThreshold: 0.3,
            scoreThreshold: 0.75,
        },
        processOnLocal: false,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
    };
    return defaultConf;
};

export const generateDefaultFacemeshParams = () => {
    const defaultParams: FacemeshOperatipnParams = {
        type: FacemeshFunctionTypes.DetectMesh,
        processWidth: 300,
        processHeight: 300,
        predictIrises: false,
    };
    return defaultParams;
};

export class LocalFM extends LocalWorker {
    model: faceLandmarksDetection.FaceLandmarksDetector | null = null;

    load_module = async (config: FacemeshConfig) => {
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

    init = async (config: FacemeshConfig) => {
        await this.load_module(config);
        await tf.ready();
        this.model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, config);
        console.log("facemesh loaded locally", config);
    };

    predict = async (config: FacemeshConfig, params: FacemeshOperatipnParams, targetCanvas: HTMLCanvasElement): Promise<AnnotatedPrediction[]> => {
        console.log("Loacal BACKEND:", tf.getBackend());
        const ctx = targetCanvas.getContext("2d")!;
        const newImg = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);

        await tf.ready();
        let tensor = tf.browser.fromPixels(newImg);
        const prediction = await this.model!.estimateFaces({
            input: tensor,
            predictIrises: params.predictIrises,
        });
        tensor.dispose();

        return prediction;
    };
}

export class FacemeshWorkerManager extends WorkerManagerBase {
    private config = generateFacemeshDefaultConfig();
    localWorker = new LocalFM();

    init = async (config: FacemeshConfig | null) => {
        this.config = config || generateFacemeshDefaultConfig();
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

    predict = async (params: FacemeshOperatipnParams, targetCanvas: HTMLCanvasElement) => {
        if (!this.worker) {
            const resizedCanvas = this.generateTargetCanvas(targetCanvas, params.processWidth, params.processHeight);
            const prediction = await this.localWorker.predict(this.config, params, resizedCanvas);
            return prediction;
        }
        const imageBitmap = this.generateImageBitmap(targetCanvas, params.processWidth, params.processHeight);
        const prediction = (await this.sendToWorker(this.config, params, imageBitmap)) as AnnotatedPrediction[];
        return prediction;
    };
}

//// Utility for Demo
export const drawFacemeshImage = (srcCanvas: HTMLCanvasElement, prediction: AnnotatedPrediction[], params: FacemeshOperatipnParams) => {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = srcCanvas.width;
    tmpCanvas.height = srcCanvas.height;
    const ctx = tmpCanvas.getContext("2d")!;
    // //// Drawing mesh
    prediction!.forEach((x) => {
        const keypoints = x.scaledMesh as Coords3D;
        for (let i = 0; i < TRIANGULATION.length / 3; i++) {
            const points = [TRIANGULATION[i * 3], TRIANGULATION[i * 3 + 1], TRIANGULATION[i * 3 + 2]].map((index) => [(keypoints[index][0] / params.processWidth) * srcCanvas.width, (keypoints[index][1] / params.processHeight) * srcCanvas.height]);
            const region = new Path2D();
            region.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                const point = points[i];
                region.lineTo(point[0], point[1]);
            }
            region.closePath();
            ctx.stroke(region);
        }
    });
    const imageData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
    tmpCanvas.remove();
    return imageData;
};
