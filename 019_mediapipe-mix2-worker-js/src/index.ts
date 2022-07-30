import { getBrowserType, ImageProcessor, WorkerManagerBase } from "@dannadori/worker-base";
import { FacePredictionEx, HandPredictionEx, MediapipeMix2Config, MediapipeMix2OperationParams, OperationType, PosePredictionEx, TFLite } from "./const";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./worker.ts";
import { MediapipeMixProcessor } from "./MediapipeMixProcessor";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { Face, Keypoint } from "@tensorflow-models/face-landmarks-detection";
import { Pose } from "@tensorflow-models/pose-detection";
import { BoundingBox } from "@tensorflow-models/face-landmarks-detection/dist/shared/calculators/interfaces/shape_interfaces";

export * from "./const"
export * from "./facePoints";

export type MediapipeMixWorkerManager2Props = {
    wasmUrl?: string,
    palmDetectorModelTFLiteUrl?: string,
    handLandmarkLiteTFLiteUrl?: string,
    faceDetectorModelTFLiteUrl?: string,
    faceLandmarkModelTFLiteUrl?: string,
    poseDetectorModelTFLiteUrl?: string,
    poseLandmarkModelTFLiteUrl?: string,

    jsUrl?: string,

}

export class MediapipeMix2WorkerManager extends WorkerManagerBase<MediapipeMix2Config, MediapipeMix2OperationParams> {
    imageProcessor: ImageProcessor<MediapipeMix2Config, MediapipeMix2OperationParams> = new MediapipeMixProcessor();
    private config: MediapipeMix2Config | null = null


    generateDefaultConfig = async (props?: MediapipeMixWorkerManager2Props) => {
        // (1) Load Wasm
        const wasmUrl = props?.wasmUrl || require("./resources/wasm/tflite-simd.wasm") as string
        const wasmBin = await this.fetchData(wasmUrl)

        // (2) Load TFLite
        const palmDetectorModelTFLiteUrl = props?.palmDetectorModelTFLiteUrl || require("./resources/tflite/detector/palm_detection_lite.bin") as string
        const palmDetectorModelTFLite = await this.fetchData(palmDetectorModelTFLiteUrl)

        const handLandmarkLiteTFLiteUrl = props?.handLandmarkLiteTFLiteUrl || require("./resources/tflite/landmark/hand_landmark_lite.bin")
        const handLandmarkLiteTFLite = await this.fetchData(handLandmarkLiteTFLiteUrl)

        const faceDetectorModelTFLiteUrl = props?.faceDetectorModelTFLiteUrl || require("./resources/tflite/detector/face_detection_short_range.bin")
        const faceDetectorModelTFLite = await this.fetchData(faceDetectorModelTFLiteUrl)

        const faceLandmarkModelTFLiteUrl = props?.faceLandmarkModelTFLiteUrl || require("./resources/tflite/landmark/model_float16_quant.bin")
        const faceLandmarkModelTFLite = await this.fetchData(faceLandmarkModelTFLiteUrl)

        const poseDetectorModelTFLiteUrl = props?.poseDetectorModelTFLiteUrl || require("./resources/tflite/detector/pose_detection.bin")
        const poseDetectorModelTFLite = await this.fetchData(poseDetectorModelTFLiteUrl)


        const poseLandmarkModelTFLiteUrl = props?.poseLandmarkModelTFLiteUrl || require("./resources/tflite/landmark/pose_landmark_lite.bin")
        const poseLandmarkModelTFLite = await this.fetchData(poseLandmarkModelTFLiteUrl)


        const defaultConf: MediapipeMix2Config = {
            browserType: getBrowserType(),
            processOnLocal: true,
            pageUrl: window.location.href,
            wasmBin,

            palmDetectorModelTFLites: {
                "lite": palmDetectorModelTFLite,
            },
            handLandmarkModelTFLites: {
                "lite": handLandmarkLiteTFLite,
            },
            handModelKey: "lite",
            faceDetectorModelTFLites: {
                "lite": faceDetectorModelTFLite,
            },
            faceLandmarkModelTFLites: {
                "lite": faceLandmarkModelTFLite,
            },
            faceModelKey: "lite",
            poseDetectorModelTFLites: {
                "lite": poseDetectorModelTFLite,
            },
            poseLandmarkModelTFLites: {
                "lite": poseLandmarkModelTFLite,
            },
            poseModelKey: "lite",

            maxProcessWidth: 1024,
            maxProcessHeight: 1024,
        };
        return defaultConf;
    }

