import { AsciiOperationParams } from "@dannadori/asciiart-worker-js";

export class AsciiArtDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    private outputDiv: HTMLDivElement | null = null;
    private outputDivHeight = 512;
    private tmpCanvas = document.createElement("canvas");
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };
    setOutputDiv = (outputDiv: HTMLDivElement, outputDivHeight = 512) => {
        this.outputDivHeight = outputDivHeight;
        this.outputDiv = outputDiv;
    };

    draw = (_snap: HTMLCanvasElement, params: AsciiOperationParams, prediction: string[]): void => {
        if (!this.outputCanvas || !this.outputDiv) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const tmpCtx = this.tmpCanvas.getContext("2d")!;
        tmpCtx.font = params.fontSize + "px monospace";
        tmpCtx.textBaseline = "top";
        this.tmpCanvas.width = tmpCtx.measureText(prediction[0]).width;
        this.tmpCanvas.height = prediction.length * params.fontSize;
        tmpCtx.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
        tmpCtx.fillStyle = "rgb(0, 0, 0)";
        tmpCtx.font = params.fontSize + "px monospace";
        for (let n = 0; n < prediction.length; n++) {
            tmpCtx.fillText(prediction[n], 0, n * params.fontSize);
        }

        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(this.tmpCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);

        const charCount = prediction[0].length;
        const fontSize = Math.ceil(this.outputDivHeight / charCount);
        const a = prediction.reduce((a, n) => {
            return a + "\n" + n + "";
        });
        this.outputDiv.innerHTML = `<pre style="font-size: ${fontSize}px;">${a}</pre>`;
    };
}
