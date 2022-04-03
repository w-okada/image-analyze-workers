import { BodypixFunctionTypes, BodyPixOperatipnParams, PartSegmentation, PersonSegmentation, SemanticPartSegmentation, SemanticPersonSegmentation } from "@dannadori/bodypix-worker-js";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";

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

export class BodyPixDrawer {
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

    drawSegmentation = (snap: HTMLCanvasElement, prediction: SemanticPersonSegmentation) => {
        if (!this.background || !this.outputCanvas) {
            console.log("not ready:::", this.background, this.outputCanvas);
            return;
        }
        const image = new ImageData(prediction.width, prediction.height);
        for (let i = 0; i < prediction.data.length; i++) {
            if (prediction.data[i] === 0) {
                image.data[i * 4 + 0] = 0;
                image.data[i * 4 + 1] = 0;
                image.data[i * 4 + 2] = 0;
                image.data[i * 4 + 3] = 0;
            } else {
                image.data[i * 4 + 0] = 255;
                image.data[i * 4 + 1] = 255;
                image.data[i * 4 + 2] = 255;
                image.data[i * 4 + 3] = 255;
            }
        }
        this.tmpCanvas.width = prediction.width;
        this.tmpCanvas.height = prediction.height;
        this.tmpCanvas.getContext("2d")!.putImageData(image, 0, 0);

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

    drawParts = async (snap: HTMLCanvasElement, prediction: SemanticPartSegmentation) => {
        if (!this.background || !this.outputCanvas) {
            console.log("not ready:::", this.background, this.outputCanvas);
            return;
        }

        // generate mask
        const image = new ImageData(prediction.width, prediction.height);
        for (let i = 0; i < prediction.data.length; i++) {
            const flag = prediction.data[i];
            if (flag === -1) {
                image.data[i * 4 + 0] = 0;
                image.data[i * 4 + 1] = 0;
                image.data[i * 4 + 2] = 0;
                image.data[i * 4 + 3] = 0;
            } else {
                image.data[i * 4 + 0] = rainbow[flag][0];
                image.data[i * 4 + 1] = rainbow[flag][1];
                image.data[i * 4 + 2] = rainbow[flag][2];
                image.data[i * 4 + 3] = 100;
            }
        }
        this.tmpCanvas.width = prediction.width;
        this.tmpCanvas.height = prediction.height;
        this.tmpCanvas.getContext("2d")!.putImageData(image, 0, 0);

        // Generate Output
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
    drawMultiSegmentation = async (snap: HTMLCanvasElement, prediction: PersonSegmentation[]) => {
        if (!this.background || !this.outputCanvas) {
            console.log("not ready:::", this.background, this.outputCanvas);
            return;
        }

        const tmpCtx = this.tmpCanvas.getContext("2d")!;
        tmpCtx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
        if (prediction.length > 0) {
            // generate mask
            //// First ALL CLEAR
            if (!prediction[0].width) {
                return;
            }
            const image = new ImageData(prediction[0].width, prediction[0].height);
            image.data.fill(0);

            //// THEN draw each person segment
            prediction.forEach((x) => {
                for (let i = 0; i < x.data.length; i++) {
                    if (x.data[i] !== 0) {
                        image.data[i * 4 + 0] = 255;
                        image.data[i * 4 + 1] = 255;
                        image.data[i * 4 + 2] = 255;
                        image.data[i * 4 + 3] = 255;
                    }
                }
            });

            this.tmpCanvas.width = prediction[0].width;
            this.tmpCanvas.height = prediction[0].height;
            tmpCtx.putImageData(image, 0, 0);
        }

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

    drawMultiPersonParts = async (snap: HTMLCanvasElement, prediction: PartSegmentation[]) => {
        if (!this.background || !this.outputCanvas) {
            console.log("not ready:::", this.background, this.outputCanvas);
            return;
        }

        const tmpCtx = this.tmpCanvas.getContext("2d")!;
        tmpCtx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
        if (prediction.length > 0) {
            if (!prediction[0].width) {
                return;
            }
            const image = new ImageData(prediction[0].width, prediction[0].height);
            image.data.fill(0);

            //// THEN draw each person segment
            prediction.forEach((x) => {
                for (let i = 0; i < x.data.length; i++) {
                    const flag = x.data[i];
                    if (flag !== -1) {
                        image.data[i * 4 + 0] = rainbow[flag][0];
                        image.data[i * 4 + 1] = rainbow[flag][1];
                        image.data[i * 4 + 2] = rainbow[flag][2];
                        image.data[i * 4 + 3] = 100;
                    }
                }
            });
            this.tmpCanvas.width = prediction[0].width;
            this.tmpCanvas.height = prediction[0].height;
            tmpCtx.putImageData(image, 0, 0);
        }

        // Generate Output
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
    draw = (snap: HTMLCanvasElement, params: BodyPixOperatipnParams, prediction: SemanticPersonSegmentation | SemanticPartSegmentation | PersonSegmentation[] | PartSegmentation[]) => {
        switch (params.type) {
            case BodypixFunctionTypes.SegmentPerson:
                this.drawSegmentation(snap, prediction as SemanticPersonSegmentation);
                break;
            case BodypixFunctionTypes.SegmentPersonParts:
                this.drawParts(snap, prediction as SemanticPartSegmentation);
                break;
            case BodypixFunctionTypes.SegmentMultiPerson:
                this.drawMultiSegmentation(snap, prediction as PersonSegmentation[]);
                break;
            case BodypixFunctionTypes.SegmentMultiPersonParts:
                this.drawMultiPersonParts(snap, prediction as PartSegmentation[]);
                break;
            default:
                break;
        }
    };
}
