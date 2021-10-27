import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core";
import { DropDown, Toggle, VideoInputSelect } from "./components/components";
import { VideoInputType } from "./const";
import { useVideoInputList } from "./hooks/useVideoInputList";
import { CartoonWorkerManager, generateCartoonDefaultConfig, generateDefaultCartoonParams, CartoonConfig, CartoonOperatipnParams } from "@dannadori/white-box-cartoonization-worker-js";

let GlobalLoopID = 0;

const processSizes: { [name: string]: number[] } = {
    "64": [64, 64],
    "128": [128, 128],
    "192": [192, 192],
    "256": [256, 256],
    "320": [320, 320],
    "440": [440, 440],
    "512": [512, 512],
};

const useStyles = makeStyles(() => ({
    inputView: {
        maxWidth: 512,
        maxHeight: 512,
    },
}));

interface WorkerProps {
    manager: CartoonWorkerManager;
    config: CartoonConfig;
    params: CartoonOperatipnParams;
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

    const [processSizeKey, setProcessSizeKey] = useState(Object.keys(processSizes)[0]);

    const [onLocal, setOnLocal] = useState(true);
    const [useWasm] = useState(false);
    const [strict] = useState(false);

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
            const m = workerProps ? workerProps.manager : new CartoonWorkerManager();
            const count = workerProps ? workerProps.count + 1 : 0;
            const c = generateCartoonDefaultConfig();
            c.processOnLocal = onLocal;
            c.useTFWasmBackend = useWasm;
            await m.init(c);

            const p = generateDefaultCartoonParams();
            p.processWidth = processSizes[processSizeKey][0];
            p.processHeight = processSizes[processSizeKey][1];
            const newProps = { manager: m, config: c, params: p, count: count };
            setWorkerProps(newProps);
        };
        init();
    }, [onLocal, useWasm]); // eslint-disable-line

    //// パラメータ変更
    useEffect(() => {
        if (!workerProps) {
            return;
        }
        const p = generateDefaultCartoonParams();
        p.processWidth = processSizes[processSizeKey][0];
        p.processHeight = processSizes[processSizeKey][1];
        // setWorkerProps({...workerProps, params:p})
        workerProps.params = p;
    }, [processSizeKey]); // eslint-disable-line

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
            // console.log("RENDER::::", LOOP_ID, renderRequestId,  workerProps?.params)
            const start = performance.now();

            const dst = document.getElementById("output") as HTMLCanvasElement;
            if (workerProps) {
                const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
                resizeDst(src);
                if (dst.width > 0 && dst.height > 0) {
                    const dst = document.getElementById("output") as HTMLCanvasElement;
                    const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

                    const dstCtx = dst.getContext("2d")!;

                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);

                    const inference_start = performance.now();
                    const prediction = await workerProps.manager.predict(srcCache!, workerProps.params);
                    const inference_end = performance.now();
                    const info1 = document.getElementById("info") as HTMLCanvasElement;
                    info1.innerText = `processing time: ${inference_end - inference_start}`;

                    if (prediction) {
                        dstCtx.drawImage(prediction, 0, 0, dst.width, dst.height);
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
    }, [workerProps, strict]);

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
                    <DropDown title="processSize" current={processSizeKey} onchange={setProcessSizeKey} options={processSizes} />

                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />

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
            </div>
            <div>
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
};

export default App;
