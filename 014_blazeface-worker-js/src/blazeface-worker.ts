import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/worker-base";
import * as BlazeFace from "@tensorflow-models/blazeface";
import * as tf from "@tensorflow/tfjs";
import { BackendTypes, BlazefaceConfig, BlazefaceOperationParams, BlazefacePredictionEx } from "./const";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
export { BackendTypes, BlazefaceConfig, BlazefaceOperationParams, BlazefacePredictionEx };
// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./blazeface-worker-worker.ts";

export const generateBlazefaceDefaultConfig = (): BlazefaceConfig => {
    const defaultConf: BlazefaceConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.WebGL,
        processOnLocal: false,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        maxFaces: 1,
        iouThreshold: 0.3,
        scoreThreshold: 0.75,
    };
    return defaultConf;
};

export const generateDefaultBlazefaceParams = () => {
    const defaultParams: BlazefaceOperationParams = {
        processWidth: 300,
        processHeight: 300,
        annotateBox: false,
        movingAverageWindow: 10,
    };
    return defaultParams;
};

export class LocalBF extends LocalWorker {
    model: BlazeFace.BlazeFaceModel | null = null;
    canvas: HTMLCanvasElement = (() => {
        const newCanvas = document.createElement("canvas");
        newCanvas.style.display = "none";
        return newCanvas;
    })();

    load_module = async (config: BlazefaceConfig) => {
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
    init = async (config: BlazefaceConfig) => {
        await this.load_module(config);
        await tf.ready();
        this.model = await BlazeFace.load({
            iouThreshold: config.iouThreshold,
            scoreThreshold: config.scoreThreshold,
        });
    };
    predict = async (config: BlazefaceConfig, params: BlazefaceOperationParams, targetCanvas: HTMLCanvasElement): Promise<BlazeFace.NormalizedFace[] | null> => {
        if (!this.model) {
            return null;
        }
        const prediction = await this.model!.estimateFaces(targetCanvas, undefined, undefined, params.annotateBox);
        return prediction;
    };
}

export class BlazefaceWorkerManager extends WorkerManagerBase {
    private config = generateBlazefaceDefaultConfig();
    localWorker = new LocalBF();
    init = async (config: BlazefaceConfig | null) => {
        this.config = config || generateBlazefaceDefaultConfig();
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
    predict = async (params: BlazefaceOperationParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return this.generatePredictionEx(this.config, params, prediction);
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data)) as BlazeFace.NormalizedFace[] | null;
        return this.generatePredictionEx(this.config, params, prediction);
    };

    facesMV: BlazeFace.NormalizedFace[][] = [];
    generatePredictionEx = (config: BlazefaceConfig, params: BlazefaceOperationParams, prediction: BlazeFace.NormalizedFace[] | null): BlazefacePredictionEx => {
        const predictionEx: BlazefacePredictionEx = {
            rowPrediction: prediction,
        };
        if (!prediction) {
            return predictionEx;
        }

        if (params.movingAverageWindow > 0) {
            /// (1)蓄積データ 更新
            while (this.facesMV.length > params.movingAverageWindow) {
                this.facesMV.shift();
            }

            if (prediction!.length > 0) {
                this.facesMV.push(prediction!);
            }

            /// (2) キーポイント移動平均算出
            /// (2-1) ウィンドウ内の一人目のランドマークを抽出
            const keypointsEach = this.facesMV.map((pred) => {
                return pred[0];
            });
            /// (2-2) 足し合わせ
            const summedKeypoints = keypointsEach.reduce(
                (prev, cur) => {
                    (prev.topLeft as [number, number])[0] += (cur.topLeft as [number, number])[0];
                    (prev.topLeft as [number, number])[1] += (cur.topLeft as [number, number])[1];
                    (prev.bottomRight as [number, number])[0] += (cur.bottomRight as [number, number])[0];
                    (prev.bottomRight as [number, number])[1] += (cur.bottomRight as [number, number])[1];
                    if (cur.landmarks) {
                        const landmarks = cur.landmarks as number[][];
                        landmarks.forEach((landmark, index) => {
                            (prev.landmarks as number[][])[index][0] += landmark[0];
                            (prev.landmarks as number[][])[index][1] += landmark[1];
                        });
                    }
                    return prev;
                },
                {
                    topLeft: [0, 0],
                    bottomRight: [0, 0],
                    landmarks: [
                        [0, 0], // left eye
                        [0, 0], // right eye
                        [0, 0], // nose tip
                        [0, 0], // mouth
                        [0, 0], // left tragion
                        [0, 0], // right tragion
                    ],
                } as {
                    topLeft: [number, number];
                    bottomRight: [number, number];
                    landmarks: number[][];
                }
            );
            /// (2-3) 平均化
            (summedKeypoints.topLeft as [number, number])[0] /= this.facesMV.length;
            (summedKeypoints.topLeft as [number, number])[1] /= this.facesMV.length;
            (summedKeypoints.bottomRight as [number, number])[0] /= this.facesMV.length;
            (summedKeypoints.bottomRight as [number, number])[1] /= this.facesMV.length;
            (summedKeypoints.landmarks as number[][]).forEach((landmarks) => {
                landmarks[0] /= this.facesMV.length;
                landmarks[1] /= this.facesMV.length;
            });
            predictionEx.singlePersonMovingAverage = summedKeypoints;
        }
        return predictionEx;
    };

