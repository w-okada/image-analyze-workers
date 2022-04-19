import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { useAppState } from "./provider/AppStateProvider";
import { HandPoseDetectionDrawer } from "./HandPoseDetectionDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, VideoInputSelector, VideoInputSelectorProps } from "demo-base";
import { HandPoseDetectionWorkerManager, BackendTypes, ModelTypes, ModelTypes2 } from "@dannadori/hand-pose-detection-worker-js";
let GlobalLoopID = 0;

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, config, params, setConfig, setParams } = useAppState();

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
    const modelTypeSelectorProps: CommonSelectorProps<ModelTypes> = {
        id: "model-type-selector",
        title: "model type",
        currentValue: config.modelType,
        options: {
            mediapipe: ModelTypes.mediapipe,
            tfjs: ModelTypes.tfjs,
            tflite: ModelTypes.tflite,
        },
        onChange: (value: ModelTypes) => {
            config.modelType = value;
            setConfig({ ...config });
        },
    };
    const modelType2SelectorProps: CommonSelectorProps<ModelTypes2> = {
        id: "model-type-selector",
        title: "model type2",
        currentValue: config.modelType2,
        options: {
            mediapipe_full: ModelTypes2.full,
            mediapipe_lite: ModelTypes2.lite,
            mediapipe_old: ModelTypes2.old,
        },
        onChange: (value: ModelTypes2) => {
            config.modelType2 = value;
            setConfig({ ...config });
        },
    };
    const backendSelectorProps: CommonSelectorProps<BackendTypes> = {
        id: "backend-selector",
        title: "backend",
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

    const annotateBoxSwitchProps: CommonSwitchProps = {
        id: "annotate-box-switch",
        title: "use annotate box",
        currentValue: params.annotateBox,
        onChange: (value: boolean) => {
            params.annotateBox = value;
            setParams({ ...params });
        },
    };

    const maxFacesSliderProps: CommonSliderProps = {
        id: "max-hands-slider",
        title: "max hands",
        currentValue: config.maxHands,
        max: 10,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            config.maxHands = value;
            setConfig({ ...config });
        },
        integer: false,
    };

    const iouThresholdSliderProps: CommonSliderProps = {
        id: "iou-threshold-slider",
        title: "iou threshold",
        currentValue: config.iouThreshold,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            config.iouThreshold = value;
            setConfig({ ...config });
        },
        integer: false,
    };

    const scoreThresholdSliderProps: CommonSliderProps = {
        id: "score-threshold-slider",
        title: "score threshold",
        currentValue: config.scoreThreshold,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            config.scoreThreshold = value;
            setConfig({ ...config });
        },
        integer: false,
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

    const availableConfigTable = useMemo(() => {
        return (
            <table className="table table-compact w-full">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>type</th>
                        <th>backend</th>
                        <th>webworker</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>1</th>
                        <td>mediapipe</td>
                        <td>any(no difference)</td>
                        <td>no</td>
                    </tr>
                    <tr>
                        <th>2</th>
                        <td>tfjs</td>
                        <td>webgl,cpu</td>
                        <td>yes</td>
                    </tr>
                    <tr>
                        <th>3</th>
                        <td>tflite</td>
                        <td>wasm</td>
                        <td>yes</td>
                    </tr>
                </tbody>
            </table>
        );
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Credit></Credit>
            <div>
                <div>available config</div>
                <div>{availableConfigTable}</div>
            </div>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSelector {...modelTypeSelectorProps}></CommonSelector>
            <CommonSelector {...modelType2SelectorProps}></CommonSelector>
            <CommonSelector {...backendSelectorProps}></CommonSelector>
            <CommonSwitch {...annotateBoxSwitchProps}></CommonSwitch>
            <CommonSlider {...maxFacesSliderProps}></CommonSlider>
            <CommonSlider {...iouThresholdSliderProps}></CommonSlider>
            <CommonSlider {...scoreThresholdSliderProps}></CommonSlider>
            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>
        </div>
    );
};
const App = () => {
    const { applicationMode, inputSource, config, params } = useAppState();
    const managerRef = useRef<HandPoseDetectionWorkerManager>();
    const [manager, setManager] = useState<HandPoseDetectionWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new HandPoseDetectionWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new HandPoseDetectionDrawer();
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
    //// (1) Main
    useEffect(() => {
        if (!managerRef.current) {
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
            const snapCtx = snap.getContext("2d")!;
            snapCtx.drawImage(inputSourceElement, 0, 0, snap.width, snap.height);
            try {
                if (snap.width > 0 && snap.height > 0) {
                    const prediction = await managerRef.current!.predict(params, snap);
                    if (prediction) {
                        drawer.draw(snap, config, params, prediction);
                    }
                    // console.log(prediction);
                    // if (applicationMode === ApplicationModes.facemask) {
                    //     drawer.draw(snap, params, prediction);
                    // } else {
                    //     const trackingArea = managerRef.current!.fitCroppedArea(prediction, snap.width, snap.height, params.processWidth, params.processHeight, dst.width, dst.height, 1, 0.4, 0, 0);
                    //     drawer.cropTrackingArea(snap, trackingArea.xmin, trackingArea.ymin, trackingArea.width, trackingArea.height);
                    // }
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
    }, [managerRef.current, applicationMode, inputSourceElement, config, params]);

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
