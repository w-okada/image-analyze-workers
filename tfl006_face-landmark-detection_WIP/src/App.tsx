import React, { useEffect, useMemo } from "react";
import "./App.css";
import { useAppState } from "./provider/AppStateProvider";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
// import { useAppState } from "./provider/AppStateProvider";
// import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { Credit, VideoInputSelector, VideoInputSelectorProps} from "demo-base";
import { INPUT_HEIGHT, INPUT_WIDTH } from "./const";
let GlobalLoopID = 0;

const Controller = () => {
const { inputSourceType, setInputSourceType, setInputSource, config, params, setConfig, setParams, applicationMode, setApplicationMode } = useAppState();
const videoInputSelectorProps: VideoInputSelectorProps = {
    id: "video-input-selector",
    currentValue: inputSourceType || "File",
    onInputSourceTypeChanged: setInputSourceType,
    onInputSourceChanged: setInputSource,
};
// const onLocalSwitchProps: CommonSwitchProps = {
//     id: "on-local-switch",
//     title: "process on local",
//     currentValue: config.processOnLocal,
//     onChange: (value: boolean) => {
//         config.processOnLocal = value;
//         setConfig({ ...config });
//     },
// };
// const backendSelectorProps: CommonSelectorProps<BackendTypes> = {
//     id: "backend-selector",
//     title: "internal resolution",
//     currentValue: config.backendType,
//     options: {
//         WebGL: BackendTypes.WebGL,
//         wasm: BackendTypes.wasm,
//         cpu: BackendTypes.cpu,
//     },
//     onChange: (value: BackendTypes) => {
//         config.backendType = value;
//         setConfig({ ...config });
//     },
// };
// const annotateBoxSwitchProps: CommonSwitchProps = {
//     id: "annotate-box-switch",
//     title: "use annotate box",
//     currentValue: params.annotateBox,
//     onChange: (value: boolean) => {
//         params.annotateBox = value;
//         setParams({ ...params });
//     },
// };
// const applicationModeSelectorProps: CommonSelectorProps<ApplicationModes> = {
//     id: "application-mode-selector",
//     title: "application mode",
//     currentValue: applicationMode,
//     options: {
//         facemask: ApplicationModes.facemask,
//         tracking: ApplicationModes.tracking,
//     },
//     onChange: (value: ApplicationModes) => {
//         setApplicationMode(value);
//     },
// };
// const maxFacesSliderProps: CommonSliderProps = {
//     id: "max-faces-slider",
//     title: "max faces",
//     currentValue: config.maxFaces,
//     max: 10,
//     min: 1,
//     step: 1,
//     width: "30%",
//     onChange: (value: number) => {
//         config.maxFaces = value;
//         setConfig({ ...config });
//     },
//     integer: false,
// };
// const iouThresholdSliderProps: CommonSliderProps = {
//     id: "iou-threshold-slider",
//     title: "iou threshold",
//     currentValue: config.iouThreshold,
//     max: 1,
//     min: 0,
//     step: 0.1,
//     width: "30%",
//     onChange: (value: number) => {
//         config.iouThreshold = value;
//         setConfig({ ...config });
//     },
//     integer: false,
// };
// const scoreThresholdSliderProps: CommonSliderProps = {
//     id: "score-threshold-slider",
//     title: "score threshold",
//     currentValue: config.scoreThreshold,
//     max: 1,
//     min: 0,
//     step: 0.1,
//     width: "30%",
//     onChange: (value: number) => {
//         config.scoreThreshold = value;
//         setConfig({ ...config });
//     },
//     integer: false,
// };
// const processWidthSliderProps: CommonSliderProps = {
//     id: "process-width-slider",
//     title: "process width",
//     currentValue: params.processWidth,
//     max: 1000,
//     min: 100,
//     step: 10,
//     width: "30%",
//     onChange: (value: number) => {
//         params.processWidth = value;
//         setParams({ ...params });
//     },
//     integer: true,
// };
// const processHeightSliderProps: CommonSliderProps = {
//     id: "process-height-slider",
//     title: "process height",
//     currentValue: params.processHeight,
//     max: 1000,
//     min: 100,
//     step: 10,
//     width: "30%",
//     onChange: (value: number) => {
//         params.processHeight = value;
//         setParams({ ...params });
//     },
//     integer: true,
// };
// const movingAverageWindowSliderProps: CommonSliderProps = {
//     id: "moving-average-window-slider",
//     title: "moving average window",
//     currentValue: params.movingAverageWindow,
//     max: 100,
//     min: 1,
//     step: 1,
//     width: "30%",
//     onChange: (value: number) => {
//         params.movingAverageWindow = value;
//         setParams({ ...params });
//     },
//     integer: true,
// };
return (
    <div style={{ display: "flex", flexDirection: "column" }}>
        <Credit></Credit>
        <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
        {/* <CommonSwitch {...onLocalSwitchProps}></CommonSwitch> */}
        {/* <CommonSelector {...backendSelectorProps}></CommonSelector> */}
        {/* <CommonSwitch {...annotateBoxSwitchProps}></CommonSwitch> */}
        {/* <CommonSelector {...applicationModeSelectorProps}></CommonSelector> */}
        {/* <CommonSlider {...maxFacesSliderProps}></CommonSlider> */}
        {/* <CommonSlider {...iouThresholdSliderProps}></CommonSlider> */}
        {/* <CommonSlider {...scoreThresholdSliderProps}></CommonSlider> */}
        {/* <CommonSlider {...processWidthSliderProps}></CommonSlider> */}
        {/* <CommonSlider {...processHeightSliderProps}></CommonSlider> */}
        {/* <CommonSlider {...movingAverageWindowSliderProps}></CommonSlider> */}
    </div>
);
};

