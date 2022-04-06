import { BarcodeInfo, BarcodeScannerOperationParams } from "@dannadori/barcode-scanner-worker-js";

export class BarcodeScannerDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;

    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
    };

    draw = (snap: HTMLCanvasElement, _params: BarcodeScannerOperationParams, prediction: BarcodeInfo[]) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }

        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        prediction.forEach((info) => {
            if (info.barcode_data.length === 0) {
                return;
            }
            outputCtx.beginPath();
            outputCtx.moveTo(info.p1_x * this.outputCanvas!.width, info.p1_y * this.outputCanvas!.height);
            outputCtx.lineTo(info.p2_x * this.outputCanvas!.width, info.p2_y * this.outputCanvas!.height);
            outputCtx.lineTo(info.p3_x * this.outputCanvas!.width, info.p3_y * this.outputCanvas!.height);
            outputCtx.lineTo(info.p4_x * this.outputCanvas!.width, info.p4_y * this.outputCanvas!.height);
            outputCtx.lineTo(info.p1_x * this.outputCanvas!.width, info.p1_y * this.outputCanvas!.height);
            outputCtx.closePath();
            // 塗りつぶしスタイルを設定
            outputCtx.fillStyle = "Red";
            outputCtx.globalAlpha = 0.5;
            // パスに沿って塗りつぶし
            outputCtx.fill();

            // dstCtx.strokeRect(info.px_x * dst.width, info.px_y * dst.height, info.px_w * dst.width, info.px_h * dst.height);
            outputCtx.fillStyle = "Blue";
            outputCtx.font = "40px Arial";
            outputCtx.fillText(info.barcode_data, info.p1_x * this.outputCanvas!.width, info.p1_y * this.outputCanvas!.height);
            // dstCtx.fillText(info.barcode_data + ` [${w}, ${h}]`, info.p1_x * dst.width, info.p1_y * dst.height)
        });
    };
}
