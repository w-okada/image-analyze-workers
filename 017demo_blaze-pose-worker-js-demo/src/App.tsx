import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BlazePoseWorkerManager, useAppState, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes } from "./provider/AppStateProvider";
import { BlazePoseDrawer } from "./BlazeFaceDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, VideoInputSelector, VideoInputSelectorProps } from "@dannadori/demo-base";

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

    const modelTypeSelectorProps: CommonSelectorProps<ModelTypes> = {
        id: "model-type-selector",
        title: "model type",
        currentValue: config.modelType,
        options: {
            mediapipe: "mediapipe",
            tfjs: "tfjs",
            tflite: "tflite",
        },
        onChange: (value: ModelTypes) => {
            config.modelType = value;
            setConfig({ ...config });
        },
    };

    const detectorModelTypeSelectorProps: CommonSelectorProps<DetectorTypes> = {
        id: "detector-model-type-selector",
        title: "detector model type",
        currentValue: config.detectorModelKey,
        options: {
            lite: DetectorTypes.lite,
        },
        onChange: (value: DetectorTypes) => {
            config.detectorModelKey = value;
            setConfig({ ...config });
        },
    };
    const landmarkModelTypeSelectorProps: CommonSelectorProps<LandmarkTypes> = {
        id: "landmark-model-type-selector",
        title: "landmark model type",
        currentValue: config.landmarkModelKey,
        options: {
            lite: LandmarkTypes.lite,
            full: LandmarkTypes.full,
            heavy: LandmarkTypes.heavy,
        },
        onChange: (value: LandmarkTypes) => {
            config.landmarkModelKey = value;
            setConfig({ ...config });
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

    const movingAverageWindowSliderProps: CommonSliderProps = {
        id: "moving-average-window-slider",
        title: "moving average window",
        currentValue: params.movingAverageWindow,
        max: 100,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.movingAverageWindow = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const affineResizedSliderProps: CommonSliderProps = {
        id: "affine-resized-slider",
        title: "affine resized ",
        currentValue: params.affineResizedFactor,
        max: 8,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.affineResizedFactor = value;
            setParams({ ...params });
        },
        integer: true,
    };
    const cropExtentionSliderProps: CommonSliderProps = {
        id: "crop-extention-slider",
        title: "crop extention",
        currentValue: params.cropExt,
        max: 2,
        min: 1,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            params.cropExt = value;
            setParams({ ...params });
        },
        integer: false,
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
            <CommonSelector {...backendSelectorProps}></CommonSelector>
            <CommonSelector {...modelTypeSelectorProps}></CommonSelector>
            <CommonSelector {...detectorModelTypeSelectorProps}></CommonSelector>
            <CommonSelector {...landmarkModelTypeSelectorProps}></CommonSelector>

            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>
            <CommonSlider {...movingAverageWindowSliderProps}></CommonSlider>
            <CommonSlider {...affineResizedSliderProps}></CommonSlider>
            <CommonSlider {...cropExtentionSliderProps}></CommonSlider>
            {/* <CommonSlider {...maxFaceSliderProps}></CommonSlider> moving averageを使うので複数検出はしない*/}
        </div>
    );
};
const App = () => {
    console.log("render2");
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<BlazePoseWorkerManager>();
    const [manager, setManager] = useState<BlazePoseWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new BlazePoseWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new BlazePoseDrawer();
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
                    console.log("prediction", prediction);
                    if (prediction) {
                        drawer.draw(snap, config, params, prediction);
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
