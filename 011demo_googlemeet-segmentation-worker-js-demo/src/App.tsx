import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { useAppState } from "./provider/AppStateProvider";
import { GoogleMeetDrawer } from "./GoogleMeetDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { BackendTypes, GoogleMeetSegmentationWorkerManager, InterpolationTypes, PostProcessTypes } from "@dannadori/googlemeet-segmentation-worker-js";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";
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

    const useSimdSwitchProps: CommonSwitchProps = {
        id: "use-simd-switch",
        title: "use SIMD",
        currentValue: config.useSimd,
        onChange: (value: boolean) => {
            config.useSimd = value;
            setConfig({ ...config });
        },
    };

    const useTFJSSwitchProps: CommonSwitchProps = {
        id: "use-tensorflowjs-switch",
        title: "use TensorflowJS",
        currentValue: config.useTFJS,
        onChange: (value: boolean) => {
            config.useTFJS = value;
            setConfig({ ...config });
        },
    };

    const jointBilateralFilterDiameterSliderProps: CommonSliderProps = {
        id: "joint-bilateral-filter-diameter-slider",
        title: "joint bilateral filter diameter",
        currentValue: params.jbfD,
        max: 20,
        min: 0,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.jbfD = value;
            setParams({ ...params });
        },
        integer: true,
    };
    const jointBilateralFilterSigmaColorSliderProps: CommonSliderProps = {
        id: "joint-bilateral-filter-sigma-color-slider",
        title: "joint bilateral filter sigma color",
        currentValue: params.jbfSigmaC,
        max: 20,
        min: 0,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.jbfSigmaC = value;
            setParams({ ...params });
        },
        integer: true,
    };
    const jointBilateralFilterSigmaSpaceSliderProps: CommonSliderProps = {
        id: "joint-bilateral-filter-sigma-space-slider",
        title: "joint bilateral filter sigma space",
        currentValue: params.jbfSigmaS,
        max: 20,
        min: 0,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.jbfSigmaS = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const thresholdSliderProps: CommonSliderProps = {
        id: "threshold-slider",
        title: "threshold",
        currentValue: params.threshold,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            params.threshold = value;
            setParams({ ...params });
        },
        integer: false,
    };

    const postProcessOptions: { [key: string]: PostProcessTypes } = {};
    const postProcessOptionsKey: { [key: string]: string } = {};
    Object.entries(PostProcessTypes).forEach(([x, y]) => {
        postProcessOptions[x] = y;
        postProcessOptionsKey[x] = x;
    });
    const [postProcessOptionKey, setPostProcessOptionKey] = useState<string>(Object.values(postProcessOptionsKey)[0]);
    const postProcessSelectorProps: CommonSelectorProps<string> = {
        id: "postprocess-selector",
        title: "postprocess",
        currentValue: postProcessOptionKey,
        options: postProcessOptionsKey,
        onChange: (value: string) => {
            params.jbfPostProcess = postProcessOptions[value];
            setParams({ ...params });
            setPostProcessOptionKey(value);
        },
    };

    const interpolationOptions: { [key: string]: InterpolationTypes } = {};
    const interpolationOptionsKeys: { [key: string]: string } = {};
    Object.entries(InterpolationTypes).forEach(([x, y]) => {
        interpolationOptions[x] = y;
        interpolationOptionsKeys[x] = x;
    });
    const [interpolationOptionsKey, setInterpolationOptionsKey] = useState<string>(Object.values(interpolationOptionsKeys)[0]);
    const interpolationSelectorProps: CommonSelectorProps<string> = {
        id: "interpolation-selector",
        title: "interpolation",
        currentValue: interpolationOptionsKey,
        options: interpolationOptionsKeys,
        onChange: (value: string) => {
            params.interpolation = interpolationOptions[value];
            setParams({ ...params });
            setInterpolationOptionsKey(value);
        },
    };

    const modelOptions: { [key: string]: string } = {};
    Object.keys(config.modelJsons).map((x) => {
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
            <CommonSelector {...modelSelectorProps}></CommonSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSwitch {...useTFJSSwitchProps}></CommonSwitch>
            <CommonSelector {...backendSelectorProps}></CommonSelector>
            <CommonSwitch {...useSimdSwitchProps}></CommonSwitch>

            <CommonSlider {...jointBilateralFilterDiameterSliderProps}></CommonSlider>
            <CommonSlider {...jointBilateralFilterSigmaColorSliderProps}></CommonSlider>
            <CommonSlider {...jointBilateralFilterSigmaSpaceSliderProps}></CommonSlider>
            <CommonSlider {...thresholdSliderProps}></CommonSlider>
            <CommonSelector {...postProcessSelectorProps}></CommonSelector>
            <CommonSelector {...interpolationSelectorProps}></CommonSelector>
            {/*         

        <CommonSelector {...modelSelectorProps}></CommonSelector> */}
        </div>
    );
};

