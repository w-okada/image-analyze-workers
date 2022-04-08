import { BackendTypes, FacemeshConfig, FacemeshFunctionTypes, FacemeshOperatipnParams, FaceMeshPredictionEx, FacemeshPredictionMediapipe, FacemeshPredictionOld, ModelTypes, TRIANGULATION } from "./const";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs";
import { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import { Coord2D, Coords3D } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh/util";

export { FacemeshConfig, FacemeshOperatipnParams, NUM_KEYPOINTS, TRIANGULATION, BackendTypes, ModelTypes, FaceMeshPredictionEx } from "./const";
export { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
export { Coords3D } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh/util";

import * as faceLandmarksDetectionCurrent from "@tensorflow-models/face-landmarks-detection-current";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./facemesh-worker-worker.ts";
import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

import * as faceMesh from "@mediapipe/face_mesh";
import { Face, Keypoint } from "@tensorflow-models/face-landmarks-detection-current/dist/types";
import { BoundingBox } from "@tensorflow-models/face-landmarks-detection-current/dist/shared/calculators/interfaces/shape_interfaces";
import { url } from "inspector";
export { BoundingBox } from "@tensorflow-models/face-landmarks-detection-current/dist/shared/calculators/interfaces/shape_interfaces";
export { Face, Keypoint } from "@tensorflow-models/face-landmarks-detection-current/dist/types";

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

export const generateDefaultFacemeshParams = () => {
    const defaultParams: FacemeshOperatipnParams = {
        type: FacemeshFunctionTypes.DetectMesh,
        processWidth: 300,
        processHeight: 300,
        predictIrises: false,
        movingAverageWindow: 10,
        trackingAreaMarginRatioX: 0.3,
        trackingAreaMarginRatioTop: 0.8,
        trackingAreaMarginRatioBottom: 0.2,
    };
    return defaultParams;
};

export class LocalFM extends LocalWorker {
    model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
    model2: faceLandmarksDetectionCurrent.FaceLandmarksDetector | null = null;
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

        if (config.modelType === ModelTypes.old) {
            this.model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, config);
            this.model2?.dispose();
            this.model2 = null;
        } else if (config.modelType === ModelTypes.mediapipe) {
            this.model = null;
            this.model2?.dispose();
            this.model2 = await faceLandmarksDetectionCurrent.createDetector(faceLandmarksDetectionCurrent.SupportedModels.MediaPipeFaceMesh, {
                runtime: "mediapipe",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${faceMesh.VERSION}`,
            });
        } else {
            this.model = null;
            this.model2?.dispose();
            this.model2 = await faceLandmarksDetectionCurrent.createDetector(faceLandmarksDetectionCurrent.SupportedModels.MediaPipeFaceMesh, {
                runtime: "tfjs",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
            });
        }

        console.log("facemesh loaded locally", config);
    };

    predict = async (config: FacemeshConfig, params: FacemeshOperatipnParams, targetCanvas: HTMLCanvasElement): Promise<AnnotatedPrediction[] | Face[] | null> => {
        // console.log("Loacal BACKEND:", tf.getBackend());
        const ctx = targetCanvas.getContext("2d")!;
        const newImg = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        if (this.model) {
            await tf.ready();
            let tensor = tf.browser.fromPixels(newImg);

            const prediction = await this.model!.estimateFaces({
                input: tensor,
                predictIrises: params.predictIrises,
            });
            tensor.dispose();

            return prediction;
        } else if (this.model2) {
            const prediction = await this.model2.estimateFaces(newImg, { flipHorizontal: false });
            return prediction;
        } else {
            return null;
        }
    };
}

export class FacemeshWorkerManager extends WorkerManagerBase {
    private config = generateFacemeshDefaultConfig();
    localWorker = new LocalFM();

    init = async (config: FacemeshConfig | null) => {
        this.config = config || generateFacemeshDefaultConfig();
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

    predict = async (params: FacemeshOperatipnParams, targetCanvas: HTMLCanvasElement): Promise<FaceMeshPredictionEx> => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return this.generatePredictionEx(this.config, params, prediction);
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(this.config, currentParams, imageData.data)) as AnnotatedPrediction[];
        return this.generatePredictionEx(this.config, params, prediction);
    };

    annotatedPredictionsMV: AnnotatedPrediction[][] = [];
    facesMV: Face[][] = [];

    generatePredictionEx = (config: FacemeshConfig, params: FacemeshOperatipnParams, prediction: AnnotatedPrediction[] | Face[] | null): FaceMeshPredictionEx => {
        if (config.modelType === ModelTypes.old) {
            const annotatedPredictions = prediction as AnnotatedPrediction[] | null;
            const predictionEx: FacemeshPredictionOld = {
                modelType: "old",
                rowPrediction: annotatedPredictions,
            };
            if (params.movingAverageWindow > 0) {
                /// (1)蓄積データ 更新
                if (annotatedPredictions) {
                    while (this.annotatedPredictionsMV.length > params.movingAverageWindow) {
                        this.annotatedPredictionsMV.shift();
                        // console.log("datanum", this.annotatedPredictionsMV.length);
                    }
                }
                if (annotatedPredictions) {
                    this.annotatedPredictionsMV.push(annotatedPredictions);
                }

                /// (2) キーポイント移動平均算出
                /// (2-1) ウィンドウ内の一人目のランドマークを抽出
                const keypointsEach = this.annotatedPredictionsMV.map((pred) => {
                    return pred[0].scaledMesh as Coords3D;
                });
                /// (2-2) 足し合わせ
                const summedKeypoints = keypointsEach.reduce((prev, cur) => {
                    for (let i = 0; i < cur.length; i++) {
                        if (prev[i]) {
                            prev[i][0] = prev[i][0] + cur[i][0];
                            prev[i][1] = prev[i][1] + cur[i][1];
                            prev[i][2] = prev[i][2] + cur[i][2];
                        } else {
                            prev.push([cur[i][0], cur[i][1], cur[i][2]]);
                        }
                    }
                    return prev;
                }, [] as Coords3D);
                /// (2-3) 平均化
                for (let i = 0; i < summedKeypoints.length; i++) {
                    summedKeypoints[i][0] = summedKeypoints[i][0] / this.annotatedPredictionsMV.length;
                    summedKeypoints[i][1] = summedKeypoints[i][1] / this.annotatedPredictionsMV.length;
                    summedKeypoints[i][2] = summedKeypoints[i][2] / this.annotatedPredictionsMV.length;
                }
                /// (2-4) 追加
                predictionEx.singlePersonKeypointsMovingAverage = summedKeypoints;

                /// (3) ボックス移動平均算出
                /// (3-1) ウィンドウ内の一人目のランドマークを抽出
                const boundingBoxEach = this.annotatedPredictionsMV.map((pred) => {
                    return pred[0].boundingBox as {
                        topLeft: Coord2D;
                        bottomRight: Coord2D;
                    };
                });
                /// (3-2) 足し合わせ
                const summedBoundingBox = boundingBoxEach.reduce((prev, cur) => {
                    if (prev.width) {
                        prev.width = prev.width + cur.bottomRight[0] - cur.topLeft[0];
                        prev.xMax = prev.xMax + cur.bottomRight[0];
                        prev.xMin = prev.xMin + cur.topLeft[0];
                        prev.height = prev.height + cur.bottomRight[1] - cur.topLeft[1];
                        prev.yMax = prev.yMax + cur.bottomRight[1];
                        prev.yMin = prev.yMin + cur.topLeft[1];
                    } else {
                        return {
                            width: cur.bottomRight[0] - cur.topLeft[0],
                            xMax: cur.bottomRight[0],
                            xMin: cur.topLeft[0],
                            height: cur.bottomRight[1] - cur.topLeft[1],
                            yMax: cur.bottomRight[1],
                            yMin: cur.topLeft[1],
                        };
                    }
                    return prev;
                }, {} as BoundingBox);
                /// (3-3) 平均化
                summedBoundingBox.width /= this.annotatedPredictionsMV.length;
                summedBoundingBox.xMax /= this.annotatedPredictionsMV.length;
                summedBoundingBox.xMin /= this.annotatedPredictionsMV.length;
                summedBoundingBox.height /= this.annotatedPredictionsMV.length;
                summedBoundingBox.yMax /= this.annotatedPredictionsMV.length;
                summedBoundingBox.yMin /= this.annotatedPredictionsMV.length;
                /// (3-4) 追加
                predictionEx.singlePersonBoxMovingAverage = summedBoundingBox;

                /// (4)Tracking Area
                const trackingAreaCenterX = (summedBoundingBox.xMax + summedBoundingBox.xMin) / 2;
                const trackingAreaCenterY = (summedBoundingBox.yMax + summedBoundingBox.yMin) / 2;
                const idearlRadiusX = (summedBoundingBox.width / 2) * (1 + params.trackingAreaMarginRatioX);
                const idearlRadiusTop = (summedBoundingBox.height / 2) * (1 + params.trackingAreaMarginRatioTop);
                const idearlRadiusBottom = (summedBoundingBox.height / 2) * (1 + params.trackingAreaMarginRatioBottom);

                const trackingAreaCenterXMin = trackingAreaCenterX - idearlRadiusX > 0 ? trackingAreaCenterX - idearlRadiusX : 0;
                const trackingAreaCenterXMax = trackingAreaCenterX + idearlRadiusX < params.processWidth ? trackingAreaCenterX + idearlRadiusX : params.processWidth;
                const trackingAreaCenterYmin = trackingAreaCenterY - idearlRadiusTop > 0 ? trackingAreaCenterY - idearlRadiusTop : 0;
                const trackingAreaCenterYmax = trackingAreaCenterY - idearlRadiusBottom < params.processHeight ? trackingAreaCenterY + idearlRadiusTop : params.processHeight;
                predictionEx.trackingArea = {
                    centerX: trackingAreaCenterX,
                    centerY: trackingAreaCenterY,
                    xMin: trackingAreaCenterXMin,
                    xMax: trackingAreaCenterXMax,
                    yMin: trackingAreaCenterYmin,
                    yMax: trackingAreaCenterYmax,
                    width: trackingAreaCenterXMax - trackingAreaCenterXMin,
                    height: trackingAreaCenterYmax - trackingAreaCenterYmin,
                };
            }

            return predictionEx;
        } else {
            const faces = prediction as Face[] | null;
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
                            prev[i][0] = prev[i][0] + cur[i].x;
                            prev[i][1] = prev[i][1] + cur[i].y;
                            prev[i][2] = prev[i][2] + cur[i].z!;
                        } else {
                            prev.push([cur[i].x, cur[i].y, cur[i].z!]);
                        }
                    }
                    return prev;
                }, [] as Coords3D);
                /// (2-3) 平均化
                for (let i = 0; i < summedKeypoints.length; i++) {
                    summedKeypoints[i][0] = summedKeypoints[i][0] / this.facesMV.length;
                    summedKeypoints[i][1] = summedKeypoints[i][1] / this.facesMV.length;
                    summedKeypoints[i][2] = summedKeypoints[i][2] / this.facesMV.length;
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

                /// (4)Tracking Area
                const trackingAreaCenterX = (summedBoundingBox.xMax + summedBoundingBox.xMin) / 2;
                const trackingAreaCenterY = (summedBoundingBox.yMax + summedBoundingBox.yMin) / 2;
                const idearlRadiusX = (summedBoundingBox.width / 2) * (1 + params.trackingAreaMarginRatioX);
                const idearlRadiusTop = (summedBoundingBox.height / 2) * (1 + params.trackingAreaMarginRatioTop);
                const idearlRadiusBottom = (summedBoundingBox.height / 2) * (1 + params.trackingAreaMarginRatioBottom);

                const trackingAreaCenterXMin = trackingAreaCenterX - idearlRadiusX > 0 ? trackingAreaCenterX - idearlRadiusX : 0;
                const trackingAreaCenterXMax = trackingAreaCenterX + idearlRadiusX < params.processWidth ? trackingAreaCenterX + idearlRadiusX : params.processWidth;
                const trackingAreaCenterYmin = trackingAreaCenterY - idearlRadiusTop > 0 ? trackingAreaCenterY - idearlRadiusTop : 0;
                const trackingAreaCenterYmax = trackingAreaCenterY - idearlRadiusBottom < params.processHeight ? trackingAreaCenterY + idearlRadiusTop : params.processHeight;
                predictionEx.trackingArea = {
                    centerX: trackingAreaCenterX,
                    centerY: trackingAreaCenterY,
                    xMin: trackingAreaCenterXMin,
                    xMax: trackingAreaCenterXMax,
                    yMin: trackingAreaCenterYmin,
                    yMax: trackingAreaCenterYmax,
                    width: trackingAreaCenterXMax - trackingAreaCenterXMin,
                    height: trackingAreaCenterYmax - trackingAreaCenterYmin,
                };
            }

            return predictionEx;
        }
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
