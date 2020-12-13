import { HandPoseConfig, HandPoseOperatipnParams, HandPoseFunctionType, WorkerCommand, WorkerResponse } from "./const"
import { getBrowserType, BrowserType } from "./BrowserUtil"
import * as handpose from "@tensorflow-models/handpose";
import * as tf from '@tensorflow/tfjs';
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';

export const generateHandPoseDefaultConfig = (): HandPoseConfig => {
    const defaultConf: HandPoseConfig = {
        browserType: getBrowserType(),
        model: {
            maxContinuousChecks: Infinity,
            detectionConfidence: 0.8,
            iouThreshold: 0.3,
            scoreThreshold: 0.75
        },
        useTFWasmBackend: false,
        processOnLocal: false,
        modelReloadInterval: 1024 * 60,
        wasmPath: "/tfjs-backend-wasm.wasm",
        workerPath: "./handpose-worker-worker.js"

    }
    // WASMバージョンがあまり早くないので、Safariはローカルで実施をデフォルトにする。
    if (defaultConf.browserType == BrowserType.SAFARI) {
        defaultConf.processOnLocal = true
    }

    return defaultConf
}

export const generateDefaultHandPoseParams = () => {
    const defaultParams: HandPoseOperatipnParams = {
        type: HandPoseFunctionType.EstimateHands,
        estimateHands: {
            flipHorizontal: false,
        },
        processWidth: 300,
        processHeight: 300,
    }
    return defaultParams
}

export class LocalHP {
    model: handpose.HandPose | null = null
    canvas: HTMLCanvasElement = (() => {
        const newCanvas = document.createElement("canvas")
        newCanvas.style.display = "none"
        //document!.getRootNode()!.lastChild!.appendChild(newCanvas)
        return newCanvas
    })()

    init = (config: HandPoseConfig) => {
        return handpose.load(config.model).then(res => {
            console.log("handpose loaded locally", config)
            this.model = res
            return
        })
    }


    predict = async (targetCanvas: HTMLCanvasElement, config: HandPoseConfig, params: HandPoseOperatipnParams): Promise<any> => {
        console.log("current backend[main thread]:",tf.getBackend())
        // ImageData作成  
        const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? targetCanvas.width : params.processWidth
        const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? targetCanvas.height : params.processHeight

        this.canvas.width = processWidth
        this.canvas.height = processHeight
        const ctx = this.canvas.getContext("2d")!
        ctx.drawImage(targetCanvas, 0, 0, processWidth, processHeight)
        const newImg = ctx.getImageData(0, 0, processWidth, processHeight)

        const prediction = await this.model!.estimateHands(newImg)
        return prediction
    }
}

export class HandPoseWorkerManager {
    private workerHP: Worker | null = null
    private canvas = document.createElement("canvas")

    private config = generateHandPoseDefaultConfig()
    private localHP = new LocalHP()

