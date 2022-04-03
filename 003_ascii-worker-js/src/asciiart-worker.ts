import { AsciiConfig, AsciiFunctionTypes, AsciiOperatipnParams } from "./const";
export { AsciiConfig, AsciiOperatipnParams, AsciiFunctionTypes } from "./const";
import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";

export const generateAsciiArtDefaultConfig = (): AsciiConfig => {
    const defaultConf: AsciiConfig = {
        browserType: getBrowserType(),
        processOnLocal: false,
    };
    return defaultConf;
};

export const generateDefaultAsciiArtParams = () => {
    const defaultParams: AsciiOperatipnParams = {
        type: AsciiFunctionTypes.AsciiArt,
        processWidth: 300,
        processHeight: 300,
        asciiStr: " .,:;i1tfLCG08@",
        fontSize: 6,
    };
    return defaultParams;
};

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./asciiart-worker-worker.ts";

class LocalAA extends LocalWorker {
    contrastFactor = (259 * (128 + 255)) / (255 * (259 - 128));

    brightnessCanvas = document.createElement("canvas");
    drawingCanvas = document.createElement("canvas");

    init = async (config: AsciiConfig) => {};
    predict = async (config: AsciiConfig, params: AsciiOperatipnParams, targetCanvas: HTMLCanvasElement) => {
        const asciiStr = params.asciiStr;
        const fontSize = params.fontSize;
        const asciiCharacters = asciiStr.split("");

        const ctx = targetCanvas.getContext("2d")!;
        ctx.font = fontSize + "px monospace";
        ctx.textBaseline = "top";
        const m = ctx.measureText(asciiStr);
        const charWidth = Math.floor(m.width / asciiCharacters.length);
        const tmpWidth = Math.ceil(targetCanvas.width / charWidth);
        const tmpHeight = Math.ceil(targetCanvas.height / fontSize);

        // Generate Image for Brightness
        this.brightnessCanvas.width = tmpWidth;
        this.brightnessCanvas.height = tmpHeight;
        const brCtx = this.brightnessCanvas.getContext("2d")!;
        brCtx.drawImage(targetCanvas, 0, 0, tmpWidth, tmpHeight);
        const brImageData = brCtx.getImageData(0, 0, tmpWidth, tmpHeight);

        // generate chars agaist the each dot
        const lines: string[] = [];
        for (let y = 0; y < tmpHeight; y++) {
            let line = "";
            for (let x = 0; x < tmpWidth; x++) {
                const offset = (y * tmpWidth + x) * 4;
                const r = Math.max(0, Math.min(Math.floor((brImageData.data[offset + 0] - 128) * this.contrastFactor) + 128, 255));
                const g = Math.max(0, Math.min(Math.floor((brImageData.data[offset + 1] - 128) * this.contrastFactor) + 128, 255));
                const b = Math.max(0, Math.min(Math.floor((brImageData.data[offset + 2] - 128) * this.contrastFactor) + 128, 255));

                var brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                var character = asciiCharacters[asciiCharacters.length - 1 - Math.round(brightness * (asciiCharacters.length - 1))];
                line += character;
            }
            lines.push(line);
        }
        return lines;
    };
}

export class AsciiArtWorkerManager extends WorkerManagerBase {
    private workerAA: Worker | null = null;
    private outCanvas: HTMLCanvasElement = document.createElement("canvas");

    private config: AsciiConfig = generateAsciiArtDefaultConfig();
    localWorker = new LocalAA();

    init = async (config: AsciiConfig | null) => {
        this.config = config || generateAsciiArtDefaultConfig();

        await this.initCommon(
            {
                useWorkerForSafari: false,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            config
        );
        return;
    };

    predict = async (params: AsciiOperatipnParams, targetCanvas: HTMLCanvasElement) => {
        if (!this.worker) {
            const resizedCanvas = this.generateTargetCanvas(targetCanvas, params.processWidth, params.processHeight);
            const prediction = await this.localWorker.predict(this.config, params, resizedCanvas);
            return prediction;
        }
        const imageBitmap = this.generateImageBitmap(targetCanvas, params.processWidth, params.processHeight);
        const prediction = (await this.sendToWorker(this.config, params, imageBitmap)) as string[];
        return prediction;
    };
}
