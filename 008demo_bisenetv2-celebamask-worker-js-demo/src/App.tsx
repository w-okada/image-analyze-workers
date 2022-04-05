import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BisenetV2CelebAMaskWorkerManager, BackendTypes } from "@dannadori/bisenetv2-celebamask-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { BisenetV2CelebAMaskDrawer } from "./BisenetV2CelebAMaskDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";

let GlobalLoopID = 0;
// const processSizes: { [name: string]: number[] } = {
//     "64": [64, 64],
//     "128": [128, 128],
//     "192": [192, 192],
//     "256": [256, 256],
//     "320": [320, 320],
//     "440": [440, 440],
//     "512": [512, 512],
// };

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, config, setConfig, params, setParams } = useAppState();
    const videoInputSelectorProps: VideoInputSelectorProps = {
        id: "video-input-selector",
        currentValue: inputSourceType || "File",
        onInputSourceTypeChanged: setInputSourceType,
        onInputSourceChanged: setInputSource,
    };

    const onLocalSwitchProps: CommonSwitchProps = {
        id: "on-local-switch",
        title: "process on local",
        currentValue: config.processOnLocal,
        onChange: (value: boolean) => {
            config.processOnLocal = value;
            setConfig({ ...config });
        },
    };

    const backendSelectorProps: CommonSelectorProps<BackendTypes> = {
        id: "backend-selector",
        title: "internal resolution",
        currentValue: config.backendType,
        options: {
            WebGL: BackendTypes.WebGL,
            wasm: BackendTypes.wasm,
            cpu: BackendTypes.cpu,
        },
        onChange: (value: BackendTypes) => {
            config.backendType = value;
            setConfig({ ...config });
        },
    };

    const processWidthSliderProps: CommonSliderProps = {
        id: "process-width-slider",
        title: "process width",
        currentValue: params.processWidth,
        max: 512,
        min: 128,
        step: 128,
        width: "30%",
        onChange: (value: number) => {
            params.processWidth = value;
            setParams({ ...params });
        },
        integer: true,
    };
    const processHeightSliderProps: CommonSliderProps = {
        id: "process-height-slider",
        title: "process height",
        currentValue: params.processHeight,
        max: 512,
        min: 128,
        step: 128,
        width: "30%",
        onChange: (value: number) => {
            params.processHeight = value;
            setParams({ ...params });
        },
        integer: true,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSelector {...backendSelectorProps}></CommonSelector>
            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>
        </div>
    );
};

const App = () => {
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<BisenetV2CelebAMaskWorkerManager>();
    const [manager, setManager] = useState<BisenetV2CelebAMaskWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new BisenetV2CelebAMaskWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new BisenetV2CelebAMaskDrawer();
    }, []);

    useEffect(() => {
        const output = document.getElementById("output") as HTMLCanvasElement;
        drawer.setOutputCanvas(output);
    }, []);

    const inputSourceElement = useMemo(() => {
        let elem: HTMLVideoElement | HTMLImageElement;
        if (typeof inputSource === "string") {
            const sourceType = getDataTypeOfDataURL(inputSource);
            if (sourceType === DataTypesOfDataURL.video) {
                elem = document.createElement("video");
                elem.controls = true;
                elem.autoplay = true;
                elem.loop = true;
                elem.src = inputSource;
            } else {
                elem = document.createElement("img");
                elem.src = inputSource;
            }
        } else {
            elem = document.createElement("video");
            elem.autoplay = true;
            elem.srcObject = inputSource;
        }
        elem.style.objectFit = "contain";
        elem.style.width = "100%";
        elem.style.height = "100%";
        return elem;
    }, [inputSource]);

    ////////////////
    // Processing
    ////////////////

    useEffect(() => {
        if (!managerRef.current) {
            return;
        }
        console.log("Renderer Initialized");
        let renderRequestId: number;
        const LOOP_ID = performance.now();
        GlobalLoopID = LOOP_ID;

        const dst = document.getElementById("output") as HTMLCanvasElement;
        const snap = document.createElement("canvas");
        const info = document.getElementById("info") as HTMLDivElement;

        const perfs: number[] = [];
        const avr = (perfs: number[]) => {
            const sum = perfs.reduce((prev, cur) => {
                return prev + cur;
            }, 0);
            return (sum / perfs.length).toFixed(3);
        };
        const render = async () => {
            const start = performance.now();
            [snap, dst].forEach((x) => {
                const width = inputSourceElement instanceof HTMLVideoElement ? inputSourceElement.videoWidth : inputSourceElement.naturalWidth;
                const height = inputSourceElement instanceof HTMLVideoElement ? inputSourceElement.videoHeight : inputSourceElement.naturalHeight;
                if (x.width != width || x.height != height) {
                    x.width = width;
                    x.height = height;
                }
            });
            const snapCtx = snap.getContext("2d")!;
            snapCtx.drawImage(inputSourceElement, 0, 0, snap.width, snap.height);
            try {
                if (snap.width > 0 && snap.height > 0) {
                    const prediction = await managerRef.current!.predict(params, snap);
                    if (prediction) {
                        drawer.draw(snap, params, prediction);
                    }
                }
            } catch (error) {
                console.log(error);
            }

            if (GlobalLoopID === LOOP_ID) {
                renderRequestId = requestAnimationFrame(render);
            }

            const end = performance.now();
            if (perfs.length > 100) {
                perfs.shift();
            }
            perfs.push(end - start);
            const avrElapsedTime = avr(perfs);
            info.innerText = `time:${avrElapsedTime}ms`;
        };
        render();
        return () => {
            console.log("CANCEL", renderRequestId);
            cancelAnimationFrame(renderRequestId);
        };
    }, [managerRef.current, inputSourceElement, config, params]);

    return (
        <div style={{ width: "100%", height: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
            <div
                style={{ width: "33%", objectFit: "contain" }}
                ref={(ref) => {
                    ref?.replaceChildren(inputSourceElement);
                    // ref?.appendChild();
                }}
            ></div>
            <div style={{ width: "33%", objectFit: "contain" }}>
                <canvas id="output" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ width: "30%", marginLeft: "3%", objectFit: "contain" }}>
                <Controller></Controller>
            </div>
            <div style={{ position: "absolute", top: "2%", left: "2%", background: "#000000", color: "#aabbaa" }} id="info"></div>
        </div>
    );
};

