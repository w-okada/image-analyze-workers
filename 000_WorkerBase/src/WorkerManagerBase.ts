import { BlockingQueue } from "./BlockingQueue";
import { BrowserTypes, getBrowserType } from "./BrowserUtil";
import { WorkerCommand, WorkerResponse } from "./const";

export type Config = {}
export type OperationParams = {}

export abstract class ImageProcessor<T extends Config, S extends OperationParams> {
    abstract init: (config: T) => Promise<void>;
    abstract predict: (config: T, params: S, targets: any) => Promise<any>;
}

export type WorkerManagerBaseInitProps = {
    useWorkerForSafari: boolean;
    processOnLocal: boolean;
    workerJs?: () => Worker;
};

export abstract class WorkerManagerBase<T extends Config, S extends OperationParams>  {
    abstract imageProcessor: ImageProcessor<T, S>;
    worker: Worker | null = null;

    abstract init: (config: T) => Promise<void>;
    abstract predict: (params: S, targets: any) => Promise<any>;

    sem = new BlockingQueue<number>();

    constructor() {
        this.sem.enqueue(0);
    }

    lock = async () => {
        const num = await this.sem.dequeue();
        return num;
    };
    unlock = (num: number) => {
        this.sem.enqueue(num + 1);
    };

    initCommon = async (props: WorkerManagerBaseInitProps, config: T) => {
        const num = await this.lock();
        if (this.worker) {
            this.worker.terminate();
        }
        this.worker = null;

        if (this.useWorker(props) === false) {
            await this.imageProcessor.init(config);
            this.unlock(num);
            return;
        }

        const newWorker: Worker = props.workerJs!();

        const p = new Promise<void>((resolve, reject) => {
            newWorker.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    this.worker = newWorker;
                    resolve();
                } else {
                    console.log("Initialization something wrong..");
                    reject();
                }
            };
            newWorker.postMessage({
                message: WorkerCommand.INITIALIZE,
                config: config,
            });
        });
        try {
            await p;
        } catch (err) {
            console.log("worker initialize error");
        } finally {
            this.unlock(num);
        }
        return;
    };

    generateImageBitmap = (target: HTMLCanvasElement | HTMLVideoElement, width: number, height: number) => {
        if (target.width <= 0 || target.height <= 0) {
            console.log("target canvas|videois invalid", target);
            throw new Error("target canvas|video is invalid");
        }
        const offscreen = new OffscreenCanvas(width, height);
        const offctx = offscreen.getContext("2d")!;
        offctx.drawImage(target, 0, 0, width, height);
        const imageBitmap = offscreen.transferToImageBitmap();
        return imageBitmap;
    };

    private targetCanvas: HTMLCanvasElement = document.createElement("canvas");
    generateTargetCanvas = (target: HTMLCanvasElement | HTMLVideoElement, width: number, height: number) => {
        if (target.width <= 0 || target.height <= 0) {
            console.log("target canvas|videois invalid", target);
            throw new Error("target canvas|video is invalid");
        }
        this.targetCanvas.width = width;
        this.targetCanvas.height = height;
        const ctx = this.targetCanvas.getContext("2d")!;
        ctx.drawImage(target, 0, 0, width, height);
        return this.targetCanvas;
    };

    sendToWorker = async (params: S, data: any, transferable = true) => {
        if (this.sem.length > 100) {
            throw new Error(`queue is fulled: ${this.sem.length}`);
        }
        const num = await this.lock();
        const p = new Promise((resolve, reject) => {
            if (!this.worker) {
                throw new Error("worker is not activated.");
            }
            this.worker!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.PREDICTED) {
                    resolve(event.data.prediction);
                } else {
                    console.log("Prediction something wrong..", event.data.message);
                    reject(event);
                }
            };
            if (transferable) {
                if (data instanceof Uint8ClampedArray) {
                    this.worker!.postMessage(
                        {
                            message: WorkerCommand.PREDICT,
                            // config: config,
                            params: params,
                            data: data,
                        },
                        [data.buffer]
                    );
                } else {
                    this.worker!.postMessage(
                        {
                            message: WorkerCommand.PREDICT,
                            // config: config,
                            params: params,
                            data: data,
                        },
                        [data]
                    );
                }
            } else {
                this.worker!.postMessage({
                    message: WorkerCommand.PREDICT,
                    // config: config,
                    params: params,
                    data: data,
                });
            }
        });
        let prediction;
        try {
            prediction = await p;
        } catch (error) {
            console.log("worker prediction error. :", error);
        } finally {
            this.unlock(num);
        }
        return prediction;
    };

    private useWorker = (props: WorkerManagerBaseInitProps) => {
        if (props.processOnLocal) {
            return false;
        } else if (props.useWorkerForSafari === false && getBrowserType() === BrowserTypes.SAFARI) {
            return false;
        } else {
            return true;
        }
    };



    fetchData = async (url: string) => {
        if (url.startsWith("data:")) {
            const data = url.split(",")[1]
            return Buffer.from(data, "base64");
        }

        const res = await fetch(url, {
            method: "GET"
        });
        return await res.arrayBuffer()
    };
}




export type WorkerDispatcherCallbacks<T extends Config, S extends OperationParams> = {
    init: (config: T) => Promise<ImageProcessor<T, S>>
    // predict: (config: T, params: S, data: any) => Promise<any>
}
export class WorkerDispatcher<T extends Config, S extends OperationParams> {

    imageProcessor: ImageProcessor<T, S> | null = null
    config: T | null = null;
    callbacks: WorkerDispatcherCallbacks<T, S> | null = null;
    context: any
    constructor(context: any) {
        this.context = context
    }

    setCallback = (callbacks: WorkerDispatcherCallbacks<T, S>) => {
        this.callbacks = callbacks
    }

    dispach = async (event: any) => {
        if (!this.callbacks) {
            console.warn("[worker] Dispatcher callbacks is not initialized")
            return
        }
        if (!this.config) {
            console.warn("[worker] Dispatcher config is not initialized")
            return
        }
        if (event.data.message === WorkerCommand.INITIALIZE) {
            this.config = event.data.config as T;
            this.imageProcessor = await this.callbacks.init(this.config)
            this.context.postMessage({ message: WorkerResponse.INITIALIZED });
        } else if (event.data.message === WorkerCommand.PREDICT) {
            if (!this.imageProcessor) {
                console.warn("[worker] ImageProcessor is not initialized")
                return
            }
            const params = event.data.params as S;
            const data: Uint8ClampedArray = event.data.data;

            const prediction = this.imageProcessor.predict(this.config, params, data)

            this.context.postMessage({
                message: WorkerResponse.PREDICTED,
                prediction: prediction,
            });
        }
    }
}