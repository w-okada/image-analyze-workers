import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core";
import { DropDown, Toggle, VideoInputSelect } from "./components/components";
import { VideoInputType } from "./const";
import { useVideoInputList } from "./hooks/useVideoInputList";
import { BisenetV2CelebAMaskWorkerManager, generateBisenetV2CelebAMaskDefaultConfig, generateDefaultBisenetV2CelebAMaskParams, BisenetV2CelebAMaskConfig, BisenetV2CelebAMaskOperatipnParams } from "@dannadori/bisenetv2-celebamask-worker-js";

let GlobalLoopID = 0;
export const rainbow = [
    [110, 64, 170],
    [143, 61, 178],
    [178, 60, 178],
    [210, 62, 167],
    [238, 67, 149],
    [255, 78, 125],
    [255, 94, 99],
    [255, 115, 75],
    [255, 140, 56],
    [239, 167, 47],
    [217, 194, 49],
    [194, 219, 64],
    [175, 240, 91],
    [135, 245, 87],
    [96, 247, 96],
    [64, 243, 115],
    [40, 234, 141],
    [28, 219, 169],
    [26, 199, 194],
    [33, 176, 213],
    [47, 150, 224],
    [65, 125, 224],
    [84, 101, 214],
    [99, 81, 195],
];

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
    manager: BisenetV2CelebAMaskWorkerManager;
    config: BisenetV2CelebAMaskConfig;
    params: BisenetV2CelebAMaskOperatipnParams;
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

    const [processSizeKey, setProcessSizeKey] = useState(Object.keys(processSizes)[3]);

    const [onLocal, setOnLocal] = useState(true);
    const [useWasm] = useState(false);
    const [strict] = useState(false);

    const [inputMedia, setInputMedia] = useState<InputMedia>({ mediaType: "IMAGE", media: "yuka_kawamura.jpg" });
    const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
        setInputMedia({ mediaType: mediaType, media: input });
    };

    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(() => {
        const init = async () => {
            const m = workerProps ? workerProps.manager : new BisenetV2CelebAMaskWorkerManager();
            const count = workerProps ? workerProps.count + 1 : 0;
            const c = generateBisenetV2CelebAMaskDefaultConfig();
            c.processOnLocal = onLocal;
            c.useTFWasmBackend = useWasm;
            await m.init(c);

            const p = generateDefaultBisenetV2CelebAMaskParams();
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
        const p = generateDefaultBisenetV2CelebAMaskParams();
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
                if (dst.width > 0 && dst.height > 0) {
                    const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
                    const dst = document.getElementById("output") as HTMLCanvasElement;
                    const tmp = document.getElementById("tmp") as HTMLCanvasElement;
                    const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

                    const dstCtx = dst.getContext("2d")!;

                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);

                    const inference_start = performance.now();
                    const prediction = await workerProps.manager.predict(srcCache!, workerProps.params);
                    const inference_end = performance.now();
                    const info1 = document.getElementById("info") as HTMLCanvasElement;
                    info1.innerText = `processing time: ${inference_end - inference_start}`;

                    if (prediction) {
                        tmp.width = prediction[0].length;
                        tmp.height = prediction.length;
                        const data = new ImageData(tmp.width, tmp.height);
                        for (let rowIndex = 0; rowIndex < tmp.height; rowIndex++) {
                            for (let colIndex = 0; colIndex < tmp.width; colIndex++) {
                                const pix_offset = (rowIndex * tmp.width + colIndex) * 4;

                                data.data[pix_offset + 0] = 128;
                                data.data[pix_offset + 1] = rainbow[prediction[rowIndex][colIndex]][0];
                                data.data[pix_offset + 2] = rainbow[prediction[rowIndex][colIndex]][1];
                                data.data[pix_offset + 3] = rainbow[prediction[rowIndex][colIndex]][2];
                            }
                        }
                        tmp.getContext("2d")!.putImageData(data, 0, 0);

                        dstCtx.drawImage(src, 0, 0, dst.width, dst.height);
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
