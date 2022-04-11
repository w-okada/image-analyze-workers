import { OpenCVOperationParams } from "@dannadori/opencv-worker-js";

export class OpenCVDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (_snap: HTMLCanvasElement, params: OpenCVOperationParams, prediction: Uint8ClampedArray): void => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const converted = new ImageData(prediction, params.processWidth, params.processHeight);
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.putImageData(converted, 0, 0);
    };
}