const App = () => {
    const { inputSource, backgroundSource, config, params, lightWrapping } = useAppState();
    const managerRef = useRef<GoogleMeetSegmentationWorkerManager>();
    const [manager, setManager] = useState<GoogleMeetSegmentationWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new GoogleMeetSegmentationWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new GoogleMeetDrawer();
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
                    // console.log(prediction);
                    if (prediction) {
                        drawer.draw(snap, params, lightWrapping, prediction);
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
            <div style={{ width: "30%", marginLeft: "3%", objectFit: "contain" }}>{<Controller></Controller>}</div>
            <div style={{ position: "absolute", top: "2%", left: "2%", background: "#000000", color: "#aabbaa" }} id="info"></div>
        </div>
    );
};

// const App = () => {
//     const classes = useStyles();
//     const { videoInputList } = useVideoInputList();

//     const manager = useMemo(() => {
//         return new GoogleMeetSegmentationWorkerManager();
//     }, []);
//     const config = useMemo(() => {
//         return generateGoogleMeetSegmentationDefaultConfig();
//     }, []);
//     const params = useMemo(() => {
//         return generateDefaultGoogleMeetSegmentationParams();
//     }, []);

//     const modelKeys = useMemo(() => {
//         const keys: { [key: string]: string } = {};
//         Object.keys(config.modelTFLites).forEach((x) => {
//             keys[x] = x;
//         });
//         return keys;
//     }, []);

//     const processSizeKeys = useMemo(() => {
//         const keys: { [key: string]: string } = {};
//         Object.keys(config.processSizes).forEach((x) => {
//             keys[x] = x;
//         });
//         return keys;
//     }, []);

//     const [workerProps, setWorkerProps] = useState<WorkerProps>();

//     const [modelKey, setModelKey] = useState(Object.keys(modelKeys)[2]);
//     const [processSizeKey, setProcessSizeKey] = useState(Object.keys(processSizeKeys)[2]);

//     const [onLocal, setOnLocal] = useState(true);
//     const [useTFJS, setUseTFJS] = useState(false);
//     const [useSIMD, setUseSIMD] = useState(false);

//     const [jbfD, setJbfD] = useState(0);
//     const [jbfSigmaC, setJbfSigmaC] = useState(2);
//     const [jbfSigmaS, setJbfSigmaS] = useState(2);
//     const [jbfPostProcess, setJbfPostProcess] = useState(3);

//     const [threshold, setThreshold] = useState(0.1);
//     const [interpolation, setInterpolation] = useState(4);
//     const [lightWrapping, setLightWrapping] = useState(1);
//     const [strict] = useState(false);

//     const [inputMedia, setInputMedia] = useState<InputMedia>({
//         mediaType: "IMAGE",
//         media: "img/yuka_kawamura.jpg",
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
//             config.processOnLocal = onLocal;
//             config.modelKey = modelKey;
//             config.useTFJS = useTFJS;
//             config.useSimd = useSIMD;
//             await manager.init(config);
//             const newProps = { manager: manager, config: config, params: params };
//             setWorkerProps(newProps);
//         };
//         init();
//     }, [modelKey, onLocal, useTFJS, useSIMD]); // eslint-disable-line

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
//             if (c.width !== width || c.height !== height) {
//                 c.width = width;
//                 c.height = height;
//             }
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
//             const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//             const background = document.getElementById("background") as HTMLImageElement;
//             const dst = document.getElementById("output") as HTMLCanvasElement;
//             const tmp = document.getElementById("tmp") as HTMLCanvasElement;
//             const front = document.getElementById("front") as HTMLCanvasElement;
//             const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;
//             if (workerProps && src.width > 0 && src.height > 0) {
//                 resizeDst(src);

//                 workerProps.params.processSizeKey = processSizeKey;
//                 workerProps.params.jbfPostProcess = jbfPostProcess;
//                 workerProps.params.jbfD = jbfD;
//                 workerProps.params.jbfSigmaC = jbfSigmaC;
//                 workerProps.params.jbfSigmaS = jbfSigmaS;

//                 workerProps.params.threshold = threshold;
//                 workerProps.params.interpolation = interpolation;

