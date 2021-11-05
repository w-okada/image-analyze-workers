import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { generateDefaultGoogleMeetSegmentationParams, generateGoogleMeetSegmentationDefaultConfig, GoogleMeetSegmentationWorkerManager } from "@dannadori/googlemeet-segmentation-worker-js";
import { makeStyles } from "@material-ui/core";
import { DropDown, FileChooser, SingleValueSlider, Toggle, VideoInputSelect } from "./components/components";
import { VideoInputType } from "./const";
import { useVideoInputList } from "./hooks/useVideoInputList";
import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationOperationParams } from "@dannadori/googlemeet-segmentation-worker-js/dist/const";

let GlobalLoopID = 0;

const useStyles = makeStyles((theme) => ({
    inputView: {
        maxWidth: 512,
    },
}));

interface WorkerProps {
    manager: GoogleMeetSegmentationWorkerManager;
    config: GoogleMeetSegmentationConfig;
    params: GoogleMeetSegmentationOperationParams;
}
interface InputMedia {
    mediaType: VideoInputType;
    media: MediaStream | string;
}

const App = () => {
    const classes = useStyles();
    const { videoInputList } = useVideoInputList();

    const manager = useMemo(() => {
        return new GoogleMeetSegmentationWorkerManager();
    }, []);
    const config = useMemo(() => {
        return generateGoogleMeetSegmentationDefaultConfig();
    }, []);
    const params = useMemo(() => {
        return generateDefaultGoogleMeetSegmentationParams();
    }, []);

    const modelKeys = useMemo(() => {
        const keys: { [key: string]: string } = {};
        Object.keys(config.modelTFLites).forEach((x) => {
            keys[x] = x;
        });
        return keys;
    }, []);

    const processSizeKeys = useMemo(() => {
        const keys: { [key: string]: string } = {};
        Object.keys(config.processSizes).forEach((x) => {
            keys[x] = x;
        });
        return keys;
    }, []);

    const [workerProps, setWorkerProps] = useState<WorkerProps>();

    const [modelKey, setModelKey] = useState(Object.keys(modelKeys)[2]);
    const [processSizeKey, setProcessSizeKey] = useState(Object.keys(processSizeKeys)[2]);

    const [onLocal, setOnLocal] = useState(true);
    const [useTFJS, setUseTFJS] = useState(false);
    const [useSIMD, setUseSIMD] = useState(false);

    const [jbfD, setJbfD] = useState(0);
    const [jbfSigmaC, setJbfSigmaC] = useState(2);
    const [jbfSigmaS, setJbfSigmaS] = useState(2);
    const [jbfPostProcess, setJbfPostProcess] = useState(3);

    const [threshold, setThreshold] = useState(0.1);
    const [interpolation, setInterpolation] = useState(4);
    const [lightWrapping, setLightWrapping] = useState(1);
    const [strict, setStrict] = useState(false);

    const [inputMedia, setInputMedia] = useState<InputMedia>({
        mediaType: "IMAGE",
        media: "yuka_kawamura.jpg",
    });
    const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
        setInputMedia({ mediaType: mediaType, media: input });
    };

    const backgroundChange = (mediaType: VideoInputType, input: string) => {
        console.log("background:", mediaType, input);
        if (mediaType === "IMAGE") {
            const img = document.getElementById("background") as HTMLImageElement;
            img.src = input;
        }
    };
    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(() => {
        const init = async () => {
            config.processOnLocal = onLocal;
            config.modelKey = modelKey;
            config.useTFJS = useTFJS;
            config.useSimd = useSIMD;
            await manager.init(config);
            const newProps = { manager: manager, config: config, params: params };
            setWorkerProps(newProps);
        };
        init();
    }, [modelKey, onLocal, useTFJS, useSIMD]); // eslint-disable-line

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
        const tmp = document.getElementById("tmp") as HTMLCanvasElement;
        const front = document.getElementById("front") as HTMLCanvasElement;
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

        [dst, tmp, front, srcCache].forEach((c) => {
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
            // console.log("RENDER::::", LOOP_ID,  workerProps?.params)
            const start = performance.now();
            const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
            const background = document.getElementById("background") as HTMLImageElement;
            const dst = document.getElementById("output") as HTMLCanvasElement;
            const tmp = document.getElementById("tmp") as HTMLCanvasElement;
            const front = document.getElementById("front") as HTMLCanvasElement;
            const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;
            if (workerProps && src.width > 0 && src.height > 0) {
                resizeDst(src);

                workerProps.params.processSizeKey = processSizeKey;
                workerProps.params.jbfPostProcess = jbfPostProcess;
                workerProps.params.jbfD = jbfD;
                workerProps.params.jbfSigmaC = jbfSigmaC;
                workerProps.params.jbfSigmaS = jbfSigmaS;

                workerProps.params.threshold = threshold;
                workerProps.params.interpolation = interpolation;

                const inference_start = performance.now();
                srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);
                const prediction = await workerProps.manager.predict(srcCache!, workerProps.params);
                const inference_end = performance.now();
                const info1 = document.getElementById("info") as HTMLCanvasElement;
                info1.innerText = `processing time: ${inference_end - inference_start}`;

                // 結果からマスク作成
                const res = new ImageData(workerProps.config.processSizes[params.processSizeKey][0], workerProps.config.processSizes[params.processSizeKey][1]);

                tmp.width = workerProps.config.processSizes[params.processSizeKey][0];
                tmp.height = workerProps.config.processSizes[params.processSizeKey][1];
                // console.log("prediction:::", prediction);

                if (prediction) {
                    tmp.getContext("2d")!.putImageData(prediction!, 0, 0);

                    // 前景の透過処理
                    const frontCtx = front.getContext("2d")!;
                    frontCtx.clearRect(0, 0, front.width, front.height);
                    frontCtx.drawImage(tmp, 0, 0, front.width, front.height);
                    frontCtx.globalCompositeOperation = "source-atop";
                    if (strict) {
                        frontCtx.drawImage(srcCache, 0, 0, front.width, front.height);
                    } else {
                        frontCtx.drawImage(src, 0, 0, front.width, front.height);
                    }
                    frontCtx.globalCompositeOperation = "source-over";

                    // 最終書き込み
                    const dstCtx = dst.getContext("2d")!;
                    //// クリア or 背景描画
                    dstCtx.clearRect(0, 0, dst.width, dst.height);
                    dstCtx.drawImage(background, 0, 0, dst.width, dst.height);

                    //// light Wrapping
                    dstCtx.filter = `blur(${lightWrapping}px)`;
                    dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height);
                    dstCtx.filter = "none";

                    // 前景書き込み
                    dstCtx.drawImage(front, 0, 0, dst.width, dst.height);
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
            cancelAnimationFrame(renderRequestId);
        };
    }, [workerProps, strict, jbfD, jbfSigmaC, jbfSigmaS, jbfPostProcess, threshold, interpolation]);

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
                <div>
                    <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
                    <DropDown title="model" current={modelKey} onchange={setModelKey} options={modelKeys} />
                    <DropDown title="ProcessSize" current={processSizeKey} onchange={setProcessSizeKey} options={processSizeKeys} />

                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
                    <Toggle title="useTFJS" current={useTFJS} onchange={setUseTFJS} />
                    <Toggle title="SIMD" current={useSIMD} onchange={setUseSIMD} />

                    <SingleValueSlider title="jbfD" current={jbfD} onchange={setJbfD} min={0} max={20} step={1} />
                    <SingleValueSlider title="jbfSigmaC" current={jbfSigmaC} onchange={setJbfSigmaC} min={0} max={20} step={1} />
                    <SingleValueSlider title="jbfSigmaS" current={jbfSigmaS} onchange={setJbfSigmaS} min={0} max={20} step={1} />
                    <SingleValueSlider title="jbfPostProcess" current={jbfPostProcess} onchange={setJbfPostProcess} min={0} max={3} step={1} />

                    <SingleValueSlider title="Threshold" current={threshold} onchange={setThreshold} min={0.0} max={1.0} step={0.1} />
                    <SingleValueSlider title="interpolation" current={interpolation} onchange={setInterpolation} min={0} max={4} step={1} />

                    <FileChooser title="background" onchange={backgroundChange} />
                    <SingleValueSlider title="lightWrapping" current={lightWrapping} onchange={setLightWrapping} min={0} max={10} step={1} />

                    <div>
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex" }}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <img className={classes.inputView} alt="background" id="background" src="img/north-star-2869817_640.jpg" hidden></img>
            </div>
            <div>
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
};

export default App;
