import React, { useEffect, useMemo, useState } from "react";
import { makeStyles } from "@material-ui/core";
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from "./components/components";
import { VideoInputType } from "./const";
import { useVideoInputList } from "./hooks/useVideoInputList";
import { generateDefaultU2NetPortraitParams, generateU2NetPortraitDefaultConfig, U2NetPortraitWorkerManager, U2NetPortraitConfig, U2NetPortraitOperationParams } from "@dannadori/u2net-portrait-worker-js";
import { OpenCVWorkerManager, OpenCVConfig, OpenCVOperatipnParams, generateOpenCVDefaultConfig, generateDefaultOpenCVParams } from "@dannadori/opencv-worker-js";

let GlobalLoopID = 0;

const useStyles = makeStyles(() => ({
    inputView: {
        maxWidth: 512,
        maxHeight: 512,
    },
}));

interface WorkerProps {
    manager: U2NetPortraitWorkerManager;
    config: U2NetPortraitConfig;
    params: U2NetPortraitOperationParams;

    openCVmanager: OpenCVWorkerManager;
    openCVconfig: OpenCVConfig;
    openCVparams: OpenCVOperatipnParams;
}

interface InputMedia {
    mediaType: VideoInputType;
    media: MediaStream | string;
}

const App = () => {
    const classes = useStyles();
    const u2netManager = useMemo(() => {
        return new U2NetPortraitWorkerManager();
    }, []);
    const u2netConfig = useMemo(() => {
        return generateU2NetPortraitDefaultConfig();
    }, []);
    const u2netParams = useMemo(() => {
        return generateDefaultU2NetPortraitParams();
    }, []);

    const opencvManager = useMemo(() => {
        return new OpenCVWorkerManager();
    }, []);
    const opencvConfig = useMemo(() => {
        return generateOpenCVDefaultConfig();
    }, []);
    const opencvParams = useMemo(() => {
        return generateDefaultOpenCVParams();
    }, []);

    const modelKeys = useMemo(() => {
        const keys: { [key: string]: string } = {};
        Object.keys(u2netConfig.modelInputs).forEach((x) => {
            keys[x] = x;
        });
        return keys;
    }, []);

    const { videoInputList } = useVideoInputList();
    const [workerProps, setWorkerProps] = useState<WorkerProps>();

    const [modelKey, setModelKey] = useState(Object.keys(modelKeys)[0]);

    const [onLocal, setOnLocal] = useState(true);
    const [useSIMD, setUseSIMD] = useState(false);
    const [useWasm] = useState(false);
    const [strict] = useState(false);

    const [useBlur, setUseBlur] = useState(true);
    const [blurAlpha, setBlurAplha] = useState(128);
    const [kernelSize, setKernelSize] = useState(5);

    const [inputMedia, setInputMedia] = useState<InputMedia>({
        mediaType: "IMAGE",
        media: "yuka_kawamura.jpg",
    });
    const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
        setInputMedia({ mediaType: mediaType, media: input });
    };

    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(() => {
        const init = async () => {
            u2netConfig.processOnLocal = onLocal;
            u2netConfig.useTFWasmBackend = useWasm;
            u2netConfig.modelKey = modelKey;
            await u2netManager.init(u2netConfig);

            u2netParams.processWidth = u2netConfig.modelInputs[modelKey][0];
            u2netParams.processHeight = u2netConfig.modelInputs[modelKey][1];

            opencvConfig.processOnLocal = onLocal;
            opencvConfig.useSimd = useSIMD;
            opencvManager.init(opencvConfig);
            opencvParams.processWidth = u2netConfig.modelInputs[modelKey][0];
            opencvParams.processHeight = u2netConfig.modelInputs[modelKey][1];
            opencvParams.type = "Blur";
            opencvParams.blurParams!.kernelSize = kernelSize;

            const newProps = { manager: u2netManager, config: u2netConfig, params: u2netParams, openCVmanager: opencvManager, openCVconfig: opencvConfig, openCVparams: opencvParams };
            setWorkerProps(newProps);
        };
        init();
    }, [modelKey, onLocal, useWasm, useSIMD]); // eslint-disable-line

    /// input設定
    useEffect(() => {
        const video = document.getElementById("input_video") as HTMLVideoElement;
        if (inputMedia.mediaType === "IMAGE") {
            const img = document.getElementById("input_img") as HTMLImageElement;
            img.onloadeddata = () => {
                resizeDst(img);
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
                resizeDst(vid);
            };
        } else if (inputMedia.mediaType === "MOVIE_URL") {
            const vid = document.getElementById("input_video") as HTMLVideoElement;
            vid.pause();
            vid.srcObject = null;
            vid.src = inputMedia.media as string;
            vid.loop = true;
            vid.onloadeddata = () => {
                video.play();
                resizeDst(vid);
            };
            // setSrc(vid)
        } else {
            const vid = document.getElementById("input_video") as HTMLVideoElement;
            vid.pause();
            vid.srcObject = inputMedia.media as MediaStream;
            vid.onloadeddata = () => {
                video.play();
                resizeDst(vid);
            };
        }
    }, [inputMedia]);

    // /// resize
    // useEffect(() => {
    //     const input = document.getElementById("input_img") || document.getElementById("input_video");
    //     resizeDst(input!);
    // });

    //////////////
    ///// util  //
    //////////////
    const resizeDst = (input: HTMLElement) => {
        const cs = getComputedStyle(input);
        const width = parseInt(cs.getPropertyValue("width"));
        const height = parseInt(cs.getPropertyValue("height"));
        const dst = document.getElementById("output") as HTMLCanvasElement;

        [dst].forEach((c) => {
            if (c.width !== width || c.height !== height) {
                c.width = width;
                c.height = height;
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

        const render = async () => {
            // console.log("RENDER::::", LOOP_ID, renderRequestId, workerProps?.params);
            const start = performance.now();

            if (workerProps) {
                const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
                resizeDst(src);
                const dst = document.getElementById("output") as HTMLCanvasElement;
                const tmp = document.getElementById("tmp") as HTMLCanvasElement;
                tmp.width = workerProps.openCVparams.processWidth;
                tmp.height = workerProps.openCVparams.processHeight;
                const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;
                srcCache.width = workerProps.openCVparams.processWidth;
                srcCache.height = workerProps.openCVparams.processHeight;

                if (dst.width > 0 && dst.height > 0) {
                    const dstCtx = dst.getContext("2d")!;
                    const tmpCtx = tmp.getContext("2d")!;

                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);

                    workerProps.openCVparams.blurParams!.kernelSize = kernelSize;

                    const inference_start = performance.now();
                    const p1 = workerProps.manager.predict(srcCache!, workerProps.params);
                    const p2 = useBlur ? workerProps.openCVmanager.predict(srcCache!, workerProps.openCVparams) : null;
                    const [prediction, blur] = await Promise.all([p1, p2]);
                    const inference_end = performance.now();

                    const info1 = document.getElementById("info") as HTMLCanvasElement;
                    info1.innerText = `processing time: ${inference_end - inference_start}`;

                    if (prediction) {
                        // console.log("PREDICTION", prediction)
                        const data = new ImageData(workerProps.params.processWidth, workerProps.params.processHeight);
                        for (let rowIndex = 0; rowIndex < data.height; rowIndex++) {
                            for (let colIndex = 0; colIndex < data.width; colIndex++) {
                                const pix_offset = (rowIndex * data.width + colIndex) * 4;
                                if (prediction[rowIndex][colIndex] > 0.0001) {
                                    data.data[pix_offset + 0] = 255 - prediction[rowIndex][colIndex] * 255;
                                    data.data[pix_offset + 1] = 255 - prediction[rowIndex][colIndex] * 255;
                                    data.data[pix_offset + 2] = 255 - prediction[rowIndex][colIndex] * 255;
                                    data.data[pix_offset + 3] = blurAlpha;
                                } else {
                                    data.data[pix_offset + 0] = 255;
                                    data.data[pix_offset + 1] = 255;
                                    data.data[pix_offset + 2] = 255;
                                    data.data[pix_offset + 3] = blurAlpha;
                                }
                            }
                        }
                        dstCtx.clearRect(0, 0, dst.width, dst.height);

                        if (blur) {
                            const bluredImage = new ImageData(blur, workerProps.openCVparams.processWidth, workerProps.openCVparams.processHeight);
                            tmpCtx.putImageData(bluredImage, 0, 0);
                            dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height);
                        }
                        tmpCtx.putImageData(data, 0, 0);
                        dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height);
                    }
                }
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
    }, [workerProps, strict, blurAlpha, kernelSize]);

    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{ display: "flex" }}>
                <div style={{ display: "flex" }}>
                    {inputMedia.mediaType === "IMAGE" ? <img className={classes.inputView} alt="input_img" id="input_img"></img> : <video className={classes.inputView} id="input_video"></video>}
                    <canvas className={classes.inputView} id="output"></canvas>
                </div>
                <div className={classes.inputView}>
                    <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
                    <DropDown title="model" current={modelKey} onchange={setModelKey} options={modelKeys} />
                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
                    <Toggle title="useSIMD" current={useSIMD} onchange={setUseSIMD} />
                    <Toggle title="BlurBlend" current={useBlur} onchange={setUseBlur} />
                    <SingleValueSlider title="Alpha" current={blurAlpha} onchange={setBlurAplha} min={1} max={255} step={1} />
                    <SingleValueSlider title="kSize" current={kernelSize} onchange={setKernelSize} min={1} max={60} step={1} />

                    <div>
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
            </div>
            <div className={classes.inputView} id="output-div"></div>

            <div style={{ display: "flex" }}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache2" hidden></canvas>
            </div>
            <div>
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
};

export default App;
