import { getAdjacentKeyPoints, Pose, PoseNetOperationParams } from "@dannadori/posenet-worker-js";

export class PoseNetDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;
    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (_snap: HTMLCanvasElement, _params: PoseNetOperationParams, prediction: Pose[]): void => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.drawImage(_snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        prediction.forEach((x) => {
            // Draw Point
            const keypoints = x.keypoints;
            keypoints.forEach((k) => {
                const x = (k.position.x / _params.processWidth) * this.outputCanvas!.width;
                const y = (k.position.y / _params.processHeight) * this.outputCanvas!.height;
                outputCtx.fillStyle = "rgba(0,0,255,0.3)";
                outputCtx.fillRect(x, y, 6, 6);
            });

            // Draw Skeleton
            const adjacentKeyPoints = getAdjacentKeyPoints(x.keypoints, 0.0);
            const scaleX = this.outputCanvas!.width / _params.processWidth;
            const scaleY = this.outputCanvas!.height / _params.processHeight;
            adjacentKeyPoints.forEach((keypoints) => {
                outputCtx.beginPath();
                outputCtx.moveTo(keypoints[0].position.x * scaleX, keypoints[0].position.y * scaleY);
                outputCtx.lineTo(keypoints[1].position.x * scaleX, keypoints[1].position.y * scaleY);
                outputCtx.lineWidth = 6;
                outputCtx.strokeStyle = "rgba(255,0,0,0.3)";
                outputCtx.stroke();
            });
        });
    };


}
