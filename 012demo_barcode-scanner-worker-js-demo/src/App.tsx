import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BarcodeScannerWorkerManager, ScanModes, ScanScales } from "@dannadori/barcode-scanner-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { BarcodeScannerDrawer } from "./BarcodeScannerDrawer";
import { CommonSelector, CommonSelectorProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";

let GlobalLoopID = 0;

// const cameraResolutions: { [key: string]: number[] } = {
//     "450x450": [450, 450],
//     "600x600": [600, 600],
//     "900x900": [900, 900],
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
    const useSimdSwitchProps: CommonSwitchProps = {
        id: "use-simd-switch",
        title: "use SIMD",
        currentValue: config.useSimd,
        onChange: (value: boolean) => {
            config.useSimd = value;
            setConfig({ ...config });
        },
    };

    const scanScaleOptions: { [key: string]: ScanScales } = {};
    const scanScaleOptionsKeys: { [key: string]: string } = {};
    Object.entries(ScanScales).forEach(([x, y]) => {
        scanScaleOptions[x] = y;
        scanScaleOptionsKeys[x] = x;
    });
    const [scanScaleOptionsKey, setScanScaleOptionsKey] = useState<string>(Object.values(scanScaleOptionsKeys)[0]);
    const scanScaleSelectorProps: CommonSelectorProps<string> = {
        id: "scan-scale-selector",
        title: "scan scale",
        currentValue: scanScaleOptionsKey,
        options: scanScaleOptionsKeys,
        onChange: (value: string) => {
            params.scale = scanScaleOptions[value];
            setParams({ ...params });
            setScanScaleOptionsKey(value);
        },
    };

    const scanModeOptions: { [key: string]: ScanModes } = {};
    const scanModeOptionsKeys: { [key: string]: string } = {};
    Object.entries(ScanModes).forEach(([x, y]) => {
        scanModeOptions[x] = y;
        scanModeOptionsKeys[x] = x;
    });
    const [scanModeOptionsKey, setScanModeOptionsKey] = useState<string>(Object.values(scanModeOptionsKeys)[0]);
    const scanModeSelectorProps: CommonSelectorProps<string> = {
        id: "scan-mode-selector",
        title: "scan mode",
        currentValue: scanModeOptionsKey,
        options: scanModeOptionsKeys,
        onChange: (value: string) => {
            params.type = scanModeOptions[value];
            setParams({ ...params });
            setScanModeOptionsKey(value);
        },
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSwitch {...useSimdSwitchProps}></CommonSwitch>

            <CommonSelector {...scanScaleSelectorProps}></CommonSelector>
            <CommonSelector {...scanModeSelectorProps}></CommonSelector>
        </div>
    );
};

