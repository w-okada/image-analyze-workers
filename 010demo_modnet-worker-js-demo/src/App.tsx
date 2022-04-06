import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { MODNetWorkerManager, BackendTypes } from "@dannadori/modnet-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { MODNetDrawer } from "./MODNetDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";

let GlobalLoopID = 0;

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, backgroundSourceType, setBackgroundSourceType, setBackgroundSource, config, setConfig, params, setParams } = useAppState();

    const videoInputSelectorProps: VideoInputSelectorProps = {
        id: "video-input-selector",
        currentValue: inputSourceType || "File",
        onInputSourceTypeChanged: setInputSourceType,
        onInputSourceChanged: setInputSource,
    };
    const backgroundSelectorProps: VideoInputSelectorProps = {
        id: "background-input-selector",
        currentValue: backgroundSourceType || "File",
        onInputSourceTypeChanged: setBackgroundSourceType,
        onInputSourceChanged: setBackgroundSource,
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

    const modelOptions: { [key: string]: string } = {};
    Object.keys(config.modelJson).map((x) => {
        modelOptions[x] = x;
    });
    const modelSelectorProps: CommonSelectorProps<string> = {
        id: "model-selector",
        title: "model-bytes",
        currentValue: config.modelKey,
        options: modelOptions,
        onChange: (value: string) => {
            config.modelKey = value;
            params.processWidth = config.modelInputs[config.modelKey][0];
            params.processHeight = config.modelInputs[config.modelKey][1];
            setConfig({ ...config });
            setParams({ ...params });
        },
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <VideoInputSelector {...backgroundSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSelector {...backendSelectorProps}></CommonSelector>
            <CommonSelector {...modelSelectorProps}></CommonSelector>
        </div>
    );
};

const App = () => {
    const { inputSource, backgroundSource, config, params } = useAppState();
    const managerRef = useRef<MODNetWorkerManager>();
    const [manager, setManager] = useState<MODNetWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new MODNetWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new MODNetDrawer();
    }, []);

    useEffect(() => {
        const output = document.getElementById("output") as HTMLCanvasElement;
        drawer.setOutputCanvas(output);
    }, []);

    useEffect(() => {
        if (!backgroundSource) {
            return;
        }
        drawer.setBackground(backgroundSource);
    }, [backgroundSource]);

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

//     const [modelKey, setModelKey] = useState(Object.keys(models)[0]);
//     const [onLocal, setOnLocal] = useState(false);
//     const [strict, setStrict] = useState(false);

//     const [inputMedia, setInputMedia] = useState<InputMedia>({
//         mediaType: "IMAGE",
//         media: "yuka_kawamura.png",
//     });
//     const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
//         setInputMedia({ mediaType: mediaType, media: input });
//     };

//     const backgroundChange = (mediaType: VideoInputType, input: string) => {
//         console.log("background:", mediaType, input);
//         if (mediaType === "IMAGE") {
//             const img = document.getElementById("background") as HTMLImageElement;
//             img.src = input;
//         }
//     };
//     ///////////////////////////
//     /// プロパティ設定      ///
//     ///////////////////////////
//     //// モデル切り替え
//     useEffect(() => {
//         const init = async () => {
//             const m = workerProps ? workerProps.manager : new MODNetWorkerManager();
//             const count = workerProps ? workerProps.count + 1 : 0;
//             const c = generateMODNetDefaultConfig();
//             c.processOnLocal = onLocal;
//             c.modelInputSize = processSize[modelKey][0] as MODEL_INPUT_SIZES;
//             console.log("NEW MODE LOAD1");
//             await m.init(c);
//             console.log("NEW MODE LOAD2");

//             const p = generateDefaultMODNetParams();
//             p.processWidth = processSize[modelKey][0];
//             p.processHeight = processSize[modelKey][1];
//             const newProps = { manager: m, config: c, params: p, count: count };
//             setWorkerProps(newProps);
//         };
//         init();
//     }, [modelKey, onLocal]); // eslint-disable-line

