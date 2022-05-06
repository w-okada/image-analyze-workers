import { BackendTypes, FaceLandmarkDetectionConfig, FaceLandmarkDetectionOperationParams, LandmarkTypes, ModelTypes, RefinedPoints, TFLite, TFLiteFaceLandmarkDetection, WorkerCommand, WorkerResponse } from "./const";
import { Face } from "@tensorflow-models/face-landmarks-detection";
import { BrowserTypes } from "@dannadori/worker-base";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals


/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"|| BUILD_TYPE==="" 
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import * as faceMesh from "@mediapipe/face_mesh";
/// #endif

/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
let model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
/// #endif
let tflite: TFLite | null = null;
let tfliteInputAddress: number = 0
let tfliteOutputAddress: number = 0

let config: FaceLandmarkDetectionConfig | null = null;

/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
const load_module = async (config: FaceLandmarkDetectionConfig) => {
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
        console.log("use cpu backend");
        await tf.setBackend("cpu");
    } else {
        console.log("use webgl backend");
        await tf.setBackend("webgl");
    }
};
/// #endif

const predict = async (config: FaceLandmarkDetectionConfig, params: FaceLandmarkDetectionOperationParams, data: Uint8ClampedArray): Promise<Face[] | null> => {
    const newImg = new ImageData(data, params.processWidth, params.processHeight);

    /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE===""  
    if (config.modelType === ModelTypes.mediapipe || config.modelType === ModelTypes.tfjs) {
        const prediction = await model!.estimateFaces(newImg, { flipHorizontal: false });
        return prediction;
    }
    /// #endif
    /// #if BUILD_TYPE==="full" || BUILD_TYPE==="short"  || BUILD_TYPE==="" ||BUILD_TYPE==="full_with_attention" || BUILD_TYPE==="short_with_attention"
    if (config.modelType === ModelTypes.tflite) {
        const imageData = newImg
        tflite!.HEAPU8.set(imageData.data, tfliteInputAddress);
        tflite!._exec(params.processWidth, params.processHeight, config.model.maxFaces);
        const faceNum = tflite!.HEAPF32[tfliteOutputAddress / 4];
        const tfliteFaces: TFLiteFaceLandmarkDetection[] = []
        for (let i = 0; i < faceNum; i++) {
            //   11: score and rects
            //    8: ratated face (4x2D)
            //   12: palm keypoints(6x2D)
            // 1404: landmark keypoints(468x3D)
            //  160: landmark Lip keypoints(80x2D)
            //  142: landmark left eye keypoints(71x2D)
            //  142: landmark right eye keypoints(71x2D)
            //   10: landmark left iris keypoint(5x2D)
            //   10: landmark right iris keypoint(5x2D)
            // -> 11 + 8 + 12 + 1404 + 160 + 142 + 142 + 10 + 10 = 1899
            const offset = tfliteOutputAddress / 4 + 1 + i * (1899)
            const face: TFLiteFaceLandmarkDetection = {
                score: tflite!.HEAPF32[offset + 0],
                landmarkScore: tflite!.HEAPF32[offset + 1],
                rotation: tflite!.HEAPF32[offset + 2],
                face: {
                    minX: tflite!.HEAPF32[offset + 3],
                    minY: tflite!.HEAPF32[offset + 4],
                    maxX: tflite!.HEAPF32[offset + 5],
                    maxY: tflite!.HEAPF32[offset + 6],
                },
                faceWithMargin: {
                    minX: tflite!.HEAPF32[offset + 7],
                    minY: tflite!.HEAPF32[offset + 8],
                    maxX: tflite!.HEAPF32[offset + 9],
                    maxY: tflite!.HEAPF32[offset + 10],
                },
                rotatedFace: {
                    positions: [
                    ]
                },
                faceKeypoints: [
                ],
                landmarkKeypoints: [
                ],
                landmarkLipsKeypoints: [
                ],
                landmarkLeftEyeKeypoints: [
                ],
                landmarkRightEyeKeypoints: [
                ],
                landmarkLeftIrisKeypoints: [
                ],
                landmarkRightIrisKeypoints: [
                ],
            }
            for (let j = 0; j < 4; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11) + (j * 2)
                face.rotatedFace.positions.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 6; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11 + 8) + (j * 2)
                face.faceKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 468; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12) + (j * 3)
                face.landmarkKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                    z: tflite!.HEAPF32[offset + 2],
                })
            }
            for (let j = 0; j < 80; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404) + (j * 2)
                face.landmarkLipsKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 71; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160) + (j * 2)
                face.landmarkLeftEyeKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 71; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142) + (j * 2)
                face.landmarkRightEyeKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 5; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142) + (j * 2)
                face.landmarkLeftIrisKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 5; j++) {
                let offset = (tfliteOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142 + 10) + (j * 2)
                face.landmarkRightIrisKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }

            if (face.score > 0.5 && face.landmarkScore > 0.5) {
                tfliteFaces.push(face)

            }
        }
        const faces: Face[] = tfliteFaces.map(x => {
            const face: Face = {
                keypoints: [...x.landmarkKeypoints],
                box: {
                    xMin: x.face.minX,
                    yMin: x.face.minY,
                    xMax: x.face.maxX,
                    yMax: x.face.maxY,
                    width: x.face.maxX - x.face.minX,
                    height: x.face.maxY - x.face.maxY
                }
            }

            if (config.landmarkModelKey === LandmarkTypes.with_attention && face.keypoints.length > 0) {
                RefinedPoints.lips.forEach((dst, src) => {
                    face.keypoints[dst].x = x.landmarkLipsKeypoints[src].x;
                    face.keypoints[dst].y = x.landmarkLipsKeypoints[src].y;
                })
                RefinedPoints.leftEye.forEach((dst, src) => {
                    face.keypoints[dst].x = x.landmarkLeftEyeKeypoints[src].x;
                    face.keypoints[dst].y = x.landmarkLeftEyeKeypoints[src].y;
                })
                RefinedPoints.rightEye.forEach((dst, src) => {
                    face.keypoints[dst].x = x.landmarkRightEyeKeypoints[src].x;
                    face.keypoints[dst].y = x.landmarkRightEyeKeypoints[src].y;
                })
                RefinedPoints.leftIris.forEach((dst, src) => {
                    face.keypoints[dst] = x.landmarkLeftIrisKeypoints[src];
                })
                RefinedPoints.rightIris.forEach((dst, src) => {
                    face.keypoints[dst] = x.landmarkRightIrisKeypoints[src];
                })
            }

            return face
        })
        return faces
    }
    /// #endif
    return null;
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        config = event.data.config as FaceLandmarkDetectionConfig;

        /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE===""         
        await load_module(config);
        await tf.ready();
        tf.env().set("WEBGL_CPU_FORWARD", false);
        try {
            model?.dispose();
        } catch (error) {
            console.log("this error is ignored", error)
        }
        model = null;
        if (config.modelType === (ModelTypes.mediapipe)) {
            // Maybe this module is not work.....(20220408)
            model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
                runtime: "mediapipe",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${faceMesh.VERSION}`,
            });
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        } else if (config.modelType === (ModelTypes.tfjs)) {

            model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
                runtime: "tfjs",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
            });
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        }
        /// #endif
        /// #if BUILD_TYPE==="full" || BUILD_TYPE==="short"  || BUILD_TYPE==="" ||BUILD_TYPE==="full_with_attention" || BUILD_TYPE==="short_with_attention"
        if (config.modelType === ModelTypes.tflite) {
            // const browserType = getBrowserType();
            const browserType = config.browserType
            if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
                // SIMD
                const modSimd = require("../resources/wasm/tflite-simd.js");
                const b = Buffer.from(config.wasmSimdBase64!, "base64");

                tflite = await modSimd({ wasmBinary: b });
            } else {
                // Not-SIMD
                const mod = require("../resources/wasm/tflite.js");
                const b = Buffer.from(config.wasmBase64!, "base64");
                tflite = await mod({ wasmBinary: b });
            }

            const detectorModel = Buffer.from(config.detectorModelTFLite[config.detectorModelKey], "base64");
            tflite!._initDetectorModelBuffer(detectorModel.byteLength);
            const detectorModelBufferOffset = tflite!._getDetectorModelBufferAddress();
            tflite!.HEAPU8.set(new Uint8Array(detectorModel), detectorModelBufferOffset);
            tflite!._loadDetectorModel(detectorModel.byteLength);

            const landmarkModel = Buffer.from(config.landmarkModelTFLite[config.landmarkModelKey], "base64");
            tflite!._initLandmarkModelBuffer(landmarkModel.byteLength);
            const landmarkModelBufferOffset = tflite!._getLandmarkModelBufferAddress();
            tflite!.HEAPU8.set(new Uint8Array(landmarkModel), landmarkModelBufferOffset);
            tflite!._loadLandmarkModel(landmarkModel.byteLength);

            tflite!._initInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
            tfliteInputAddress = tflite!._getInputBufferAddress()
            tfliteOutputAddress = tflite!._getOutputBufferAddress()
            console.log("tflite worker initilizied")
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        }
        /// #endif
    } else if (event.data.message === WorkerCommand.PREDICT) {
        // const config = event.data.config as FaceLandmarkDetectionConfig;
        const params = event.data.params as FaceLandmarkDetectionOperationParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config!, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
