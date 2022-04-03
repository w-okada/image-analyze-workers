import { AnnotatedPrediction, FacemeshOperatipnParams } from "@dannadori/facemesh-worker-js";
import { FacemeshRenderer } from "./FaceswapRenderer";

export class FaceswapDrawer {
    private webGLCanvas: HTMLCanvasElement = document.createElement("canvas");
    private outputCanvas: HTMLCanvasElement | null = null;

    private facemeshRenderer: FacemeshRenderer | null = null;

    private maskImage?: HTMLCanvasElement;
    private maskPrediction?: AnnotatedPrediction[];

    setTestCanvas = (testCanvas: HTMLCanvasElement) => {
        this.webGLCanvas = testCanvas;
    };

    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
        console.log(this.outputCanvas);
    };
    setMask(maskImage: HTMLCanvasElement, maskPrediction: AnnotatedPrediction[], params: FacemeshOperatipnParams) {
        if (!this.outputCanvas) {
            console.warn("set mask: not initialized");
            return;
        }

        this.webGLCanvas.width = this.outputCanvas.width;
        this.webGLCanvas.height = this.outputCanvas.height;
        this.facemeshRenderer = new FacemeshRenderer(this.webGLCanvas.getContext("webgl")!, this.webGLCanvas.width, this.webGLCanvas.height);

        this.maskImage = maskImage;
        this.maskPrediction = maskPrediction;
        this.facemeshRenderer.setMask(this.webGLCanvas.getContext("webgl")!, this.maskImage, this.maskPrediction, params.processWidth, params.processHeight);
    }

    swapFace(videoFrame: HTMLCanvasElement, maskPrediction: AnnotatedPrediction[], scaleX: number, scaleY: number) {
        if (!this.facemeshRenderer || !this.outputCanvas) {
            console.warn("swap face: not initialized");
            return;
        }

        if (this.maskImage) {
            const gl = this.webGLCanvas.getContext("webgl")!;

            this.facemeshRenderer.drawFacemesh(gl, videoFrame, maskPrediction, scaleX, scaleY);
            // this.facemeshRenderer.drawFacemesh(gl, videoFrame, maskPrediction, 1, 1);
        }
        const ctx = this.outputCanvas!.getContext("2d")!;
        // ctx.fillStyle = "rgba(0,0,0,0.0)";
        // ctx.fillStyle = "rgba(0,0,0,0.50)";
        ctx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        // ctx.fillRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        // ctx.fillRect(0, 0, 100, 100);
        ctx.drawImage(this.webGLCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        // return this.glCanvasOut;
        // return ctx.getImageData(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
    }
}
