import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection"
import * as tf from "@tensorflow/tfjs";
import * as faceMesh from "@mediapipe/face_mesh";
import { BackendTypes, FaceLandmarkDetectionConfig, FaceLandmarkDetectionOperationParams, FaceMeshPredictionEx, FacemeshPredictionMediapipe, ModelTypes } from "./const";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { Face, Keypoint } from "@tensorflow-models/face-landmarks-detection";
export { FaceLandmarkDetectionConfig, FaceLandmarkDetectionOperationParams, NUM_KEYPOINTS, TRIANGULATION, BackendTypes, ModelTypes, FaceMeshPredictionEx } from "./const";
export { Face, Keypoint, BoundingBox }
// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./face-landmark-detection-worker-worker.ts";
import { BoundingBox } from "@tensorflow-models/face-landmarks-detection/dist/shared/calculators/interfaces/shape_interfaces";


export const generateFaceLandmarkDetectionDefaultConfig = (): FaceLandmarkDetectionConfig => {
    const defaultConf: FaceLandmarkDetectionConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.WebGL,
        model: {
            // maxContinuousChecks: 5,
            detectionConfidence: 0.9,
            maxFaces: 10,
            // iouThreshold: 0.3,
            // scoreThreshold: 0.75,
            refineLandmarks: false,
        },
        processOnLocal: true,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        modelType: ModelTypes.mediapipe,
    };
    return defaultConf;
};

export const generateDefaultFaceLandmarkDetectionParams = () => {
    const defaultParams: FaceLandmarkDetectionOperationParams = {
        processWidth: 300,
        processHeight: 300,
        movingAverageWindow: 10,
        // trackingAreaMarginRatioX: 0.3,
        // trackingAreaMarginRatioTop: 0.8,
        // trackingAreaMarginRatioBottom: 0.2,
    };
    return defaultParams;
};