//                 const inference_start = performance.now();
//                 srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);
//                 const prediction = await workerProps.manager.predict(srcCache!, workerProps.params);
//                 const inference_end = performance.now();
//                 const info1 = document.getElementById("info") as HTMLCanvasElement;
//                 info1.innerText = `processing time: ${inference_end - inference_start}`;

//                 tmp.width = workerProps.config.processSizes[params.processSizeKey][0];
//                 tmp.height = workerProps.config.processSizes[params.processSizeKey][1];
//                 // console.log("prediction:::", prediction);

//                 if (prediction) {
//                     tmp.getContext("2d")!.putImageData(prediction!, 0, 0);

//                     // 前景の透過処理
//                     const frontCtx = front.getContext("2d")!;
//                     frontCtx.clearRect(0, 0, front.width, front.height);
//                     frontCtx.drawImage(tmp, 0, 0, front.width, front.height);
//                     frontCtx.globalCompositeOperation = "source-atop";
//                     if (strict) {
//                         frontCtx.drawImage(srcCache, 0, 0, front.width, front.height);
//                     } else {
//                         frontCtx.drawImage(src, 0, 0, front.width, front.height);
//                     }
//                     frontCtx.globalCompositeOperation = "source-over";

//                     // 最終書き込み
//                     const dstCtx = dst.getContext("2d")!;
//                     //// クリア or 背景描画
//                     dstCtx.clearRect(0, 0, dst.width, dst.height);
//                     dstCtx.drawImage(background, 0, 0, dst.width, dst.height);

//                     //// light Wrapping
//                     dstCtx.filter = `blur(${lightWrapping}px)`;
//                     dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height);
//                     dstCtx.filter = "none";

//                     // 前景書き込み
//                     dstCtx.drawImage(front, 0, 0, dst.width, dst.height);
//                 }
//             }
//             const end = performance.now();
//             const info2 = document.getElementById("info2") as HTMLCanvasElement;
//             info2.innerText = `processing time: ${end - start}`;
//             if (GlobalLoopID === LOOP_ID) {
//                 renderRequestId = requestAnimationFrame(render);
//             }
//         };
//         render();
//         return () => {
//             cancelAnimationFrame(renderRequestId);
//         };
//     }, [workerProps, strict, jbfD, jbfSigmaC, jbfSigmaS, jbfPostProcess, threshold, interpolation]);

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
//                     <DropDown title="model" current={modelKey} onchange={setModelKey} options={modelKeys} />
//                     <DropDown title="ProcessSize" current={processSizeKey} onchange={setProcessSizeKey} options={processSizeKeys} />

//                     <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
//                     <Toggle title="useTFJS" current={useTFJS} onchange={setUseTFJS} />
//                     <Toggle title="SIMD" current={useSIMD} onchange={setUseSIMD} />

//                     <SingleValueSlider title="jbfD" current={jbfD} onchange={setJbfD} min={0} max={20} step={1} />
//                     <SingleValueSlider title="jbfSigmaC" current={jbfSigmaC} onchange={setJbfSigmaC} min={0} max={20} step={1} />
//                     <SingleValueSlider title="jbfSigmaS" current={jbfSigmaS} onchange={setJbfSigmaS} min={0} max={20} step={1} />
//                     <SingleValueSlider title="jbfPostProcess" current={jbfPostProcess} onchange={setJbfPostProcess} min={0} max={3} step={1} />

//                     <SingleValueSlider title="Threshold" current={threshold} onchange={setThreshold} min={0.0} max={1.0} step={0.1} />
//                     <SingleValueSlider title="interpolation" current={interpolation} onchange={setInterpolation} min={0} max={4} step={1} />

//                     <FileChooser title="background" onchange={backgroundChange} />
//                     <SingleValueSlider title="lightWrapping" current={lightWrapping} onchange={setLightWrapping} min={0} max={10} step={1} />

//                     <div>
//                         <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
//                     </div>
//                 </div>
//             </div>

//             <div style={{ display: "flex" }}>
//                 <canvas className={classes.inputView} id="tmp" hidden></canvas>
//                 <canvas className={classes.inputView} id="front" hidden></canvas>
//                 <canvas className={classes.inputView} id="src-cache" hidden></canvas>
//                 <img className={classes.inputView} alt="background" id="background" src="img/north-star-2869817_640.jpg" hidden></img>
//             </div>
//             <div>
//                 <div id="info"> </div>
//                 <div id="info2"> </div>
//             </div>
//         </div>
//     );
// };

export default App;
