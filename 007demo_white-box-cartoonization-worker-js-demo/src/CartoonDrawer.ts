import { CartoonOperationParams } from "@dannadori/white-box-cartoonization-worker-js";

export class CartoonDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    private tmpCanvas = document.createElement("canvas");
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (_snap: HTMLCanvasElement, params: CartoonOperationParams, prediction: Uint8ClampedArray): void => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const converted = new ImageData(prediction, params.processWidth, params.processHeight);
        this.tmpCanvas.width = params.processWidth;
        this.tmpCanvas.height = params.processHeight;
        this.tmpCanvas.getContext("2d")!.putImageData(converted, 0, 0);

        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
}
