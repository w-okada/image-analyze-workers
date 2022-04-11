import { BisenetV2CelebAMaskOperationParams } from "@dannadori/bisenetv2-celebamask-worker-js";
export const rainbow = [
    [110, 64, 170],
    [143, 61, 178],
    [178, 60, 178],
    [210, 62, 167],
    [238, 67, 149],
    [255, 78, 125],
    [255, 94, 99],
    [255, 115, 75],
    [255, 140, 56],
    [239, 167, 47],
    [217, 194, 49],
    [194, 219, 64],
    [175, 240, 91],
    [135, 245, 87],
    [96, 247, 96],
    [64, 243, 115],
    [40, 234, 141],
    [28, 219, 169],
    [26, 199, 194],
    [33, 176, 213],
    [47, 150, 224],
    [65, 125, 224],
    [84, 101, 214],
    [99, 81, 195],
];

export class BisenetV2CelebAMaskDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    private tmpCanvas = document.createElement("canvas");
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (snap: HTMLCanvasElement, _params: BisenetV2CelebAMaskOperationParams, prediction: number[][]): void => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const outputCtx = this.outputCanvas.getContext("2d")!;

        this.tmpCanvas.width = prediction[0].length;
        this.tmpCanvas.height = prediction.length;
        const data = new ImageData(this.tmpCanvas.width, this.tmpCanvas.height);
        for (let rowIndex = 0; rowIndex < this.tmpCanvas.height; rowIndex++) {
            for (let colIndex = 0; colIndex < this.tmpCanvas.width; colIndex++) {
                const pix_offset = (rowIndex * this.tmpCanvas.width + colIndex) * 4;

                data.data[pix_offset + 0] = 128;
                data.data[pix_offset + 1] = rainbow[prediction[rowIndex][colIndex]][0];
                data.data[pix_offset + 2] = rainbow[prediction[rowIndex][colIndex]][1];
                data.data[pix_offset + 3] = rainbow[prediction[rowIndex][colIndex]][2];
            }
        }
        this.tmpCanvas.getContext("2d")!.putImageData(data, 0, 0);

        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
}
