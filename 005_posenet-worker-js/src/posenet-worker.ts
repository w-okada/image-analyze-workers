import {
    PoseNetConfig, ModelConfigResNet50, WorkerCommand,
    WorkerResponse, PoseNetFunctionType, PoseNetOperatipnParams
} from './const'
import { getBrowserType, BrowserType } from './BrowserUtil'
import * as poseNet from '@tensorflow-models/posenet'
import * as tf from '@tensorflow/tfjs';

export { Pose, getAdjacentKeyPoints } from '@tensorflow-models/posenet'
export { ModelConfigResNet50, ModelConfigMobileNetV1, PoseNetOperatipnParams, PoseNetFunctionType } from './const'

export const generatePoseNetDefaultConfig = (): PoseNetConfig => {
    const defaultConf: PoseNetConfig = {
        browserType: getBrowserType(),
        model: ModelConfigResNet50,
        processOnLocal: false,
        useTFWasmBackend: false, // we can not use posenet with wasm.
        wasmPath: "/tfjs-backend-wasm.wasm",
        workerPath: "/posenet-worker-worker.js"
    }
    // WASMバージョンがあまり早くないので、Safariはローカルで実施をデフォルトにする。
    if (defaultConf.browserType == BrowserType.SAFARI) {
        defaultConf.processOnLocal = true
    }    
    return defaultConf
}

export const generateDefaultPoseNetParams = () => {
    const defaultParams: PoseNetOperatipnParams = {
        type: PoseNetFunctionType.SinglePerson,
        singlePersonParams: {
            flipHorizontal: false
        },
        multiPersonParams: {
            flipHorizontal: false,
            maxDetections: 5,
            scoreThreshold: 0.5,
            nmsRadius: 20,
        },
    }
    return defaultParams
}



class LocalPN {
    model: poseNet.PoseNet | null = null
    canvas: HTMLCanvasElement = document.createElement("canvas")
    init = (config: PoseNetConfig) => {
        return poseNet.load(config.model).then(res => {
            console.log("posenet loaded locally", config)
            this.model = res
            return
        })
    }


    predict = async (canvas: HTMLCanvasElement, config: PoseNetConfig, params: PoseNetOperatipnParams): Promise<poseNet.Pose[]> => {
        console.log("current backend[main thread]:",tf.getBackend())
        // ImageData作成
        //// input resolutionにリサイズするのでここでのリサイズは不要
        // const processWidth = (config.processWidth <= 0 || config.processHeight <= 0) ? image.width : config.processWidth
        // const processHeight = (config.processWidth <= 0 || config.processHeight <= 0) ? image.height : config.processHeight
        const processWidth = canvas.width
        const processHeight = canvas.height

        //console.log("process image size:", processWidth, processHeight)
        this.canvas.width = processWidth
        this.canvas.height = processHeight
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(canvas, 0, 0, processWidth, processHeight)
        const newImg = ctx.getImageData(0, 0, processWidth, processHeight)


        if (params.type === PoseNetFunctionType.SinglePerson) {
            const prediction = await this.model!.estimateSinglePose(newImg, params.singlePersonParams!)
            return [prediction]
        } else if (params.type === PoseNetFunctionType.MultiPerson) {
            const prediction = await this.model!.estimateMultiplePoses(newImg, params.multiPersonParams!)
            return prediction
        } else { // multi に倒す
            const prediction = await this.model!.estimateMultiplePoses(newImg, params.multiPersonParams!)
            return prediction
        }
    }
}



export class PoseNetWorkerManager {
    private workerPN: Worker | null = null

