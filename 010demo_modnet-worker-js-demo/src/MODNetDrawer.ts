import { MODNetOperationParams } from "@dannadori/modnet-worker-js";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";

export class MODNetDrawer {
    private tmpCanvas = document.createElement("canvas");
    private frontCanvas = document.createElement("canvas");

    private outputCanvas: HTMLCanvasElement | null = null;
    private background: HTMLVideoElement | HTMLImageElement | null = null;

    setBackground = (backgroundSource: MediaStream | string) => {
        if (typeof backgroundSource === "string") {
            const sourceType = getDataTypeOfDataURL(backgroundSource);
            if (sourceType === DataTypesOfDataURL.video) {
                this.background = document.createElement("video");
                this.background.autoplay = true;
                this.background.loop = true;
                this.background.src = backgroundSource;
            } else {
                this.background = document.createElement("img");
                this.background.src = backgroundSource;
            }
        } else {
            this.background = document.createElement("video");
            this.background.autoplay = true;
            this.background.srcObject = backgroundSource;
        }
    };
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (snap: HTMLCanvasElement, params: MODNetOperationParams, prediction: number[][]) => {
        if (!this.background || !this.outputCanvas) {
            console.log("not ready:::", this.background, this.outputCanvas);
            return;
        }
        const res = new ImageData(params.processWidth, params.processHeight);
        try {
            for (let i = 0; i < params.processHeight; i++) {
                for (let j = 0; j < params.processWidth; j++) {
                    const offset = i * params.processWidth + j;
                    res.data[offset * 4 + 0] = 0;
                    res.data[offset * 4 + 1] = 0;
                    res.data[offset * 4 + 2] = 0;
                    res.data[offset * 4 + 3] = prediction![i][j] * 255;
                }
            }
        } catch (exception) {
            console.log("exp1:", exception);
            console.log("exp2:", prediction);
        }

        this.tmpCanvas.width = params.processWidth;
        this.tmpCanvas.height = params.processHeight;
        const tmpCtx = this.tmpCanvas.getContext("2d")!;
        tmpCtx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
        tmpCtx.putImageData(res, 0, 0);

        // Generate front Image
        this.frontCanvas.width = this.outputCanvas.width;
        this.frontCanvas.height = this.outputCanvas.height;
        const frontCtx = this.frontCanvas.getContext("2d")!;
        frontCtx.clearRect(0, 0, this.frontCanvas.width, this.frontCanvas.height);
        frontCtx.drawImage(this.tmpCanvas, 0, 0, this.frontCanvas.width, this.frontCanvas.height);
        frontCtx.globalCompositeOperation = "source-atop";
        frontCtx.drawImage(snap, 0, 0, this.frontCanvas.width, this.frontCanvas.height);
        frontCtx.globalCompositeOperation = "source-over";

        // Generate Output
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(this.background, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(this.frontCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
}
