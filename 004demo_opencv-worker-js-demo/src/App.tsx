import React, { useEffect, useState } from "react";
import { makeStyles, Typography } from "@material-ui/core";
import { VideoInputType } from "./const";
import { OpenCVConfig, OpenCVWorkerManager, OpenCVProcessTypes, OpenCVOperatipnParams, generateOpenCVDefaultConfig, generateDefaultOpenCVParams } from "@dannadori/opencv-worker-js";
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from "./components/components";
import { useVideoInputList } from "./hooks/useVideoInputList";
let GlobalLoopID = 0;

const useStyles = makeStyles(() => ({
    inputView: {
        maxWidth: 512,
        maxHeight: 512,
        flexDirection: "column",
    },
}));

interface WorkerProps {
    manager: OpenCVWorkerManager;
    config: OpenCVConfig;
    params: OpenCVOperatipnParams;
    count: number;
}

interface InputMedia {
    mediaType: VideoInputType;
    media: MediaStream | string;
}

const App = () => {
    const classes = useStyles();
    const { videoInputList } = useVideoInputList();
    const [workerProps, setWorkerProps] = useState<WorkerProps>();
    const [onLocal, setOnLocal] = useState(true);
    const [useSIMD, setUseSIMD] = useState(false);

    const [processTypeKey, setProcessTypeKey] = useState<OpenCVProcessTypes>("Blur");

    const [kSize, setKSize] = useState(1);
    const [sigma, setSigma] = useState(1.0);
    const [th1, setTh1] = useState(1.0);
    const [th2, setTh2] = useState(1.0);

    const [apertureSize, setApertureSize] = useState(3);
    const [l2gradient, setL2gradient] = useState(false);

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
            const m = workerProps ? workerProps.manager : new OpenCVWorkerManager();
            const count = workerProps ? workerProps.count + 1 : 0;
            const c = generateOpenCVDefaultConfig();
            c.processOnLocal = onLocal;
            c.useSimd = useSIMD;
            await m.init(c);

            const p = generateDefaultOpenCVParams();
            const newProps = { manager: m, config: c, params: p, count: count };
            setWorkerProps(newProps);
        };
        init();
    }, [onLocal, useSIMD]);

    /// input設定
    useEffect(() => {
        if (inputMedia.mediaType === "IMAGE") {
            const img = document.getElementById("input_img") as HTMLImageElement;
            img.onloadeddata = () => {
                resizeDst(img);
                // setGuiUpdateCount(guiUpdateCount + 1);
            };
            img.src = inputMedia.media as string;
        } else if (inputMedia.mediaType === "MOVIE") {
            const video = document.getElementById("input_video") as HTMLVideoElement;
            video.pause();
            video.srcObject = null;
            video.src = inputMedia.media as string;
            video.loop = true;
            video.onloadeddata = () => {
                video.play();
                resizeDst(video);
            };
        } else {
            const video = document.getElementById("input_video") as HTMLVideoElement;
            video.pause();
            video.srcObject = inputMedia.media as MediaStream;
            video.onloadeddata = () => {
                video.play();
                resizeDst(video);
            };
        }
    }, [inputMedia]); // eslint-disable-line

    /// resize
    useEffect(() => {
        const input = document.getElementById("input_img") || document.getElementById("input_video");
        resizeDst(input!);
    });

    //////////////
    ///// util  //
    //////////////
    const resizeDst = (input: HTMLElement) => {
        const cs = getComputedStyle(input);
        const width = parseInt(cs.getPropertyValue("width"));
        const height = parseInt(cs.getPropertyValue("height"));
        const dst = document.getElementById("output") as HTMLCanvasElement;
        const front = document.getElementById("front") as HTMLCanvasElement;
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

        [dst, srcCache, front].forEach((c) => {
            c.width = width;
            c.height = height;
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

            const dst = document.getElementById("output") as HTMLCanvasElement;
            if (workerProps) {
                if (dst.width === 0) {
                    const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
                    resizeDst(src);
                }
                if (dst.width > 0 && dst.height > 0) {
                    const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
                    const tmp = document.getElementById("tmp") as HTMLCanvasElement;
                    const tmpCtx = tmp.getContext("2d")!;
                    const dstCtx = dst.getContext("2d")!;

                    tmp.width = src.width;
                    tmp.height = src.height;
                    if (dst.width != src.width || dst.height != src.height) {
                        dst.width = src.width;
                        dst.height = src.height;
                    }
                    tmpCtx.drawImage(src, 0, 0, tmp.width, tmp.height);

                    workerProps.params.processWidth = src.width;
                    workerProps.params.processHeight = src.height;
                    workerProps.params.type = processTypeKey;
                    workerProps.params.blurParams!.kernelSize = kSize;
                    workerProps.params.gausianBlurParams!.kernelSize = kSize;
                    workerProps.params.gausianBlurParams!.sigma = sigma;
                    workerProps.params.cannyParams!.threshold1 = th1;
                    workerProps.params.cannyParams!.threshold2 = th2;
                    workerProps.params.cannyParams!.apertureSize = apertureSize;
                    workerProps.params.cannyParams!.L2gradient = l2gradient;

                    const inference_start = performance.now();
                    const prediction = await workerProps.manager.predict(tmp, workerProps.params);
                    const inference_end = performance.now();
                    const info1 = document.getElementById("info") as HTMLCanvasElement;
                    info1.innerText = `processing time: ${inference_end - inference_start}`;
                    if (prediction) {
                        const converted = new ImageData(prediction, dst.width, dst.height);
                        dstCtx.putImageData(converted, 0, 0);
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
    }, [workerProps, useSIMD, inputMedia, processTypeKey, kSize, sigma, th1, th2, apertureSize, l2gradient]);

    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{ display: "flex" }}>
                <div style={{ display: "flex", flexDirection: "row" }}>
                    {inputMedia.mediaType === "IMAGE" ? <img alt="input_img" id="input_img"></img> : <video id="input_video"></video>}
                    <canvas id="output"></canvas>
                </div>
                <div className={classes.inputView}>
                    <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
                    <DropDown title="type" current={processTypeKey} onchange={setProcessTypeKey} options={OpenCVProcessTypes} />
                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
                    <Toggle title="SIMD" current={useSIMD} onchange={setUseSIMD} />

                    <Typography variant="caption" style={{ marginLeft: 10, color: "red" }}>
                        Blur
                    </Typography>
                    <SingleValueSlider title="kSize" current={kSize} onchange={setKSize} min={1} max={60} step={1} />
                    <SingleValueSlider title="sigma" current={sigma} onchange={setSigma} min={1} max={60} step={1} />

                    <Typography variant="caption" style={{ marginLeft: 10, color: "red" }}>
                        Canny
                    </Typography>
                    <SingleValueSlider title="th1" current={th1} onchange={setTh1} min={1} max={30} step={0.01} />
                    <SingleValueSlider title="th2" current={th2} onchange={setTh2} min={1} max={30} step={0.01} />

                    <SingleValueSlider title="apertureSize" current={apertureSize} onchange={setApertureSize} min={3} max={7} step={2} />
                    <Toggle title="l2gradient" current={l2gradient} onchange={setL2gradient} />
                    <div>
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
            </div>
            <div className={classes.inputView} id="output-div"></div>

            <div style={{ display: "flex" }}>
                <canvas className={classes.inputView} id="tmp" style={{ display: "none" }} hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
            </div>
            <div>
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
};

export default App;