export class LocalFL extends LocalWorker {
    model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
    load_module = async (config: FaceLandmarkDetectionConfig) => {
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

    init = async (config: FaceLandmarkDetectionConfig) => {
        await this.load_module(config);
        await tf.ready();

        try {
            this.model?.dispose();
        } catch (error) {
            console.log("this error is ignored", error)
        }
        this.model = null;

        if (config.modelType === ModelTypes.mediapipe) {
            this.model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
                runtime: "mediapipe",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${faceMesh.VERSION}`,
            });
        } else if (config.modelType === ModelTypes.tfjs) {
            this.model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
                runtime: "tfjs",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
            });
        } else {
        }

        console.log("facemesh loaded locally", config);
    };

    predict = async (config: FaceLandmarkDetectionConfig, params: FaceLandmarkDetectionOperationParams, targetCanvas: HTMLCanvasElement): Promise<Face[] | null> => {
        const ctx = targetCanvas.getContext("2d")!;
        const newImg = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        if (config.modelType === ModelTypes.mediapipe || config.modelType === ModelTypes.tfjs) {
            if (!this.model) {
                return null
            }
            const prediction = await this.model.estimateFaces(newImg, { flipHorizontal: false });
            return prediction;
        } else if (config.modelType === ModelTypes.tflite) {
            return null;
        } else {
            return null;
        }
    };
}

export class FaceLandmarkDetectionWorkerManager extends WorkerManagerBase {
    private config = generateFaceLandmarkDetectionDefaultConfig();
    localWorker = new LocalFL();

    init = async (config: FaceLandmarkDetectionConfig | null) => {
        this.config = config || generateFaceLandmarkDetectionDefaultConfig();
        await this.initCommon(
            {
                useWorkerForSafari: true,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            config
        );
        return;
    };

    predict = async (params: FaceLandmarkDetectionOperationParams, targetCanvas: HTMLCanvasElement | HTMLVideoElement): Promise<FaceMeshPredictionEx> => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return this.generatePredictionEx(this.config, params, prediction);
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(this.config, currentParams, imageData.data)) as Face[];
        return this.generatePredictionEx(this.config, params, prediction);
    };

    facesMV: Face[][] = [];

    generatePredictionEx = (config: FaceLandmarkDetectionConfig, params: FaceLandmarkDetectionOperationParams, prediction: Face[] | null): FaceMeshPredictionEx => {
        const faces = prediction
        const predictionEx: FacemeshPredictionMediapipe = {
            modelType: config.modelType,
            rowPrediction: faces,
        };
        if (params.movingAverageWindow > 0 && faces && faces.length > 0) {
            /// (1)蓄積データ 更新
            if (faces) {
                while (this.facesMV.length > params.movingAverageWindow) {
                    this.facesMV.shift();
                    // console.log("datanum", this.annotatedPredictionsMV.length);
                }
            }
            if (faces && faces[0] && faces[0].keypoints) {
                this.facesMV.push(faces);
            }

            /// (2) キーポイント移動平均算出
            /// (2-1) ウィンドウ内の一人目のランドマークを抽出
            const keypointsEach = this.facesMV.map((pred) => {
                return pred[0].keypoints;
            });
            /// (2-2) 足し合わせ
            const summedKeypoints = keypointsEach.reduce((prev, cur) => {
                for (let i = 0; i < cur.length; i++) {
                    if (prev[i]) {
                        prev[i].x = prev[i].x + cur[i].x;
                        prev[i].y = prev[i].y + cur[i].y;
                        prev[i].z = (prev[i].z || 0) + (cur[i].z || 0);
                    } else {
                        prev.push({
                            x: cur[i].x,
                            y: cur[i].y,
                            z: (cur[i].z || 0),
                            score: cur[i].score || undefined,
                            name: cur[i].name || undefined
                        });
                    }
                }
                return prev;
            }, [] as Keypoint[]);
            /// (2-3) 平均化
            for (let i = 0; i < summedKeypoints.length; i++) {
                summedKeypoints[i].x = summedKeypoints[i].x / this.facesMV.length;
                summedKeypoints[i].y = summedKeypoints[i].y / this.facesMV.length;
                summedKeypoints[i].z = (summedKeypoints[i].z || 0) / this.facesMV.length;
            }
            /// (2-4) 追加
            predictionEx.singlePersonKeypointsMovingAverage = summedKeypoints;

            /// (3) ボックス移動平均算出
            /// (3-1) ウィンドウ内の一人目のランドマークを抽出
            const boundingBoxEach = this.facesMV.map((pred) => {
                return pred[0].box;
            });
            /// (2-2) 足し合わせ
            const summedBoundingBox = boundingBoxEach.reduce((prev, cur) => {
                if (prev.width) {
                    prev.width = prev.width + cur.width;
                    prev.xMax = prev.xMax + cur.xMax;
                    prev.xMin = prev.xMin + cur.xMin;
                    prev.height = prev.height + cur.height;
                    prev.yMax = prev.yMax + cur.yMax;
                    prev.yMin = prev.yMin + cur.yMin;
                } else {
                    return {
                        width: cur.width,
                        xMax: cur.xMax,
                        xMin: cur.xMin,
                        height: cur.height,
                        yMax: cur.yMax,
                        yMin: cur.yMin,
                    };
                }
                return prev;
            }, {} as BoundingBox);
            /// (2-3) 平均化
            console.log();
            summedBoundingBox.width /= this.facesMV.length;
            summedBoundingBox.xMax /= this.facesMV.length;
            summedBoundingBox.xMin /= this.facesMV.length;
            summedBoundingBox.height /= this.facesMV.length;
            summedBoundingBox.yMax /= this.facesMV.length;
            summedBoundingBox.yMin /= this.facesMV.length;
            /// (2-4) 追加
            predictionEx.singlePersonBoxMovingAverage = summedBoundingBox;
        }

        return predictionEx;
    }


    fitCroppedArea = (prediction: FaceMeshPredictionEx, orgWidth: number, orgHeight: number, processedWidth: number, processedHeight: number, outputWidth: number, outputHeight: number, extendRatioTop: number, extendRatioBottom: number, extendRatioLeft: number, extendRatioRight: number) => {
        if (!prediction.singlePersonBoxMovingAverage) {
            return { xmin: 0, ymin: 0, width: 0, height: 0 };
        }
        const scaleX = orgWidth / processedWidth;
        const scaleY = orgHeight / processedHeight;
        const scaledXMin = prediction.singlePersonBoxMovingAverage!.xMin * scaleX;
        const scaledXMax = prediction.singlePersonBoxMovingAverage!.xMax * scaleX;
        const scaledWidth = scaledXMax - scaledXMin;
        const scaledYMin = prediction.singlePersonBoxMovingAverage!.yMin * scaleY;
        const scaledYMax = prediction.singlePersonBoxMovingAverage!.yMax * scaleY;
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