    fitCroppedArea = (prediction: BlazefacePredictionEx, orgWidth: number, orgHeight: number, processedWidth: number, processedHeight: number, outputWidth: number, outputHeight: number, extendRatioTop: number, extendRatioBottom: number, extendRatioLeft: number, extendRatioRight: number) => {
        const scaleX = orgWidth / processedWidth;
        const scaleY = orgHeight / processedHeight;
        const scaledXMin = prediction.singlePersonMovingAverage!.topLeft[0] * scaleX;
        const scaledXMax = prediction.singlePersonMovingAverage!.bottomRight[0] * scaleX;
        const scaledWidth = scaledXMax - scaledXMin;
        const scaledYMin = prediction.singlePersonMovingAverage!.topLeft[1] * scaleY;
        const scaledYMax = prediction.singlePersonMovingAverage!.bottomRight[1] * scaleY;
        const scaledHeight = scaledYMax - scaledYMin;
        const scaledCenterX = (scaledXMax + scaledXMin) / 2;
        const scaledCenterY = (scaledYMax + scaledYMin) / 2;
        const scaledRadiusX = scaledXMax - scaledCenterX;
        const scaledRadiusY = scaledYMax - scaledCenterY;

        let extendedXmin = scaledCenterX - scaledRadiusX * (1 + extendRatioLeft);
        extendedXmin = extendedXmin < 0 ? 0 : extendedXmin;
        let extendedXmax = scaledCenterX + scaledRadiusX * (1 + extendRatioRight);
        extendedXmax = extendedXmax > orgWidth ? orgWidth : extendedXmax;
        let extendedYmin = scaledCenterY - scaledRadiusY * (1 + extendRatioTop);
        extendedYmin = extendedYmin < 0 ? 0 : extendedYmin;
        let extendedYmax = scaledCenterY + scaledRadiusY * (1 + extendRatioBottom);
        extendedYmax = extendedYmax > orgHeight ? orgHeight : extendedYmax;

        const extendedWidth = extendedXmax - extendedXmin;
        const extendedHeight = extendedYmax - extendedYmin;
        const extendedCenterX = (extendedXmax + extendedXmin) / 2;
        const extendedCenterY = (extendedYmax + extendedYmin) / 2;

        const outputAspect = outputHeight / outputWidth;

        let idealWidth;
        let idealHeight;
        if (extendedWidth * outputAspect > extendedHeight) {
            //高さが足りない
            idealWidth = extendedWidth;
            idealHeight = extendedWidth * outputAspect;
        } else {
            //幅が足りない
            idealWidth = extendedHeight / outputAspect;
            idealHeight = extendedHeight;
        }

        let xmin;
        if (extendedCenterX - idealWidth / 2 < 0) {
            xmin = 0;
        } else if (extendedCenterX + idealWidth / 2 > orgWidth) {
            xmin = orgWidth - idealWidth;
        } else {
            xmin = extendedCenterX - idealWidth / 2;
        }

        let ymin;
        if (extendedCenterY - idealHeight / 2 < 0) {
            ymin = 0;
        } else if (extendedCenterY + idealHeight / 2 > orgHeight) {
            ymin = orgHeight - idealHeight;
        } else {
            ymin = extendedCenterY - idealHeight / 2;
        }
        return { xmin: xmin, ymin: ymin, width: idealWidth, height: idealHeight };
    };
}
