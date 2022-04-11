import { HandPoseOperationParams, AnnotatedPrediction, FingerLookupIndices } from "@dannadori/handpose-worker-js";

export class HandPoseDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (snap: HTMLCanvasElement, params: HandPoseOperationParams, prediction: AnnotatedPrediction[]): void => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const outputCtx = this.outputCanvas.getContext("2d")!;

        const scaleX = this.outputCanvas.width / params.processWidth;
        const scaleY = this.outputCanvas.height / params.processHeight;
        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        prediction.forEach((x) => {
            const landmarks = x.landmarks as number[][];
            landmarks.forEach((landmark) => {
                const x = landmark[0] * scaleX;
                const y = landmark[1] * scaleY;
                outputCtx.fillRect(x, y, 5, 5);
            });
            const fingers = Object.keys(FingerLookupIndices);
            fingers.forEach((x) => {
                const points = FingerLookupIndices[x].map((idx) => landmarks[idx]);

                outputCtx.beginPath();
                outputCtx.moveTo(points[0][0] * scaleX, points[0][1] * scaleY);
                for (let i = 1; i < points.length; i++) {
                    const point = points[i];
                    outputCtx.lineTo(point[0] * scaleX, point[1] * scaleY);
                }
                outputCtx.lineWidth = 3;
                outputCtx.stroke();
                outputCtx.closePath();
            });
        });
    };
}