    private config: PoseNetConfig = generatePoseNetDefaultConfig()
    private localPN = new LocalPN()
    private canvas = document.createElement("canvas")
    init(config: PoseNetConfig | null = null) {
        if (config != null) {
            this.config = config
        }
        if (this.workerPN) {
            this.workerPN.terminate()
        }

//        if (this.config.browserType === BrowserType.SAFARI || this.config.processOnLocal === true) {
        if (this.config.processOnLocal === true) {
            return new Promise((onResolve, onFail) => {
                this.localPN.init(this.config!).then(() => {
                    onResolve()
                })
            })
        }

        this.workerPN = new Worker(this.config.workerPath, { type: 'module' })
        this.workerPN!.postMessage({ message: WorkerCommand.INITIALIZE, config: this.config })
        const p = new Promise((onResolve, onFail) => {
            this.workerPN!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                } else {
                    console.log("Bodypix Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }

    predict(targetCanvas: HTMLCanvasElement, params: PoseNetOperatipnParams = generateDefaultPoseNetParams()) {
        // if (this.config.browserType === BrowserType.SAFARI || this.config.processOnLocal === true) {
        if (this.config.processOnLocal === true) {
            //Case.1 Main thread
                const p = new Promise(async (onResolve: (v: poseNet.Pose[]) => void, onFail) => {
                const prediction = await this.localPN.predict(targetCanvas, this.config, params)
                onResolve(prediction)
            })
            return p
        } else if(this.config.browserType === BrowserType.SAFARI){
            // Case.2 Safari on worker thread
            //// input resolutionにリサイズするのでここでのリサイズはしない
            const data = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height).data
            const uid = performance.now()
            const p = new Promise(async (onResolve: (v: poseNet.Pose[]) => void, onFail) => {

                this.workerPN!.postMessage({
                    message: WorkerCommand.PREDICT, uid: uid,
                    config: this.config,
                    params: params,
                    data: data, width:targetCanvas.width, height:targetCanvas.height
                }, [data.buffer])

                this.workerPN!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                        onResolve(event.data.prediction)
                    } else {
                        console.log("Facemesh Prediction something wrong..")
                        onFail(event)
                    }
                }
            })
            return p
        }else{
            // Case.3 Normal browser on worker thread
            const offscreen = new OffscreenCanvas(targetCanvas.width, targetCanvas.height)
            const offctx = offscreen.getContext("2d")!
            offctx.drawImage(targetCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
            const imageBitmap = offscreen.transferToImageBitmap()
            const uid = performance.now()
            this.workerPN!.postMessage({
                message: WorkerCommand.PREDICT, uid: uid,
                image: imageBitmap,
                config: this.config, params: params
            }, [imageBitmap])
            const p = new Promise((onResolve: (v: poseNet.Pose[]) => void, onFail) => {
                this.workerPN!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                        onResolve(event.data.prediction)
                    } else {
                        console.log("Bodypix Prediction something wrong..")
                        onFail(event)
                    }
                }
            })
            return p
        }
    }
}

//// Utility for Demo
const drawPoints = (canvas: HTMLCanvasElement, prediction: poseNet.Pose) => {
    const keypoints = prediction.keypoints

    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];

        const scaleX = 1
        const scaleY = 1

        const x = keypoint.position.x;
        const y = keypoint.position.y;
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "rgba(0,0,255,0.3)";
        ctx.fillRect(
            x * scaleX,
            y * scaleY,
            6, 6)
    }
}

const drawSkeleton = (canvas: HTMLCanvasElement, prediction: poseNet.Pose) => {
    const adjacentKeyPoints = poseNet.getAdjacentKeyPoints(prediction.keypoints, 0.0)
    // const scaleX = width/this.config.processWidth
    // const scaleY = height/this.config.processHeight
    const scaleX = 1
    const scaleY = 1

    const ctx = canvas.getContext("2d")!
    adjacentKeyPoints.forEach(keypoints => {
        ctx.beginPath();
        ctx.moveTo(keypoints[0].position.x * scaleX, keypoints[0].position.y * scaleY);
        ctx.lineTo(keypoints[1].position.x * scaleX, keypoints[1].position.y * scaleY);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "rgba(255,0,0,0.3)";
        ctx.stroke();
    })
}

export const drawSkeltonAndPoint = (srcCanvas: HTMLCanvasElement, prediction: poseNet.Pose[]) => {
    const canvas = document.createElement("canvas")
    canvas.width = srcCanvas.width
    canvas.height = srcCanvas.height
    prediction.forEach((x: poseNet.Pose) => {
        drawPoints(canvas, x)
        drawSkeleton(canvas, x)
    })
    const imageData = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)
    canvas.remove()
    return imageData
}