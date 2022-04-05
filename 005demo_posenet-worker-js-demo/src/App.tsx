import { PoseNetWorkerManager, PoseNetArchitecture, PoseNetFunctionTypes, PoseNetQuantBytes, MobileNetMultiplier, PoseNetOutputStride } from "@dannadori/posenet-worker-js";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { PoseNetDrawer } from "./PoseNetDrawer";
import { useAppState } from "./provider/AppStateProvider";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";

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

    const modelSelectorProps: CommonSelectorProps<PoseNetArchitecture> = {
        id: "model-selector",
        title: "architecture",
        currentValue: config.model.architecture,
        options: {
            MobileNetV1: "MobileNetV1",
            ResNet50: "ResNet50",
        },
        onChange: (value: PoseNetArchitecture) => {
            config.model.architecture = value;
            if (value === "ResNet50") {
                config.model.multiplier = 1;
            }
            setConfig({ ...config });
        },
    };

    const functionSelectorProps: CommonSelectorProps<PoseNetFunctionTypes> = {
        id: "function-selector",
        title: "function",
        currentValue: params.type,
        options: {
            singlePerson: PoseNetFunctionTypes.SinglePerson,
            multiPerson: PoseNetFunctionTypes.MultiPerson,
        },
        onChange: (value: PoseNetFunctionTypes) => {
            setParams({ ...params, type: value });
        },
    };

    const outputStrideSelectorProps: CommonSelectorProps<string> = {
        id: "output-stride-selector",
        title: "output stride",
        currentValue: "" + config.model.outputStride,
        options: {
            "8": "8",
            "16": "16",
            "32": "32",
        },
        onChange: (value: string) => {
            config.model.outputStride = parseInt(value) as PoseNetOutputStride;
            setConfig({ ...config });
        },
    };

    const multiplierSelectorProps: CommonSelectorProps<string> = {
        id: "multiplier-selector",
        title: "multiplier",
        currentValue: "" + config.model.multiplier,
        options: {
            "0.5": "0.5",
            "0.75": "0.75",
            "1.0": "1.0",
        },
        onChange: (value: string) => {
            config.model.multiplier = parseFloat(value) as MobileNetMultiplier;
            setConfig({ ...config });
        },
    };
    const quantBytesSelectorProps: CommonSelectorProps<string> = {
        id: "quant-bytes-selector",
        title: "quant-bytes",
        currentValue: "" + config.model.quantBytes,
        options: {
            "1": "1",
            "2": "2",
            "4": "4",
        },
        onChange: (value: string) => {
            config.model.quantBytes = parseInt(value) as PoseNetQuantBytes;
            setConfig({ ...config });
        },
    };

    const maxDetectionSliderProps: CommonSliderProps = {
        id: "max-detection-slider",
        title: "max detection",
        currentValue: params.multiPersonParams.maxDetections!,
        max: 20,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.multiPersonParams.maxDetections = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const scoreThresholdSliderProps: CommonSliderProps = {
        id: "score-threshold-slider",
        title: "score threshold",
        currentValue: params.multiPersonParams.scoreThreshold!,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            params.multiPersonParams.scoreThreshold = value;
            setParams({ ...params });
        },
        integer: false,
    };

    const nmsRadiusSliderProps: CommonSliderProps = {
        id: "nms-radius-slider",
        title: "nms radius",
        currentValue: params.multiPersonParams.nmsRadius!,
        max: 50,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.multiPersonParams.nmsRadius = value;
            setParams({ ...params });
        },
        integer: true,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSelector {...modelSelectorProps}></CommonSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSelector {...functionSelectorProps}></CommonSelector>

            <CommonSelector {...outputStrideSelectorProps}></CommonSelector>
            <CommonSelector {...multiplierSelectorProps}></CommonSelector>
            <CommonSelector {...quantBytesSelectorProps}></CommonSelector>

            <CommonSlider {...maxDetectionSliderProps}></CommonSlider>
            <CommonSlider {...scoreThresholdSliderProps}></CommonSlider>
            <CommonSlider {...nmsRadiusSliderProps}></CommonSlider>
        </div>
    );
};

const App = () => {
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<PoseNetWorkerManager>();
    const [manager, setManager] = useState<PoseNetWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new PoseNetWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new PoseNetDrawer();
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

export default App;
