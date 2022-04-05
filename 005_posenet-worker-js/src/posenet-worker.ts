import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";
import * as poseNet from "@tensorflow-models/posenet";
import * as tf from "@tensorflow/tfjs";
import { BackendTypes, ModelConfigs, PoseNetConfig, PoseNetFunctionTypes, PoseNetOperatipnParams } from "./const";

export { Pose, getAdjacentKeyPoints } from "@tensorflow-models/posenet";
export { PoseNetOperatipnParams, PoseNetConfig, PoseNetFunctionTypes } from "./const";
export type { PoseNetArchitecture, PoseNetOutputStride, MobileNetMultiplier, PoseNetQuantBytes } from "@tensorflow-models/posenet/dist/types";
export const generatePoseNetDefaultConfig = (): PoseNetConfig => {
    const defaultConf: PoseNetConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.WebGL,
        processOnLocal: false,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        workerPath: "./posenet-worker-worker.js",
        model: ModelConfigs.ModelConfigMobileNetV1,
    };
    // WASMバージョンがあまり早くないので、Safariはローカルで実施をデフォルトにする。
    if (defaultConf.browserType == BrowserTypes.SAFARI) {
        defaultConf.processOnLocal = true;
    }
    return defaultConf;
};

export const generateDefaultPoseNetParams = () => {
    const defaultParams: PoseNetOperatipnParams = {
        type: PoseNetFunctionTypes.SinglePerson,
        singlePersonParams: {
            flipHorizontal: false,
        },
        multiPersonParams: {
            flipHorizontal: false,
            maxDetections: 5,
            scoreThreshold: 0.5,
            nmsRadius: 20,
        },
        processWidth: 300,
        processHeight: 300,
    };
    return defaultParams;
};

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./posenet-worker-worker.ts";

class LocalPN extends LocalWorker {
    model: poseNet.PoseNet | null = null;
    canvas: HTMLCanvasElement = document.createElement("canvas");
    init = (config: PoseNetConfig) => {
        return poseNet.load(config.model).then((res) => {
            console.log("posenet loaded locally", config);
            this.model = res;
            return;
        });
    };

    predict = async (config: PoseNetConfig, params: PoseNetOperatipnParams, canvas: HTMLCanvasElement): Promise<poseNet.Pose[]> => {
        // console.log("current backend[main thread]:", tf.getBackend());

        const newImg = canvas.getContext("2d")!.getImageData(0, 0, params.processWidth, params.processHeight);

        if (params.type === PoseNetFunctionTypes.SinglePerson) {
            const prediction = await this.model!.estimateSinglePose(newImg, params.singlePersonParams!);
            return [prediction];
        } else if (params.type === PoseNetFunctionTypes.MultiPerson) {
            const prediction = await this.model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
            return prediction;
        } else {
            // multi に倒す
            const prediction = await this.model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
            return prediction;
        }
    };
}

export class PoseNetWorkerManager extends WorkerManagerBase {
    private config = generatePoseNetDefaultConfig();
    localWorker = new LocalPN();

    init = async (config: PoseNetConfig | null = null) => {
        this.config = config || generatePoseNetDefaultConfig();
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
    predict = async (params: PoseNetOperatipnParams, targetCanvas: HTMLCanvasElement) => {
        if (!this.worker) {
            const resizedCanvas = this.generateTargetCanvas(targetCanvas, params.processWidth, params.processHeight);
            const prediction = await this.localWorker.predict(this.config, params, resizedCanvas);
            return prediction;
        }

        const resizedCanvas = this.generateTargetCanvas(targetCanvas, params.processWidth, params.processHeight);
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(this.config, params, imageData.data)) as poseNet.Pose[];
        return prediction;
    };
}

//// Utility for Demo
const drawPoints = (canvas: HTMLCanvasElement, prediction: poseNet.Pose) => {
    const keypoints = prediction.keypoints;

    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];

        const scaleX = 1;
        const scaleY = 1;

        const x = keypoint.position.x;
        const y = keypoint.position.y;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "rgba(0,0,255,0.3)";
        ctx.fillRect(x * scaleX, y * scaleY, 6, 6);
    }
};

const drawSkeleton = (canvas: HTMLCanvasElement, prediction: poseNet.Pose) => {
    const adjacentKeyPoints = poseNet.getAdjacentKeyPoints(prediction.keypoints, 0.0);
    // const scaleX = width/this.config.processWidth
    // const scaleY = height/this.config.processHeight
    const scaleX = 1;
    const scaleY = 1;

    const ctx = canvas.getContext("2d")!;
    adjacentKeyPoints.forEach((keypoints) => {
        ctx.beginPath();
        ctx.moveTo(keypoints[0].position.x * scaleX, keypoints[0].position.y * scaleY);
        ctx.lineTo(keypoints[1].position.x * scaleX, keypoints[1].position.y * scaleY);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(255,0,0,0.3)";
        ctx.stroke();
    });
};

export const drawSkeltonAndPoint = (srcCanvas: HTMLCanvasElement, prediction: poseNet.Pose[]) => {
    const canvas = document.createElement("canvas");
    canvas.width = srcCanvas.width;
    canvas.height = srcCanvas.height;
    prediction.forEach((x: poseNet.Pose) => {
        drawPoints(canvas, x);
        drawSkeleton(canvas, x);
    });
    const imageData = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    canvas.remove();
    return imageData;
};