// const App = () => {
//     const classes = useStyles();
//     const { videoInputList } = useVideoInputList();
//     const [workerProps, setWorkerProps] = useState<WorkerProps>();

//     const [processSizeKey, setProcessSizeKey] = useState(Object.keys(processSizes)[3]);

//     const [onLocal, setOnLocal] = useState(true);
//     const [useWasm] = useState(false);
//     const [strict] = useState(false);

//     const [inputMedia, setInputMedia] = useState<InputMedia>({ mediaType: "IMAGE", media: "yuka_kawamura.jpg" });
//     const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
//         setInputMedia({ mediaType: mediaType, media: input });
//     };

//     ///////////////////////////
//     /// プロパティ設定      ///
//     ///////////////////////////
//     //// モデル切り替え
//     useEffect(() => {
//         const init = async () => {
//             const m = workerProps ? workerProps.manager : new BisenetV2CelebAMaskWorkerManager();
//             const count = workerProps ? workerProps.count + 1 : 0;
//             const c = generateBisenetV2CelebAMaskDefaultConfig();
//             c.processOnLocal = onLocal;
//             c.useTFWasmBackend = useWasm;
//             await m.init(c);

//             const p = generateDefaultBisenetV2CelebAMaskParams();
//             p.processWidth = processSizes[processSizeKey][0];
//             p.processHeight = processSizes[processSizeKey][1];
//             const newProps = { manager: m, config: c, params: p, count: count };
//             setWorkerProps(newProps);
//         };
//         init();
//     }, [onLocal, useWasm]); // eslint-disable-line

//     //// パラメータ変更
//     useEffect(() => {
//         if (!workerProps) {
//             return;
//         }
//         const p = generateDefaultBisenetV2CelebAMaskParams();
//         p.processWidth = processSizes[processSizeKey][0];
//         p.processHeight = processSizes[processSizeKey][1];
//         // setWorkerProps({...workerProps, params:p})
//         workerProps.params = p;
//     }, [processSizeKey]); // eslint-disable-line

//     /// input設定
//     useEffect(() => {
//         const video = document.getElementById("input_video") as HTMLVideoElement;
//         if (inputMedia.mediaType === "IMAGE") {
//             const img = document.getElementById("input_img") as HTMLImageElement;
//             img.onloadeddata = () => {
//                 resizeDst(img);
//             };
//             img.src = inputMedia.media as string;
//         } else if (inputMedia.mediaType === "MOVIE") {
//             const vid = document.getElementById("input_video") as HTMLVideoElement;
//             vid.pause();
//             vid.srcObject = null;
//             vid.src = inputMedia.media as string;
//             vid.loop = true;
//             vid.onloadeddata = () => {
//                 video.play();
//                 resizeDst(vid);
//             };
//         } else {
//             const vid = document.getElementById("input_video") as HTMLVideoElement;
//             vid.pause();
//             vid.srcObject = inputMedia.media as MediaStream;
//             vid.onloadeddata = () => {
//                 video.play();
//                 resizeDst(vid);
//             };
//         }
//     }, [inputMedia]);

