import { Coords3D, FacemeshOperationParams } from "@dannadori/facemesh-worker-js";
import { FacemeshRenderer } from "./FaceswapRenderer";

export class FaceswapDrawer {
    private webGLCanvas: HTMLCanvasElement = document.createElement("canvas");
    private outputCanvas: HTMLCanvasElement | null = null;

    private facemeshRenderer: FacemeshRenderer | null = null;

    private maskImage?: HTMLCanvasElement;
    private maskKeypoints?: Coords3D;

    setTestCanvas = (testCanvas: HTMLCanvasElement) => {
        this.webGLCanvas = testCanvas;
    };

    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
        console.log(this.outputCanvas);
    };
    setMask(maskImage: HTMLCanvasElement, maskKeypoints: Coords3D, params: FacemeshOperationParams) {
        if (!this.outputCanvas) {
            console.warn("set mask: not initialized");
            return;
        }

        this.webGLCanvas.width = this.outputCanvas.width;
        this.webGLCanvas.height = this.outputCanvas.height;
        this.facemeshRenderer = new FacemeshRenderer(this.webGLCanvas.getContext("webgl")!, this.webGLCanvas.width, this.webGLCanvas.height);

        this.maskImage = maskImage;
        this.maskKeypoints = maskKeypoints;
        this.facemeshRenderer.setMask(this.webGLCanvas.getContext("webgl")!, this.maskImage, this.maskKeypoints, params.processWidth, params.processHeight);
    }

    swapFace(videoFrame: HTMLCanvasElement, keypoints: Coords3D, scaleX: number, scaleY: number) {
        if (!this.facemeshRenderer || !this.outputCanvas) {
            console.warn("swap face: not initialized");
            return;
        }

        if (this.maskImage) {
            const gl = this.webGLCanvas.getContext("webgl")!;

            this.facemeshRenderer.drawFacemesh(gl, videoFrame, keypoints, scaleX, scaleY);
        }
        const ctx = this.outputCanvas!.getContext("2d")!;
        ctx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        ctx.drawImage(this.webGLCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    }
}
