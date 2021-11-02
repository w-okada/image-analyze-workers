import React, { useEffect, useMemo, useState } from "react";
import { VideoInputType } from "./const";
import { useVideoInputList } from "./hooks/useVideoInputList";
import { generateDefaultSuperResolutionParams, generateSuperResolutionDefaultConfig, SuperResolutionConfig, SuperResolutionOperationParams, SuperResolutionWorkerManager } from "@dannadori/super-resolution-worker-js";
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from "./components/components";
let GlobalLoopID = 0;

interface WorkerProps {
    manager: SuperResolutionWorkerManager;
    params: SuperResolutionOperationParams;
    config: SuperResolutionConfig;
}
interface InputMedia {
    mediaType: VideoInputType;
    media: MediaStream | string;
}

const App = () => {
    const manager = useMemo(() => {
        return new SuperResolutionWorkerManager();
    }, []);
    const config = useMemo(() => {
        return generateSuperResolutionDefaultConfig();
    }, []);
    const params = useMemo(() => {
        return generateDefaultSuperResolutionParams();
    }, []);

    const modelKeys = useMemo(() => {
        const keys: { [key: string]: string } = {};
        Object.keys(config.scaleFactor).forEach((x) => {
            keys[x] = x;
        });
        return keys;
    }, []);
    const interpolationTypeKeys = useMemo(() => {
        const keys: { [key: string]: string } = {};
        Object.keys(config.interpolationTypes).forEach((x) => {
            keys[x] = x;
        });
        return keys;
    }, []);

    const { videoInputList } = useVideoInputList();
    const [workerProps, setWorkerProps] = useState<WorkerProps>();

    const [modelKey, setModelKey] = useState(Object.keys(modelKeys)[0]);
    const [interpolationTypeKey, setInterpolationTypeKey] = useState(Object.keys(interpolationTypeKeys)[0]);
    const [useSIMD, setUseSIMD] = useState(false);
    const [useTFJS, setUseTFJS] = useState(false);
    const [inputSize, setInputSize] = useState(240);
    const [onLocal, setOnLocal] = useState(true);

    const [inputMedia, setInputMedia] = useState<InputMedia>({ mediaType: "IMAGE", media: "img/yuka_kawamura.jpg" });
    const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
        setInputMedia({ mediaType: mediaType, media: input });
    };

    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(() => {
        const init = async () => {
            config.processOnLocal = onLocal;
            config.enableSIMD = true;
            config.useSimd = useSIMD;
            config.useTFJS = useTFJS;
            config.modelKey = modelKey;

            await manager.init(config);

            params.inputHeight = inputSize;
            params.inputWidth = inputSize;
            params.interpolation = config.interpolationTypes[interpolationTypeKey];
            const newProps = { manager: manager, config: config, params: params };
            console.log("CALLED new MANAGER", onLocal);
            setWorkerProps(newProps);
        };
        init();
    }, [modelKey, onLocal, useSIMD, useTFJS]); // eslint-disable-line

    /// input設定
    useEffect(() => {
        const video = document.getElementById("input_video") as HTMLVideoElement;
        if (inputMedia.mediaType === "IMAGE") {
            const img = document.getElementById("input_img") as HTMLImageElement;
            img.onloadeddata = () => {
                setLayout();
            };
            img.src = inputMedia.media as string;
        } else if (inputMedia.mediaType === "MOVIE") {
            const vid = document.getElementById("input_video") as HTMLVideoElement;
            vid.pause();
            vid.srcObject = null;
            vid.src = inputMedia.media as string;
            vid.loop = true;
            vid.onloadeddata = () => {
                video.play();
                setLayout();
            };
        } else {
            const vid = document.getElementById("input_video") as HTMLVideoElement;
            vid.pause();
            vid.srcObject = inputMedia.media as MediaStream;
            vid.onloadeddata = () => {
                video.play();
                setLayout();
            };
        }
    }, [inputMedia]); // eslint-disable-line

    //////////////
    ///// util  //
    //////////////
    const setLayout = () => {
        const outputElem = document.getElementById("output") as HTMLCanvasElement;
        const outputCanvasElem = document.getElementById("output-canvas") as HTMLCanvasElement;
        const scaleFactor = config.scaleFactor[modelKey];
        const inputElem = inputMedia.mediaType === "IMAGE" ? (document.getElementById("input_img") as HTMLImageElement) : (document.getElementById("input_video") as HTMLVideoElement);
        const inputWidth = inputMedia.mediaType === "IMAGE" ? (inputElem as HTMLImageElement).naturalWidth : (inputElem as HTMLVideoElement).videoWidth;
        const inputHeight = inputMedia.mediaType === "IMAGE" ? (inputElem as HTMLImageElement).naturalHeight : (inputElem as HTMLVideoElement).videoHeight;
        const ratio = inputSize / inputWidth;

        inputElem.width = inputWidth * ratio;
        inputElem.height = inputHeight * ratio;
        [outputElem, outputCanvasElem].forEach((c) => {
            if (c.width !== inputElem.width * scaleFactor || c.height !== inputElem.height * scaleFactor) {
                c.width = inputElem.width * scaleFactor;
                c.height = inputElem.height * scaleFactor;
            }
        });
    };

    //////////////////
    //  pipeline    //
    //////////////////
    useEffect(() => {
        console.log("[Pipeline] Start", workerProps);
        let renderRequestId: number;
        const LOOP_ID = performance.now();
        GlobalLoopID = LOOP_ID;

        const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
        const dst = document.getElementById("output") as HTMLCanvasElement;
        const dstCanvas = document.getElementById("output-canvas") as HTMLCanvasElement;
        const tmp = document.getElementById("tmp") as HTMLCanvasElement; // to be stored to keep image for input
        const dstCtx = dst.getContext("2d")!;
        const dstCanvasCtx = dstCanvas.getContext("2d")!;
        const tmpCtx = tmp.getContext("2d")!;

        const render = async () => {
            // console.log("RENDER::::", LOOP_ID, renderRequestId, workerProps?.params);
            const scaleFactor = config.scaleFactor[modelKey];
            const start = performance.now();

            if (workerProps && src.width > 0 && src.height > 0) {
                setLayout();
                tmp.width = src.width;
                tmp.height = src.height;
                tmpCtx.drawImage(src, 0, 0, tmp.width, tmp.height);
                workerProps.params.interpolation = config.interpolationTypes[interpolationTypeKey];
                const inference_start = performance.now();
                workerProps.params.inputWidth = src.width;
                workerProps.params.inputHeight = src.height;
                const prediction = await workerProps.manager.predict(tmp!, workerProps.params);
                const inference_end = performance.now();

                const info = document.getElementById("info") as HTMLCanvasElement;
                info.innerText = `processing time: ${inference_end - inference_start}`;

                if (!prediction) {
                    if (GlobalLoopID === LOOP_ID) {
                        renderRequestId = requestAnimationFrame(render);
                    }
                    return;
                }
                try {
                    const resizedImage = new ImageData(new Uint8ClampedArray(prediction), workerProps.params.inputWidth * scaleFactor, workerProps.params.inputHeight * scaleFactor);
                    dstCtx.putImageData(resizedImage, 0, 0);
                } catch (exception) {
                    console.log(exception);
                }
                dstCanvasCtx.drawImage(tmp, 0, 0, dst.width, dst.height);
                // }

                if (GlobalLoopID === LOOP_ID) {
                    renderRequestId = requestAnimationFrame(render);
                }
            }
            const end = performance.now();
            const info2 = document.getElementById("info2") as HTMLCanvasElement;
            info2.innerText = `processing time: ${end - start}`;
        };
        render();
        return () => {
            console.log("CANCEL", renderRequestId);
            cancelAnimationFrame(renderRequestId);
        };
    }, [workerProps, inputMedia, interpolationTypeKey, inputSize]); // eslint-disable-line

    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{ display: "flex" }}>
                <div>
                    <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
                    <DropDown title="model" current={modelKey} onchange={setModelKey} options={modelKeys} />
                    <DropDown title="type" current={interpolationTypeKey} onchange={setInterpolationTypeKey} options={interpolationTypeKeys} />

                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
                    <SingleValueSlider title="inputSize(w)" current={inputSize} onchange={setInputSize} min={96} max={264} step={24} />
                    <Toggle title="SIMD" current={useSIMD} onchange={setUseSIMD} />
                    <Toggle title="TFJS" current={useTFJS} onchange={setUseTFJS} />

                    <div>
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div>(1) Input image</div>
                        <div>{inputMedia.mediaType === "IMAGE" ? <img id="input_img" alt=""></img> : <video id="input_video"></video>}</div>
                    </div>

                    <div style={{ width: "10px" }} />

                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div>(2) Output image</div>
                        <div>
                            <canvas id="output"></canvas>
                        </div>
                    </div>

                    <div style={{ width: "10px" }} />

                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div>(x) drawImage function</div>
                        <div>
                            <canvas id="output-canvas"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex" }}>
                <canvas id="tmp" hidden></canvas>
                <canvas id="front" hidden></canvas>
                <canvas id="src-cache" hidden></canvas>
            </div>
            <div>
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
};

export default App;