//     /// resize
//     useEffect(() => {
//         const input = document.getElementById("input_img") || document.getElementById("input_video");
//         resizeDst(input!);
//     });

//     //////////////
//     ///// util  //
//     //////////////
//     const resizeDst = (input: HTMLElement) => {
//         const cs = getComputedStyle(input);
//         const width = parseInt(cs.getPropertyValue("width"));
//         const height = parseInt(cs.getPropertyValue("height"));
//         const dst = document.getElementById("output") as HTMLCanvasElement;
//         const front = document.getElementById("front") as HTMLCanvasElement;
//         const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

//         [dst, srcCache, front].forEach((c) => {
//             c.width = width;
//             c.height = height;
//         });
//     };

//     //////////////////
//     //  pipeline    //
//     //////////////////

//     useEffect(() => {
//         console.log("[Pipeline] Start", workerProps);
//         let renderRequestId: number;
//         const LOOP_ID = performance.now();
//         GlobalLoopID = LOOP_ID;

//         const render = async () => {
//             // console.log("RENDER::::", LOOP_ID, renderRequestId,  workerProps?.params)
//             const start = performance.now();

//             const dst = document.getElementById("output") as HTMLCanvasElement;
//             if (workerProps) {
//                 if (dst.width > 0 && dst.height > 0) {
//                     const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//                     const dst = document.getElementById("output") as HTMLCanvasElement;
//                     const tmp = document.getElementById("tmp") as HTMLCanvasElement;
//                     const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

//                     const dstCtx = dst.getContext("2d")!;

//                     srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);

//                     const inference_start = performance.now();
//                     const prediction = await workerProps.manager.predict(srcCache!, workerProps.params);
//                     const inference_end = performance.now();
//                     const info1 = document.getElementById("info") as HTMLCanvasElement;
//                     info1.innerText = `processing time: ${inference_end - inference_start}`;

//                     if (prediction) {
//                         tmp.width = prediction[0].length;
//                         tmp.height = prediction.length;
//                         const data = new ImageData(tmp.width, tmp.height);
//                         for (let rowIndex = 0; rowIndex < tmp.height; rowIndex++) {
//                             for (let colIndex = 0; colIndex < tmp.width; colIndex++) {
//                                 const pix_offset = (rowIndex * tmp.width + colIndex) * 4;

//                                 data.data[pix_offset + 0] = 128;
//                                 data.data[pix_offset + 1] = rainbow[prediction[rowIndex][colIndex]][0];
//                                 data.data[pix_offset + 2] = rainbow[prediction[rowIndex][colIndex]][1];
//                                 data.data[pix_offset + 3] = rainbow[prediction[rowIndex][colIndex]][2];
//                             }
//                         }
//                         tmp.getContext("2d")!.putImageData(data, 0, 0);

//                         dstCtx.drawImage(src, 0, 0, dst.width, dst.height);
//                         dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height);
//                     }
//                 }
//                 if (GlobalLoopID === LOOP_ID) {
//                     renderRequestId = requestAnimationFrame(render);
//                 }
//             }

//             const end = performance.now();
//             const info2 = document.getElementById("info2") as HTMLCanvasElement;
//             info2.innerText = `processing time: ${end - start}`;
//         };
//         render();
//         return () => {
//             console.log("CANCEL", renderRequestId);
//             cancelAnimationFrame(renderRequestId);
//         };
//     }, [workerProps, strict]);

//     /////////////
//     // render  //
//     /////////////
//     return (
//         <div>
//             <div style={{ display: "flex" }}>
//                 <div style={{ display: "flex" }}>
//                     {inputMedia.mediaType === "IMAGE" ? <img className={classes.inputView} alt="input_img" id="input_img"></img> : <video className={classes.inputView} id="input_video"></video>}
//                     <canvas className={classes.inputView} id="output"></canvas>
//                 </div>
//                 <div className={classes.inputView}>
//                     <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
//                     <DropDown title="processSize" current={processSizeKey} onchange={setProcessSizeKey} options={processSizes} />

//                     <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />

//                     <div>
//                         <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
//                     </div>
//                 </div>
//             </div>
//             <div className={classes.inputView} id="output-div"></div>

//             <div style={{ display: "flex" }}>
//                 <canvas className={classes.inputView} id="tmp" hidden></canvas>
//                 <canvas className={classes.inputView} id="front" hidden></canvas>
//                 <canvas className={classes.inputView} id="src-cache" hidden></canvas>
//             </div>
//             <div>
//                 <div id="info"> </div>
//                 <div id="info2"> </div>
//             </div>
//         </div>
//     );
// };

export default App;