const App = () => {
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<BarcodeScannerWorkerManager>();
    const [manager, setManager] = useState<BarcodeScannerWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new BarcodeScannerWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new BarcodeScannerDrawer();
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

//     const manager = useMemo(() => {
//         return new BarcodeScannerWorkerManager();
//     }, []);
//     const config = useMemo(() => {
//         return generateBarcodeScannerDefaultConfig();
//     }, []);
//     const params = useMemo(() => {
//         return generateDefaultBarcodeScannerParams();
//     }, []);

//     const scanModeKeys = useMemo(() => {
//         const keys: { [key: string]: string } = {};
//         Object.keys(config.scanModes).forEach((x) => {
//             keys[x] = x;
//         });
//         return keys;
//     }, []);

//     const scanScaleKeys = useMemo(() => {
//         const keys: { [key: string]: string } = {};
//         Object.keys(config.scanScales).forEach((x) => {
//             keys[x] = x;
//         });
//         return keys;
//     }, []);

//     const { videoInputList } = useVideoInputList();
//     const [workerProps, setWorkerProps] = useState<WorkerProps>();

//     const [scanModeKey, setScanModeKey] = useState(Object.keys(scanModeKeys)[0]);
//     const [scanScaleKey, setScanScaleKey] = useState(Object.keys(scanScaleKeys)[0]);
//     const [useSIMD, setUseSIMD] = useState(false);
//     const [onLocal, setOnLocal] = useState(true);

//     const [inputMedia, setInputMedia] = useState<InputMedia>({
//         mediaType: "IMAGE",
//         media: "./img/barcode_01.jpg",
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
//             config.processOnLocal = onLocal;
//             config.useSimd = useSIMD;
//             await manager.init(config);

//             params.scale = config.scanScales[scanScaleKey];
//             params.type = config.scanModes[scanModeKey];
//             const newProps = { manager: manager, config: config, params: params };
//             console.log("CALLED new MANAGER", onLocal);
//             setWorkerProps(newProps);
//         };
//         init();
//     }, [useSIMD, onLocal]); // eslint-disable-line

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
//         } else if (inputMedia.mediaType === "MOVIE_URL") {
//             const vid = document.getElementById("input_video") as HTMLVideoElement;
//             vid.pause();
//             vid.srcObject = null;
//             vid.src = inputMedia.media as string;
//             vid.loop = true;
//             vid.onloadeddata = () => {
//                 video.play();
//                 resizeDst(vid);
//             };
//             // setSrc(vid)
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
//     const resizeDst = (_input: HTMLElement) => {
//         // const cs = getComputedStyle(input)
//         // const width = parseInt(cs.getPropertyValue("width"))
//         // const height = parseInt(cs.getPropertyValue("height"))
//         // const dst = document.getElementById("output") as HTMLCanvasElement
//         // const tmp = document.getElementById("tmp") as HTMLCanvasElement
//         // const front = document.getElementById("front") as HTMLCanvasElement
//         // const srcCache = document.getElementById("src-cache") as HTMLCanvasElement
//         // [dst, tmp, front, srcCache].forEach((c)=>{
//         //     c.width = width
//         //     c.height = height
//         // })
//     };

//     //////////////////
//     //  pipeline    //
//     //////////////////
//     useEffect(() => {
//         console.log("[Pipeline] Start", workerProps);
//         let renderRequestId: number;
//         const LOOP_ID = performance.now();
//         GlobalLoopID = LOOP_ID;

//         const src = (document.getElementById("input_img") as HTMLImageElement) || (document.getElementById("input_video") as HTMLVideoElement);
//         const dst = document.getElementById("dst") as HTMLCanvasElement;
//         const dstCtx = dst.getContext("2d")!;

//         const render = async () => {
//             console.log("RENDER::::", LOOP_ID, renderRequestId, workerProps?.params);
//             const start = performance.now();

//             if (workerProps) {
//                 const cs = getComputedStyle(src);
//                 const width = parseInt(cs.getPropertyValue("width"));
//                 const height = parseInt(cs.getPropertyValue("height"));
//                 if (dst.width !== width || dst.height !== height) {
//                     dst.width = width;
//                     dst.height = height;
//                 }
//                 workerProps.params.scale = config.scanScales[scanScaleKey];
//                 workerProps.params.type = config.scanModes[scanModeKey];

//                 const prediction = await workerProps.manager.predict(src!, workerProps.params);
//                 // const prediction = [] as BarcodeInfo[]
//                 if (!prediction) {
//                     //// For null return, retry
//                     if (GlobalLoopID === LOOP_ID) {
//                         renderRequestId = requestAnimationFrame(render);
//                     }
//                     return;
//                 }

//                 // console.log("RETRUN PREDICT", prediction)

//                 //// 結果の描画
//                 dstCtx.clearRect(0, 0, dst.width, dst.height);
//                 prediction.forEach((info) => {
//                     // console.log(info)
//                     if (info.barcode_data.length === 0) {
//                         return;
//                     }
//                     dstCtx.beginPath();
//                     dstCtx.moveTo(info.p1_x * dst.width, info.p1_y * dst.height);
//                     dstCtx.lineTo(info.p2_x * dst.width, info.p2_y * dst.height);
//                     dstCtx.lineTo(info.p3_x * dst.width, info.p3_y * dst.height);
//                     dstCtx.lineTo(info.p4_x * dst.width, info.p4_y * dst.height);
//                     dstCtx.lineTo(info.p1_x * dst.width, info.p1_y * dst.height);
//                     dstCtx.closePath();
//                     // 塗りつぶしスタイルを設定
//                     dstCtx.fillStyle = "Red";
//                     dstCtx.globalAlpha = 0.5;
//                     // パスに沿って塗りつぶし
//                     dstCtx.fill();

//                     // dstCtx.strokeRect(info.px_x * dst.width, info.px_y * dst.height, info.px_w * dst.width, info.px_h * dst.height);
//                     dstCtx.fillStyle = "Blue";
//                     dstCtx.font = "20px Arial";
//                     dstCtx.fillText(info.barcode_data, info.p1_x * dst.width, info.p1_y * dst.height);
//                     // dstCtx.fillText(info.barcode_data + ` [${w}, ${h}]`, info.p1_x * dst.width, info.p1_y * dst.height)
//                 });
//                 if (GlobalLoopID === LOOP_ID) {
//                     // console.log("", GlobalLoopID, renderRequestId)
//                     renderRequestId = requestAnimationFrame(render);
//                 } else {
//                     console.log("NOT NEXT LOOP ", GlobalLoopID, renderRequestId);
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
//     }, [workerProps, inputMedia, scanModeKey, scanScaleKey]);

//     /////////////
//     // render  //
//     /////////////
//     return (
//         <div>
//             <div
//                 style={{
//                     position: "relative",
//                     display: "flex",
//                     flexDirection: "column",
//                 }}
//             >
//                 <div>
//                     <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} cameraResolutions={cameraResolutions} />
//                     {/* <DropDown title="model" current={modelKey} onchange={setModelKey} options={models} /> */}
//                     <DropDown title="ScanMode" current={scanModeKey} onchange={setScanModeKey} options={scanModeKeys} />
//                     <DropDown title="ScanScale" current={scanScaleKey} onchange={setScanScaleKey} options={scanScaleKeys} />
//                     <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
//                     <Toggle title="SIMD" current={useSIMD} onchange={setUseSIMD} />
//                     <div>
//                         <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
//                     </div>
//                 </div>
//                 <div style={{ position: "relative" }}>
//                     {inputMedia.mediaType === "IMAGE" ? (
//                         // <img className={classes.inputView} style={{width:"100%"}} id="input_img" alt=""></img>
//                         <img className={classes.inputView} style={{ width: "100%", position: "absolute" }} id="input_img" alt="input_img"></img>
//                     ) : (
//                         <video className={classes.inputView} style={{ width: "100%", position: "absolute" }} id="input_video"></video>
//                     )}
//                 </div>
//             </div>
//             <canvas style={{ position: "relative" }} id="dst"></canvas>

//             <div style={{ position: "relative", display: "flex" }}>
//                 <canvas className={classes.inputView} id="input_canvas" hidden></canvas>
//                 <canvas className={classes.inputView} id="original_canvas" hidden></canvas>
//                 <canvas className={classes.inputView} id="src-cache" hidden></canvas>

//                 {/* <img className={classes.inputView} style={{width:"100%"}} id="tmp_img" alt=""></img> */}
//             </div>

//             <div>
//                 <div id="info"></div>
//                 <div id="info2"></div>
//                 <div>
//                     <canvas className={classes.inputView} id="input_barcode"></canvas>
//                 </div>
//             </div>
//         </div>
//     );
// };

export default App;
