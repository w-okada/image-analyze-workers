import React, { useEffect, useMemo, useRef, useState } from "react";
import { AsciiArtWorkerManager } from "@dannadori/asciiart-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { AsciiArtDrawer } from "./AsciiArtDraw";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";

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
    const fontSizeSliderProps: CommonSliderProps = {
        id: "font-size-slider",
        title: "font size",
        currentValue: params.fontSize,
        max: 20,
        min: 2,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.fontSize = value;
            setParams({ ...params });
        },
        integer: true,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSlider {...fontSizeSliderProps}></CommonSlider>
        </div>
    );
};

const App = () => {
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<AsciiArtWorkerManager>();
    const [manager, setManager] = useState<AsciiArtWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new AsciiArtWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);
    const drawer = useMemo(() => {
        return new AsciiArtDrawer();
    }, []);
    useEffect(() => {
        const output = document.getElementById("output") as HTMLCanvasElement;
        drawer.setOutputCanvas(output);
        const outputDiv = document.getElementById("output-div") as HTMLDivElement;
        drawer.setOutputDiv(outputDiv);
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
                drawer.draw(snap, params, prediction);
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
        <div style={{ display: "flex", flexDirection: "column" }}>
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
            <div style={{ width: "33%", objectFit: "contain" }}>
                <div id="output-div" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
        </div>
    );
};

// const App = () => {
//     const classes = useStyles();
//     const { videoInputList } = useVideoInputList();
//     const [workerProps, setWorkerProps] = useState<WorkerProps>();

//     const [fontSize, setFontSize] = useState(6);
//     const [ascii, setAscii] = useState(false);
//     const [onLocal, setOnLocal] = useState(true);
//     const [useWasm] = useState(false);
//     const [processWidth] = useState(300);
//     const [processHeight] = useState(300);
//     const [strict] = useState(false);
//     const [guiUpdateCount, setGuiUpdateCount] = useState(0);

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
//             const m = workerProps ? workerProps.manager : new AsciiArtWorkerManager();
//             const count = workerProps ? workerProps.count + 1 : 0;
//             const c = generateAsciiArtDefaultConfig();
//             c.processOnLocal = onLocal;
//             await m.init(c);

//             const p = generateDefaultAsciiArtParams();
//             p.processWidth = processWidth;
//             p.processHeight = processHeight;
//             p.fontSize = fontSize;

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
//         const p = generateDefaultAsciiArtParams();
//         p.processWidth = processWidth;
//         p.processHeight = processHeight;
//         p.fontSize = fontSize;

//         // setWorkerProps({...workerProps, params:p})
//         workerProps.params = p;
//     }, [processWidth, processHeight, fontSize]); // eslint-disable-line

//     /// input設定
//     useEffect(() => {
//         const video = document.getElementById("input_video") as HTMLVideoElement;
//         if (inputMedia.mediaType === "IMAGE") {
//             const img = document.getElementById("input_img") as HTMLImageElement;
//             img.onloadeddata = () => {
//                 resizeDst(img);
//                 setGuiUpdateCount(guiUpdateCount + 1);
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
//             // console.log("RENDER::::", LOOP_ID, renderRequestId,  workerProps?.params)
//             const start = performance.now();

//             const dst = document.getElementById("output") as HTMLCanvasElement;
//             if (workerProps) {
//                 if (dst.width === 0) {
//                     const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//                     resizeDst(src);
//                 }
//                 if (dst.width > 0 && dst.height > 0) {
//                     const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//                     const dst_div = document.getElementById("output-div") as HTMLDivElement;
//                     const tmp = document.getElementById("tmp") as HTMLCanvasElement;
//                     const srcCache = document.getElementById("src-cache") as HTMLCanvasElement;

//                     const tmpCtx = tmp.getContext("2d")!;
//                     const dstCtx = dst.getContext("2d")!;

//                     srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height);

//                     const inference_start = performance.now();
//                     const prediction = await workerProps.manager.predict(srcCache!, workerProps.params);
//                     const inference_end = performance.now();
//                     const info1 = document.getElementById("info") as HTMLCanvasElement;
//                     info1.innerText = `processing time: ${inference_end - inference_start}`;

//                     if (prediction) {
//                         tmpCtx.font = workerProps.params.fontSize + "px monospace";
//                         tmpCtx.textBaseline = "top";
//                         tmp.width = tmpCtx.measureText(prediction[0]).width;
//                         tmp.height = prediction.length * workerProps.params.fontSize;
//                         tmpCtx.clearRect(0, 0, dst.width, dst.height);
//                         tmpCtx.fillStyle = "rgb(0, 0, 0)";
//                         tmpCtx.font = workerProps.params.fontSize + "px monospace";
//                         for (let n = 0; n < prediction.length; n++) {
//                             tmpCtx.fillText(prediction[n], 0, n * workerProps.params.fontSize);
//                         }
//                         dstCtx.clearRect(0, 0, dst.width, dst.height);
//                         dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height);
//                         if (ascii) {
//                             const charCount = prediction[0].length;
//                             const fontSize = Math.ceil(OUT_HEIGHT / charCount);
//                             const a = prediction.reduce((a, n) => {
//                                 return a + "\n" + n + "";
//                             });
//                             dst_div.innerHTML = `<pre style="font-size: ${fontSize}px;">${a}</pre>`;
//                         } else {
//                             dst_div.innerHTML = ``;
//                         }
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
//     }, [workerProps, strict, ascii]);

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
//                     <SingleValueSlider title="fontSize" current={fontSize} onchange={setFontSize} min={2} max={20} step={1} />

//                     <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
//                     <Toggle title="ascii" current={ascii} onchange={setAscii} />
//                     {/* <SingleValueSlider title="processWidth"          current={processWidth}     onchange={setProcessWidth} min={100} max={1024} step={10} />
//                     <SingleValueSlider title="processHeight"         current={processHeight}     onchange={setProcessHeight} min={100} max={1024} step={10} /> */}

//                     {/* <Toggle            title="Strict"        current={strict}         onchange={setStrict} /> */}
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