    generateDefaultMediapipeMixParams = () => {
        const defaultParams: MediapipeMix2OperationParams = {
            operationType: OperationType.face,
            handProcessWidth: 512,
            handProcessHeight: 512,
            handMaxHands: 2,
            handAffineResizedFactor: 2,
            faceProcessWidth: 512,
            faceProcessHeight: 512,
            faceMaxFaces: 1,
            faceMovingAverageWindow: 5,
            poseProcessWidth: 512,
            poseProcessHeight: 512,
            poseMaxPoses: 1,
            poseMovingAverageWindow: 5,
            poseAffineResizedFactor: 2,
            poseCropExt: 1.3,
            poseCalculateMode: 0
        };
        return defaultParams;
    };


    init = async (config: MediapipeMix2Config | null) => {
        this.config = config || await this.generateDefaultConfig();
        await this.initCommon(
            {
                useWorkerForSafari: true,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            this.config
        );
        console.log("[manager] tflite worker initilizied.")
        return;
    }

    predict = async (params: MediapipeMix2OperationParams, targetCanvas: HTMLCanvasElement | HTMLVideoElement) => {
        if (!this.config) {
            console.warn("config is not initialized.")
            return null
        }
        const currentParams = { ...params };

        // (1) generate resized canvas
        const createResizedCanvas = (currentParams: MediapipeMix2OperationParams, targetCanvas: HTMLCanvasElement | HTMLVideoElement) => {
            if (params.operationType === OperationType.hand) {
                return this.generateTargetCanvas(targetCanvas, currentParams.handProcessWidth, currentParams.handProcessHeight);
            } else if (params.operationType === OperationType.face) {
                return this.generateTargetCanvas(targetCanvas, currentParams.faceProcessWidth, currentParams.faceProcessHeight);
            } else {
                return this.generateTargetCanvas(targetCanvas, currentParams.poseProcessWidth, currentParams.poseProcessHeight);
            }
        }
        const resizedCanvas = createResizedCanvas(currentParams, targetCanvas)

        // (2) predict on local
        if (!this.worker) {
            const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
            // const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            const prediction = await this.imageProcessor.predict(this.config, currentParams, imageData.data);
            if (currentParams.operationType === OperationType.hand) {
                return this.generateHandPredictionEx(this.config, currentParams, prediction as Hand[] | null)
            } else if (currentParams.operationType === OperationType.face) {
                return this.generateFacePredictionEx(this.config, currentParams, prediction as Face[] | null)
            } else {
                return this.generatePosePredictionEx(this.config, currentParams, prediction as Pose[] | null)
            }
        }
        // (3) predicton on webworker
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data));
        if (currentParams.operationType === OperationType.hand) {
            return this.generateHandPredictionEx(this.config, currentParams, prediction as Hand[] | null)
        } else if (currentParams.operationType === OperationType.face) {
            return this.generateFacePredictionEx(this.config, currentParams, prediction as Face[] | null)
        } else {
            return this.generatePosePredictionEx(this.config, currentParams, prediction as Pose[] | null)
        }
    }


    /////////////////////////////////////////
    // Generate Hand Result
    /////////////////////////////////////////
    generateHandPredictionEx = (config: MediapipeMix2Config, params: MediapipeMix2OperationParams, prediction: Hand[] | null): HandPredictionEx => {
        const hands = prediction
        const predictionEx: HandPredictionEx = {
            operationType: OperationType.hand,
            rowPrediction: hands,
        };
        return predictionEx
    }


    /////////////////////////////////////////
    // Generate Face Result
    /////////////////////////////////////////
    facesMV: Face[][] = [];
    generateFacePredictionEx = (config: MediapipeMix2Config, params: MediapipeMix2OperationParams, prediction: Face[] | null): FacePredictionEx => {
        const faces = prediction
        const predictionEx: FacePredictionEx = {
            operationType: OperationType.face,
            rowPrediction: faces,
        };
        if (params.faceMovingAverageWindow > 0) {
            /// (1)蓄積データ 更新
            if (faces) {
                while (this.facesMV.length > params.faceMovingAverageWindow) {
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


    /////////////////////////////////////////
    // Generate Pose Result
    /////////////////////////////////////////
    posesMV: Pose[][] = [];
    generatePosePredictionEx = (config: MediapipeMix2Config, params: MediapipeMix2OperationParams, prediction: Pose[] | null): PosePredictionEx => {
        const poses = prediction
        const predictionEx: PosePredictionEx = {
            operationType: OperationType.pose,
            rowPrediction: poses,
        };
        if (params.poseMovingAverageWindow > 0) {
            /// (1)蓄積データ 更新
            if (poses) {
                while (this.posesMV.length > params.poseMovingAverageWindow) {
                    this.posesMV.shift();
                }
            }
            if (poses && poses[0] && poses[0].keypoints) {
                this.posesMV.push(poses);
            }

            /// (2) キーポイント移動平均算出
            /// (2-1) ウィンドウ内の一人目のランドマークを抽出
            const keypointsEach = this.posesMV.map((pred) => {
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
                summedKeypoints[i].x = summedKeypoints[i].x / this.posesMV.length;
                summedKeypoints[i].y = summedKeypoints[i].y / this.posesMV.length;
                summedKeypoints[i].z = (summedKeypoints[i].z || 0) / this.posesMV.length;
            }
            /// (2-4) 追加
            predictionEx.singlePersonKeypointsMovingAverage = summedKeypoints;


            /// (3) キーポイント3D移動平均算出
            /// (3-1) ウィンドウ内の一人目のランドマークを抽出
            const keypoints3DEach = this.posesMV.map((pred) => {
                return pred[0].keypoints3D!;
            });
            /// (2-2) 足し合わせ
            const summedKeypoints3D = keypoints3DEach.reduce((prev, cur) => {
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
            for (let i = 0; i < summedKeypoints3D.length; i++) {
                summedKeypoints3D[i].x = summedKeypoints3D[i].x / this.posesMV.length;
                summedKeypoints3D[i].y = summedKeypoints3D[i].y / this.posesMV.length;
                summedKeypoints3D[i].z = (summedKeypoints3D[i].z || 0) / this.posesMV.length;
            }
            /// (2-4) 追加
            predictionEx.singlePersonKeypoints3DMovingAverage = summedKeypoints3D;




            /// (3) ボックス移動平均算出
            /// (3-1) ウィンドウ内の一人目のランドマークを抽出
            const boundingBoxEach = this.posesMV.map((pred) => {
                return pred[0].box!;
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
            summedBoundingBox.width /= this.posesMV.length;
            summedBoundingBox.xMax /= this.posesMV.length;
            summedBoundingBox.xMin /= this.posesMV.length;
            summedBoundingBox.height /= this.posesMV.length;
            summedBoundingBox.yMax /= this.posesMV.length;
            summedBoundingBox.yMin /= this.posesMV.length;
            /// (2-4) 追加
            predictionEx.singlePersonBoxMovingAverage = summedBoundingBox;
        }

        return predictionEx;
    }


    /////////////////////////////////////////
    // Face Crop Utility
    /////////////////////////////////////////

    fitCroppedArea = (prediction: FacePredictionEx, orgWidth: number, orgHeight: number, processedWidth: number, processedHeight: number, outputWidth: number, outputHeight: number, extendRatioTop: number, extendRatioBottom: number, extendRatioLeft: number, extendRatioRight: number) => {
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