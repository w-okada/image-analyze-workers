import { FaceLandmarkDetectionOperationParams, Keypoint, TRIANGULATION, NUM_KEYPOINTS } from "@dannadori/face-landmark-detection-worker-js";

export class FacemeshDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;

    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
        console.log(this.outputCanvas);
    };

    draw = (snap: HTMLCanvasElement, params: FaceLandmarkDetectionOperationParams, keypoints: Keypoint[]) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.strokeStyle = "#000000";
        for (let i = 0; i < TRIANGULATION.length / 3; i++) {
            const points = [TRIANGULATION[i * 3 + 0], TRIANGULATION[i * 3 + 1], TRIANGULATION[i * 3 + 2]].map((index) => [(keypoints[index].x / params.processWidth) * this.outputCanvas!.width, (keypoints[index].y / params.processHeight) * this.outputCanvas!.height]);
            const region = new Path2D();
            region.moveTo(points[0][0], points[0][1]);
            for (let j = 1; j < points.length; j++) {
                const point = points[j];
                region.lineTo(point[0], point[1]);
            }
            region.closePath();
            outputCtx.stroke(region);
        }
        if (keypoints.length > NUM_KEYPOINTS) {
            const offset = NUM_KEYPOINTS;
            outputCtx.strokeStyle = "#FF2C35";
            outputCtx.lineWidth = 1;
            const irisIndex = [offset, offset + 1, offset + 2, offset + 3, offset + 4, offset + 5, offset + 6, offset + 7, offset + 8, offset + 9].map((index) => [(keypoints[index].x / params.processWidth) * this.outputCanvas!.width, (keypoints[index].y / params.processHeight) * this.outputCanvas!.height]);
            const irisTriangle = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 6, 7, 5, 7, 8, 5, 8, 9, 5, 9, 6];
            for (let i = 0; i < irisTriangle.length / 3; i++) {
                const region = new Path2D();
                const irisOffset = i * 3;
                const p0 = irisIndex[irisTriangle[irisOffset + 0]];
                const p1 = irisIndex[irisTriangle[irisOffset + 1]];
                const p2 = irisIndex[irisTriangle[irisOffset + 2]];
                region.moveTo(p0[0], p0[1]);
                region.lineTo(p1[0], p1[1]);
                region.lineTo(p2[0], p2[1]);
                region.closePath();
                outputCtx.stroke(region);
            }
        }
    };
    drawTrackingArea = (xmin: number, ymin: number, width: number, height: number) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.fillStyle = "#00ff0066";
        outputCtx.fillRect(xmin, ymin, width, height);
    };

    cropTrackingArea = (snap: HTMLCanvasElement, xmin: number, ymin: number, width: number, height: number) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);

        outputCtx.drawImage(snap, xmin, ymin, width, height, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };

    // draw = (snap: HTMLCanvasElement, params: FacemeshOperationParams, keypoints: Keypoint[]) => {
    //     if (!this.outputCanvas) {
    //         console.log("not ready:::", this.outputCanvas);
    //         return;
    //     }
    //     const outputCtx = this.outputCanvas.getContext("2d")!;
    //     outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    //     outputCtx.strokeStyle = "#000000";
    //     for (let i = 0; i < TRIANGULATION.length / 3; i++) {
    //         const points = [TRIANGULATION[i * 3 + 0], TRIANGULATION[i * 3 + 1], TRIANGULATION[i * 3 + 2]].map((index) => [(keypoints[index][0] / params.processWidth) * this.outputCanvas!.width, (keypoints[index][1] / params.processHeight) * this.outputCanvas!.height]);
    //         const region = new Path2D();
    //         region.moveTo(points[0][0], points[0][1]);
    //         for (let j = 1; j < points.length; j++) {
    //             const point = points[j];
    //             region.lineTo(point[0], point[1]);
    //         }
    //         region.closePath();
    //         outputCtx.stroke(region);
    //     }
    //     if (keypoints.length > NUM_KEYPOINTS) {
    //         const offset = NUM_KEYPOINTS;
    //         outputCtx.strokeStyle = "#FF2C35";
    //         outputCtx.lineWidth = 1;
    //         const irisIndex = [offset, offset + 1, offset + 2, offset + 3, offset + 4, offset + 5, offset + 6, offset + 7, offset + 8, offset + 9].map((index) => [(keypoints[index][0] / params.processWidth) * this.outputCanvas!.width, (keypoints[index][1] / params.processHeight) * this.outputCanvas!.height]);
    //         const irisTriangle = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 6, 7, 5, 7, 8, 5, 8, 9, 5, 9, 6];
    //         for (let i = 0; i < irisTriangle.length / 3; i++) {
    //             const region = new Path2D();
    //             const irisOffset = i * 3;
    //             const p0 = irisIndex[irisTriangle[irisOffset + 0]];
    //             const p1 = irisIndex[irisTriangle[irisOffset + 1]];
    //             const p2 = irisIndex[irisTriangle[irisOffset + 2]];
    //             region.moveTo(p0[0], p0[1]);
    //             region.lineTo(p1[0], p1[1]);
    //             region.lineTo(p2[0], p2[1]);
    //             region.closePath();
    //             outputCtx.stroke(region);
    //         }
    //     }
    // };
}