const App = () => {
    const { tflite, inputSource, config, params  } = useAppState();

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
    //// (1) Main
    useEffect(() => {
        if (!tflite) {
            return;
        }
        console.log("Renderer Initialized");
        let renderRequestId: number;
        const LOOP_ID = performance.now();
        GlobalLoopID = LOOP_ID;

        const dst = document.getElementById("output") as HTMLCanvasElement;
        const test = document.getElementById("test") as HTMLCanvasElement;
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
            [snap, dst, test].forEach((x) => {
                const width = inputSourceElement instanceof HTMLVideoElement ? inputSourceElement.videoWidth : inputSourceElement.naturalWidth;
                const height = inputSourceElement instanceof HTMLVideoElement ? inputSourceElement.videoHeight : inputSourceElement.naturalHeight;
                if (x.width != width || x.height != height) {
                    x.width = width;
                    x.height = height;
                }
            });
            snap.width=params.processWidth
            snap.height=params.processHeight
            dst.width=params.processWidth
            dst.height=params.processHeight
            const snapCtx = snap.getContext("2d")!;
            snapCtx.drawImage(inputSourceElement, 0, 0, snap.width, snap.height);
            try {
                if (snap.width > 0 && snap.height > 0) {
                    const res = tflite.exec(config, params, snap)

                    const dstCtx = dst.getContext("2d")!
                    dstCtx.drawImage(snap, 0, 0, dst.width, dst.height)
                    res.forEach(hand=>{
                        dstCtx.fillStyle="#ff0000aa";
                        dstCtx.fillRect(                        
                        (hand.palm.minX)*dst.width, 
                        (hand.palm.minY)*dst.height, 
                        (hand.palm.maxX - hand.palm.minX)*dst.width, (hand.palm.maxY - hand.palm.minY) *dst.height)

                        dstCtx.fillStyle="#00ff00aa";
                        dstCtx.fillRect(                        
                            (hand.hand.minX)*dst.width, 
                            (hand.hand.minY)*dst.height, 
                            (hand.hand.maxX - hand.hand.minX)*dst.width, 
                            (hand.hand.maxY - hand.hand.minY) *dst.height
                        )
                        dstCtx.fillStyle="#0000ffaa";
                        hand.rotatedHand.positions.forEach(p=>{
                            dstCtx.fillRect(p.x*dst.width, p.y*dst.height, 10,10)
                        })

                        dstCtx.fillStyle="#00ffffaa";
                        hand.palmKeypoints.forEach(p=>{
                            dstCtx.fillRect(p.x*dst.width, p.y*dst.height, 10,10)
                        })

                        dstCtx.fillStyle="#ffffffaa";
                        hand.landmarkKeypoints.forEach(p=>{
                            dstCtx.fillRect(p.x*dst.width, p.y*dst.height, 10,10)
                        })

                    })
                }
            } catch (error) {
                console.log("ERROR drawing", error);
            }

            if (GlobalLoopID === LOOP_ID) {
                renderRequestId = requestAnimationFrame(render);
                // setTimeout(()=>{
                //     render()
                // },1000*1)
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
    }, [inputSourceElement]);

    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", objectFit: "contain", alignItems: "flex-start" }}>
            <div style={{ width: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
                <div
                    style={{ width: "33%", objectFit: "contain" }}
                    ref={(ref) => {
                        ref?.replaceChildren(inputSourceElement);
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
            <div style={{ width: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
                <canvas id="test" style={{ width: "33%", objectFit: "contain" }}></canvas>
                <canvas id="mask" style={{ width: "33%", objectFit: "contain" }}></canvas>
            </div>
        </div>
    );
};

export default App;
