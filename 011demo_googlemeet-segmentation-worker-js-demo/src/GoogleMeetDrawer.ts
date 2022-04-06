import { GoogleMeetSegmentationOperationParams } from "@dannadori/googlemeet-segmentation-worker-js/dist/const";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";

export class GoogleMeetDrawer {
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

    draw = (snap: HTMLCanvasElement, params: GoogleMeetSegmentationOperationParams, lightWrapping: number, prediction: Uint8ClampedArray) => {
        if (!this.background || !this.outputCanvas) {
            console.log("not ready:::", this.background, this.outputCanvas);
            return;
        }

        // console.log("DARAW", prediction, params.processWidth, params.processHeight);
        const mask = new ImageData(prediction, params.processWidth, params.processHeight);
        this.tmpCanvas.width = params.processWidth;
        this.tmpCanvas.height = params.processHeight;
        this.tmpCanvas.getContext("2d")!.putImageData(mask, 0, 0);

        const frontCtx = this.frontCanvas.getContext("2d")!;
        frontCtx.clearRect(0, 0, this.frontCanvas.width, this.frontCanvas.height);
        frontCtx.drawImage(this.tmpCanvas, 0, 0, this.frontCanvas.width, this.frontCanvas.height);
        frontCtx.globalCompositeOperation = "source-atop";
        frontCtx.drawImage(snap, 0, 0, this.frontCanvas.width, this.frontCanvas.height);
        frontCtx.globalCompositeOperation = "source-over";

        // 最終書き込み
        const outputCtx = this.outputCanvas.getContext("2d")!;
        //// クリア or 背景描画
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(this.background, 0, 0, this.outputCanvas.width, this.outputCanvas.height);

        //// light Wrapping
        outputCtx.filter = `blur(${lightWrapping}px)`;
        outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.filter = "none";

        // 前景書き込み
        outputCtx.drawImage(this.frontCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
}
