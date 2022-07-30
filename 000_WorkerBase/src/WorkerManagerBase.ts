import { BlockingQueue } from "./BlockingQueue";
import { BrowserTypes, getBrowserType } from "./BrowserUtil";
import { WorkerCommand, WorkerResponse } from "./const";

export abstract class ImageProcessor {
    abstract init: (config: Config | null) => Promise<void>;
    abstract predict: (config: Config, params: OperationParams, targets: any) => Promise<any>;
}
export type Config = {}
export type OperationParams = {}

export type WorkerManagerBaseInitProps = {
    useWorkerForSafari: boolean;
    processOnLocal: boolean;
    workerJs?: () => Worker;
};

export abstract class WorkerManagerBase {
    abstract imageProcessor: ImageProcessor;
    worker: Worker | null = null;

    abstract init: (config: Config | null) => Promise<void>;
    abstract predict: (params: OperationParams, targets: any) => Promise<any>;

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

    initCommon = async (props: WorkerManagerBaseInitProps, config: Config) => {
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

    sendToWorker = async (params: OperationParams, data: any, transferable = true) => {
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
}
