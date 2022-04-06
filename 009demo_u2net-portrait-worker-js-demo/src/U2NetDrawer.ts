import { U2NetPortraitOperationParams } from "@dannadori/u2net-portrait-worker-js";

export class U2NetDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    private tmpCanvas = document.createElement("canvas");
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (snap: Uint8ClampedArray | null, params: U2NetPortraitOperationParams, useBlurBlend: boolean, blurAlpha: number, prediction: Float32Array | number[][]): void => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        this.tmpCanvas.width = params.processWidth;
        this.tmpCanvas.height = params.processHeight;

        if (useBlurBlend) {
            const blurImage = new ImageData(snap!, params.processWidth, params.processHeight);
            this.tmpCanvas.getContext("2d")!.putImageData(blurImage, 0, 0);
            outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        }

        const data = new ImageData(params.processWidth, params.processHeight);
        if (prediction instanceof Float32Array) {
            for (let rowIndex = 0; rowIndex < data.height; rowIndex++) {
                for (let colIndex = 0; colIndex < data.width; colIndex++) {
                    const pix_offset = (rowIndex * data.width + colIndex) * 4;
                    if (prediction[rowIndex + colIndex * data.width] > 0.0001) {
                        data.data[pix_offset + 0] = 255 - prediction[rowIndex + colIndex * data.width] * 255;
                        data.data[pix_offset + 1] = 255 - prediction[rowIndex + colIndex * data.width] * 255;
                        data.data[pix_offset + 2] = 255 - prediction[rowIndex + colIndex * data.width] * 255;
                        data.data[pix_offset + 3] = blurAlpha;
                    } else {
                        data.data[pix_offset + 0] = 255;
                        data.data[pix_offset + 1] = 255;
                        data.data[pix_offset + 2] = 255;
                        data.data[pix_offset + 3] = blurAlpha;
                    }
                }
            }
        } else {
            for (let rowIndex = 0; rowIndex < data.height; rowIndex++) {
                for (let colIndex = 0; colIndex < data.width; colIndex++) {
                    const pix_offset = (rowIndex * data.width + colIndex) * 4;
                    if (prediction[rowIndex][colIndex] > 0.0001) {
                        data.data[pix_offset + 0] = 255 - prediction[rowIndex][colIndex] * 255;
                        data.data[pix_offset + 1] = 255 - prediction[rowIndex][colIndex] * 255;
                        data.data[pix_offset + 2] = 255 - prediction[rowIndex][colIndex] * 255;
                        data.data[pix_offset + 3] = blurAlpha;
                    } else {
                        data.data[pix_offset + 0] = 255;
                        data.data[pix_offset + 1] = 255;
                        data.data[pix_offset + 2] = 255;
                        data.data[pix_offset + 3] = blurAlpha;
                    }
                }
            }
        }
        this.tmpCanvas.getContext("2d")!.putImageData(data, 0, 0);
        outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
}
