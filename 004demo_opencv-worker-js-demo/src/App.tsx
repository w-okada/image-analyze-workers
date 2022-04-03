import React, { useEffect, useMemo, useRef, useState } from "react";
import { OpenCVProcessTypes, OpenCVWorkerManager } from "@dannadori/opencv-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { OpenCVDrawer } from "./OpenCVDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";

let GlobalLoopID = 0;

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
    const useSIMDSwitchProps: CommonSwitchProps = {
        id: "use-simd-switch",
        title: "use simd",
        currentValue: config.useSimd,
        onChange: (value: boolean) => {
            config.useSimd = value;
            setConfig({ ...config });
        },
    };

    const functionSelectorProps: CommonSelectorProps<OpenCVProcessTypes> = {
        id: "function-selector",
        title: "function",
        currentValue: params.type,
        options: {
            Blur: OpenCVProcessTypes.Blur,
            GausianBlur: OpenCVProcessTypes.GausianBlur,
            Canny: OpenCVProcessTypes.Canny,
        },
        onChange: (value: OpenCVProcessTypes) => {
            params.type = value;
            setParams({ ...params });
        },
    };

    const kernelSizeSliderProps: CommonSliderProps = {
        id: "kernel-size-slider",
        title: "kernel size",
        currentValue: params.blurParams!.kernelSize,
        max: 50,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.blurParams!.kernelSize = value;
            params.gausianBlurParams!.kernelSize = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const sigmaSliderProps: CommonSliderProps = {
        id: "sigma-slider",
        title: "sigam",
        currentValue: params.gausianBlurParams!.sigma,
        max: 50,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.gausianBlurParams!.sigma = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const threshold1SliderProps: CommonSliderProps = {
        id: "threshold1-slider",
        title: "threshold1",
        currentValue: params.cannyParams!.threshold1,
        max: 50,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.cannyParams!.threshold1 = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const threshold2SliderProps: CommonSliderProps = {
        id: "threshold2-slider",
        title: "threshold2",
        currentValue: params.cannyParams!.threshold2,
        max: 50,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.cannyParams!.threshold2 = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const apertureSizeSliderProps: CommonSliderProps = {
        id: "aperture-size-slider",
        title: "aperture size",
        currentValue: params.cannyParams!.apertureSize,
        max: 7,
        min: 3,
        step: 2,
        width: "30%",
        onChange: (value: number) => {
            params.cannyParams!.apertureSize = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const l2GradientSwitchProps: CommonSwitchProps = {
        id: "l2-gradient-switch",
        title: "l2 gradient",
        currentValue: params.cannyParams!.L2gradient,
        onChange: (value: boolean) => {
            params.cannyParams!.L2gradient = value;
            setParams({ ...params });
        },
    };

    const processWidthSliderProps: CommonSliderProps = {
        id: "process-width-slider",
        title: "process width",
        currentValue: params.processWidth,
        max: 1000,
        min: 100,
        step: 10,
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
        max: 1000,
        min: 100,
        step: 10,
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
            <CommonSwitch {...useSIMDSwitchProps}></CommonSwitch>
            <CommonSelector {...functionSelectorProps}></CommonSelector>
            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>

            <p>blur</p>
            <CommonSlider {...kernelSizeSliderProps}></CommonSlider>
            <CommonSlider {...sigmaSliderProps}></CommonSlider>
            <p>canny</p>
            <CommonSlider {...threshold1SliderProps}></CommonSlider>
            <CommonSlider {...threshold2SliderProps}></CommonSlider>
            <CommonSlider {...apertureSizeSliderProps}></CommonSlider>
            <CommonSwitch {...l2GradientSwitchProps}></CommonSwitch>

            {/*
            <VideoInputSelector {...backgroundSelectorProps}></VideoInputSelector>

            
            <CommonSelector {...modelSelectorProps}></CommonSelector>
            <CommonSelector {...outputStrideSelectorProps}></CommonSelector>
            <CommonSelector {...multiplierSelectorProps}></CommonSelector>
            <CommonSelector {...quantBytesSelectorProps}></CommonSelector>
            <CommonSelector {...internalResolutionSelectorProps}></CommonSelector>
            
            <CommonSlider {...segmentationThresholdSliderProps}></CommonSlider>
            <CommonSlider {...maxDetectionSliderProps}></CommonSlider>
            <CommonSlider {...scoreThresholdSliderProps}></CommonSlider>
            <CommonSlider {...nmsRadiusSliderProps}></CommonSlider>
            <CommonSlider {...minKeypointScoreSliderProps}></CommonSlider>
            <CommonSlider {...refineStepsSliderProps}></CommonSlider>
*/}
        </div>
    );
};

const App = () => {
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<OpenCVWorkerManager>();
    const [manager, setManager] = useState<OpenCVWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new OpenCVWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new OpenCVDrawer();
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
                const prediction = await managerRef.current!.predict(params, snap);
                if (prediction) {
                    drawer.draw(snap, params, prediction);
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
//     const [onLocal, setOnLocal] = useState(true);
//     const [useSIMD, setUseSIMD] = useState(false);

//     const [processTypeKey, setProcessTypeKey] = useState<OpenCVProcessTypes>("Blur");

//     const [kSize, setKSize] = useState(1);
//     const [sigma, setSigma] = useState(1.0);
//     const [th1, setTh1] = useState(1.0);
//     const [th2, setTh2] = useState(1.0);

//     const [apertureSize, setApertureSize] = useState(3);
//     const [l2gradient, setL2gradient] = useState(false);

//     const [inputMedia, setInputMedia] = useState<InputMedia>({
//         mediaType: "IMAGE",
//         media: "yuka_kawamura.jpg",
//     });
//     const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
//         setInputMedia({ mediaType: mediaType, media: input });
//     };

//     ///////////////////////////
//     /// プロパティ設定      ///
//     ///////////////////////////
//     //// モデル切り替え
//     useEffect(() => {
//         const init = async () => {
//             const m = workerProps ? workerProps.manager : new OpenCVWorkerManager();
//             const count = workerProps ? workerProps.count + 1 : 0;
//             const c = generateOpenCVDefaultConfig();
//             c.processOnLocal = onLocal;
//             c.useSimd = useSIMD;
//             await m.init(c);

//             const p = generateDefaultOpenCVParams();
//             const newProps = { manager: m, config: c, params: p, count: count };
//             setWorkerProps(newProps);
//         };
//         init();
//     }, [onLocal, useSIMD]);

//     /// input設定
//     useEffect(() => {
//         if (inputMedia.mediaType === "IMAGE") {
//             const img = document.getElementById("input_img") as HTMLImageElement;
//             img.onloadeddata = () => {
//                 resizeDst(img);
//                 // setGuiUpdateCount(guiUpdateCount + 1);
//             };
//             img.src = inputMedia.media as string;
//         } else if (inputMedia.mediaType === "MOVIE") {
//             const video = document.getElementById("input_video") as HTMLVideoElement;
//             video.pause();
//             video.srcObject = null;
//             video.src = inputMedia.media as string;
//             video.loop = true;
//             video.onloadeddata = () => {
//                 video.play();
//                 resizeDst(video);
//             };
//         } else {
//             const video = document.getElementById("input_video") as HTMLVideoElement;
//             video.pause();
//             video.srcObject = inputMedia.media as MediaStream;
//             video.onloadeddata = () => {
//                 video.play();
//                 resizeDst(video);
//             };
//         }
//     }, [inputMedia]); // eslint-disable-line

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
//             // console.log("RENDER::::", LOOP_ID, renderRequestId, workerProps?.params);
//             const start = performance.now();

//             const dst = document.getElementById("output") as HTMLCanvasElement;
//             if (workerProps) {
//                 if (dst.width === 0) {
//                     const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//                     resizeDst(src);
//                 }
//                 if (dst.width > 0 && dst.height > 0) {
//                     const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//                     const tmp = document.getElementById("tmp") as HTMLCanvasElement;
//                     const tmpCtx = tmp.getContext("2d")!;
//                     const dstCtx = dst.getContext("2d")!;

//                     tmp.width = src.width;
//                     tmp.height = src.height;
//                     if (dst.width != src.width || dst.height != src.height) {
//                         dst.width = src.width;
//                         dst.height = src.height;
//                     }
//                     tmpCtx.drawImage(src, 0, 0, tmp.width, tmp.height);

//                     workerProps.params.processWidth = src.width;
//                     workerProps.params.processHeight = src.height;
//                     workerProps.params.type = processTypeKey;
//                     workerProps.params.blurParams!.kernelSize = kSize;
//                     workerProps.params.gausianBlurParams!.kernelSize = kSize;
//                     workerProps.params.gausianBlurParams!.sigma = sigma;
//                     workerProps.params.cannyParams!.threshold1 = th1;
//                     workerProps.params.cannyParams!.threshold2 = th2;
//                     workerProps.params.cannyParams!.apertureSize = apertureSize;
//                     workerProps.params.cannyParams!.L2gradient = l2gradient;

//                     const inference_start = performance.now();
//                     const prediction = await workerProps.manager.predict(tmp, workerProps.params);
//                     const inference_end = performance.now();
//                     const info1 = document.getElementById("info") as HTMLCanvasElement;
//                     info1.innerText = `processing time: ${inference_end - inference_start}`;
//                     if (prediction) {
//                         const converted = new ImageData(prediction, dst.width, dst.height);
//                         dstCtx.putImageData(converted, 0, 0);
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
//     }, [workerProps, useSIMD, inputMedia, processTypeKey, kSize, sigma, th1, th2, apertureSize, l2gradient]);

//     /////////////
//     // render  //
//     /////////////
//     return (
//         <div>
//             <div style={{ display: "flex" }}>
//                 <div style={{ display: "flex", flexDirection: "row" }}>
//                     {inputMedia.mediaType === "IMAGE" ? <img alt="input_img" id="input_img"></img> : <video id="input_video"></video>}
//                     <canvas id="output"></canvas>
//                 </div>
//                 <div className={classes.inputView}>
//                     <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
//                     <DropDown title="type" current={processTypeKey} onchange={setProcessTypeKey} options={OpenCVProcessTypes} />
//                     <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
//                     <Toggle title="SIMD" current={useSIMD} onchange={setUseSIMD} />

//                     <Typography variant="caption" style={{ marginLeft: 10, color: "red" }}>
//                         Blur
//                     </Typography>
//                     <SingleValueSlider title="kSize" current={kSize} onchange={setKSize} min={1} max={60} step={1} />
//                     <SingleValueSlider title="sigma" current={sigma} onchange={setSigma} min={1} max={60} step={1} />

//                     <Typography variant="caption" style={{ marginLeft: 10, color: "red" }}>
//                         Canny
//                     </Typography>
//                     <SingleValueSlider title="th1" current={th1} onchange={setTh1} min={1} max={30} step={0.01} />
//                     <SingleValueSlider title="th2" current={th2} onchange={setTh2} min={1} max={30} step={0.01} />

//                     <SingleValueSlider title="apertureSize" current={apertureSize} onchange={setApertureSize} min={3} max={7} step={2} />
//                     <Toggle title="l2gradient" current={l2gradient} onchange={setL2gradient} />
//                     <div>
//                         <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
//                     </div>
//                 </div>
//             </div>
//             <div className={classes.inputView} id="output-div"></div>

//             <div style={{ display: "flex" }}>
//                 <canvas className={classes.inputView} id="tmp" style={{ display: "none" }} hidden></canvas>
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