    private initializeModel_internal = () => {
        this.workerHP = new Worker(this.config.workerPath, { type: 'module' })
        this.workerHP!.postMessage({ message: WorkerCommand.INITIALIZE, config: this.config })
        const p = new Promise<void>((onResolve, onFail) => {
            this.workerHP!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                } else {
                    console.log("Handpose Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }
    init = (config: HandPoseConfig | null) => {
        if (config != null) {
            this.config = config
        }

        if (this.workerHP) {
            this.workerHP.terminate()
        }

        // run on main thread
        //// wasm on safari is not enough fast, but run on main thread is not mandatory
        if (this.config.processOnLocal === true) {
            return new Promise<void>((onResolve, onFail) => {
                let p
                if (this.config.useTFWasmBackend) {
                    console.log("use wasm backend", this.config.wasmPath)
                    require('@tensorflow/tfjs-backend-wasm')
                    setWasmPath(this.config.wasmPath)
                    p = tf.setBackend("wasm")
                } else {
                    console.log("use webgl backend")
                    require('@tensorflow/tfjs-backend-webgl')
                    p = tf.setBackend("webgl")
                }
                
                p.then(()=>{
                    tf.ready().then(() => {
                        this.localHP!.init(this.config!).then(() => {
                            onResolve()
                        })
                    })
                })
            })
        }

        // run on worker thread
        return this.initializeModel_internal()
    }


    model_reload_interval = 0
    model_refresh_counter = 0
    private liveCheck = () => {
        if (this.model_refresh_counter > this.config.modelReloadInterval && this.config.modelReloadInterval > 0) {
            console.log("reload model! this is a work around for memory leak.")
            this.model_refresh_counter = 0
            if (this.config.browserType === BrowserType.SAFARI && this.config.processOnLocal === true) {
                return new Promise<void>((onResolve, onFail) => {
                    tf.ready().then(() => {
                        this.localHP.init(this.config!).then(() => {
                            onResolve()
                        })
                    })
                })
            } else {
                this.workerHP?.terminate()
                return this.initializeModel_internal()
            }
        } else {
            this.model_refresh_counter += 1
        }
    }


    predict = (targetCanvas: HTMLCanvasElement, params: HandPoseOperatipnParams) => {
        if (this.config.processOnLocal === true) {
            const p = new Promise(async (onResolve: (v: any) => void, onFail) => {
                await this.liveCheck()
                const prediction = await this.localHP.predict(targetCanvas, this.config, params)
                onResolve(prediction)
            })
            return p
        } else if (this.config.browserType == BrowserType.SAFARI) {
            // safariはwebworkerでcanvas(offscreencanvas)が使えないので、縮小・拡大が面倒。ここでやっておく。
            let data: Uint8ClampedArray
            if (params.processHeight > 0 && params.processWidth > 0) {
                this.canvas.width = params.processWidth
                this.canvas.height = params.processHeight
                this.canvas.getContext("2d")!.drawImage(targetCanvas, 0, 0, params.processWidth, params.processHeight)
                data = this.canvas.getContext("2d")!.getImageData(0, 0, params.processWidth, params.processHeight).data
            } else {
                const ctx = targetCanvas.getContext("2d")!
                data = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)!.data
            }
            const uid = performance.now()
            const p = new Promise(async (onResolve: (v: any) => void, onFail) => {
                await this.liveCheck()

                this.workerHP!.postMessage({
                    message: WorkerCommand.PREDICT, uid: uid,
                    config: this.config,
                    params: params,
                    data: data
                }, [data.buffer])

                this.workerHP!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                        onResolve(event.data.prediction)
                    } else {
                        console.log("Handpose Prediction something wrong..")
                        onFail(event)
                    }
                }
            })
            return p
        } else {
            const offscreen = new OffscreenCanvas(targetCanvas.width, targetCanvas.height)
            const offctx = offscreen.getContext("2d")!
            offctx.drawImage(targetCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
            const imageBitmap = offscreen.transferToImageBitmap()

            const uid = performance.now()
            const p = new Promise(async (onResolve: (v: any) => void, onFail) => {
                await this.liveCheck()
                this.workerHP!.postMessage({
                    message: WorkerCommand.PREDICT, uid: uid,
                    config: this.config,
                    params: params,
                    image: imageBitmap
                }, [imageBitmap])

                this.workerHP!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                        onResolve(event.data.prediction)
                    } else {
                        console.log("Handpose Prediction something wrong..")
                        onFail(event)
                    }
                }
            })
            return p
        }
    }
}

const fingerLookupIndices: { [key: string]: number[] } = {
    "thumb": [0, 1, 2, 3, 4],
    "indexFinger": [0, 5, 6, 7, 8],
    "middleFinger": [0, 9, 10, 11, 12],
    "ringFinger": [0, 13, 14, 15, 16],
    "pinky": [0, 17, 18, 19, 20]
}

export const drawHandSkelton = (srcCanvas: HTMLCanvasElement, prediction: any, params: HandPoseOperatipnParams) => {
    const canvas = document.createElement("canvas")
    canvas.width = srcCanvas.width
    canvas.height = srcCanvas.height
    const ctx = canvas.getContext("2d")!

    const scaleX = srcCanvas.width / params.processWidth
    const scaleY = srcCanvas.height / params.processHeight
    prediction.forEach((x: any) => {
        const landmarks = x.landmarks as number[][]
        landmarks.forEach(landmark => {
            const x = landmark[0] * scaleX
            const y = landmark[1] * scaleY
            ctx.fillRect(x, y, 5, 5)
        })

        const fingers = Object.keys(fingerLookupIndices);
        fingers.forEach(x => {
            const points = fingerLookupIndices[x].map(idx => landmarks[idx])

            ctx.beginPath();
            ctx.moveTo(points[0][0] * scaleX, points[0][1] * scaleY);
            for (let i = 1; i < points.length; i++) {
                const point = points[i];
                ctx.lineTo(point[0] * scaleX, point[1] * scaleY);
            }
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
        })
    })

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    canvas.remove()
    return image
}
