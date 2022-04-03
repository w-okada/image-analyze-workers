import { OpenCVOperatipnParams } from "@dannadori/opencv-worker-js";

export class OpenCVDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    // private tmpCanvas = document.createElement("canvas");
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (_snap: HTMLCanvasElement, params: OpenCVOperatipnParams, prediction: Uint8ClampedArray): void => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const converted = new ImageData(prediction, params.processWidth, params.processHeight);
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.putImageData(converted, 0, 0);

        // const tmpCtx = this.tmpCanvas.getContext("2d")!;
        // tmpCtx.font = params.fontSize + "px monospace";
        // tmpCtx.textBaseline = "top";
        // this.tmpCanvas.width = tmpCtx.measureText(prediction[0]).width;
        // this.tmpCanvas.height = prediction.length * params.fontSize;
        // tmpCtx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
        // tmpCtx.fillStyle = "rgb(0, 0, 0)";
        // tmpCtx.font = params.fontSize + "px monospace";
        // for (let n = 0; n < prediction.length; n++) {
        //     tmpCtx.fillText(prediction[n], 0, n * params.fontSize);
        // }

        // const outputCtx = this.outputCanvas.getContext("2d")!;
        // outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        // outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
}
