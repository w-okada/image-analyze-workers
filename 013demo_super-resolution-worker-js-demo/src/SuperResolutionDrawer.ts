import { SuperResolutionConfig, SuperResolutionOperationParams } from "@dannadori/super-resolution-worker-js";

export class SuperResolutionDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;

    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (_snap: HTMLCanvasElement, config: SuperResolutionConfig, params: SuperResolutionOperationParams, prediction: Uint8Array | Uint8ClampedArray) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const scaleFactor = config.scaleFactor[config.modelKey];
        const resizedImage = new ImageData(new Uint8ClampedArray(prediction), params.processWidth * scaleFactor, params.processHeight * scaleFactor);
        this.outputCanvas.width = resizedImage.width;
        this.outputCanvas.height = resizedImage.height;
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.putImageData(resizedImage, 0, 0);
    };
}