//     //// パラメータ変更
//     useEffect(() => {
//         // if (!workerProps) {
//         //     return
//         // }
//         // const p = generateDefaultMODNetParams()
//         // p.processWidth = processSize[modelKey][0]
//         // p.processHeight = processSize[modelKey][1]
//         // setWorkerProps({ ...workerProps, params: p })
//     }, []);

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
//         const tmp = document.getElementById("tmp") as HTMLCanvasElement;
//         const front = document.getElementById("front") as HTMLCanvasElement;
//         const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

//         [dst, tmp, front, srcCache].forEach((c) => {
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
//             // console.log("RENDER::::", LOOP_ID,  workerProps?.params)
//             const start = performance.now();

//             if (workerProps) {
//                 const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//                 const background = document.getElementById("background") as HTMLImageElement;
//                 const dst = document.getElementById("output") as HTMLCanvasElement;
//                 const tmp = document.getElementById("tmp") as HTMLCanvasElement;
//                 const front = document.getElementById("front") as HTMLCanvasElement;
//                 const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

//                 const inference_start = performance.now();
//                 srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);
//                 const prediction = await workerProps.manager.predict(srcCache!, workerProps.params);
//                 const inference_end = performance.now();
//                 const info1 = document.getElementById("info") as HTMLCanvasElement;
//                 info1.innerText = `processing time: ${inference_end - inference_start}`;

//                 // 結果からマスク作成
//                 const res = new ImageData(workerProps.params.processWidth, workerProps.params.processHeight);
//                 try {
//                     for (let i = 0; i < workerProps.params.processHeight; i++) {
//                         for (let j = 0; j < workerProps.params.processWidth; j++) {
//                             const offset = i * workerProps.params.processWidth + j;
//                             res.data[offset * 4 + 0] = 0;
//                             res.data[offset * 4 + 1] = 0;
//                             res.data[offset * 4 + 2] = 0;
//                             res.data[offset * 4 + 3] = prediction![i][j] * 255;
//                         }
//                     }
//                 } catch (exception) {
//                     console.log("exp:", exception);
//                 }
//                 tmp.width = workerProps.params.processWidth;
//                 tmp.height = workerProps.params.processHeight;

//                 tmp.getContext("2d")!.clearRect(0, 0, tmp.width, tmp.height);
//                 tmp.getContext("2d")!.putImageData(res, 0, 0);

//                 dst.getContext("2d")!.clearRect(0, 0, dst.width, dst.height);
//                 dst.getContext("2d")!.drawImage(background, 0, 0, dst.width, dst.height);

//                 front.getContext("2d")!.clearRect(0, 0, front.width, front.height);
//                 front.getContext("2d")!.drawImage(tmp, 0, 0, front.width, front.height);
//                 front.getContext("2d")!.globalCompositeOperation = "source-atop";
//                 front.getContext("2d")!.drawImage(srcCache, 0, 0, front.width, front.height);
//                 front.getContext("2d")!.globalCompositeOperation = "source-over";
//                 dst.getContext("2d")!.drawImage(front, 0, 0, dst.width, dst.height);

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
//                 <div>
//                     <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
//                     <DropDown title="model" current={modelKey} onchange={setModelKey} options={models} />
//                     <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
//                     <Toggle title="Strict" current={strict} onchange={setStrict} />
//                     <FileChooser title="background" onchange={backgroundChange} />
//                     <div>
//                         <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
//                     </div>
//                 </div>
//             </div>

//             <div style={{ display: "flex" }}>
//                 <canvas className={classes.inputView} id="tmp" hidden></canvas>
//                 <canvas className={classes.inputView} id="front" hidden></canvas>
//                 <canvas className={classes.inputView} id="src-cache" hidden></canvas>
//                 <img className={classes.inputView} id="background" alt="background" src="north-star-2869817_640.jpg" hidden></img>
//             </div>
//             <div>
//                 <div id="info"> </div>
//                 <div id="info2"> </div>
//             </div>
//         </div>
//     );
// };

export default App;
