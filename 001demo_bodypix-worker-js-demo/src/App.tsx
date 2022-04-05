import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BodypixFunctionTypes, BodyPixInternalResolution, BodypixWorkerManager, BodyPixArchitecture, BodyPixMultiplier, BodyPixOutputStride, BodyPixQuantBytes } from "@dannadori/bodypix-worker-js";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";
import { useAppState } from "./provider/AppStateProvider";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { BodyPixDrawer } from "./BodyPixDrawer";

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
    const functionSelectorProps: CommonSelectorProps<BodypixFunctionTypes> = {
        id: "function-selector",
        title: "function",
        currentValue: params.type,
        options: {
            segmentPerson: BodypixFunctionTypes.SegmentPerson,
            segmentPersonParts: BodypixFunctionTypes.SegmentPersonParts,
            segmentMultiPerson: BodypixFunctionTypes.SegmentMultiPerson,
            segmentMultiPersonParts: BodypixFunctionTypes.SegmentMultiPersonParts,
        },
        onChange: (value: BodypixFunctionTypes) => {
            setParams({ ...params, type: value });
        },
    };

    const modelSelectorProps: CommonSelectorProps<BodyPixArchitecture> = {
        id: "model-selector",
        title: "architecture",
        currentValue: config.model.architecture,
        options: {
            MobileNetV1: "MobileNetV1",
            ResNet50: "ResNet50",
        },
        onChange: (value: BodyPixArchitecture) => {
            config.model.architecture = value;
            if (value === "ResNet50") {
                config.model.multiplier = 1;
            }
            setConfig({ ...config });
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
            config.model.outputStride = parseInt(value) as BodyPixOutputStride;
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
            config.model.multiplier = parseFloat(value) as BodyPixMultiplier;
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
            config.model.quantBytes = parseInt(value) as BodyPixQuantBytes;
            setConfig({ ...config });
        },
    };
    const internalResolutionSelectorProps: CommonSelectorProps<string> = {
        id: "internal-resolution-selector",
        title: "internal resolution",
        currentValue: "" + params.segmentMultiPersonPartsParams.internalResolution,
        options: {
            low: "low",
            medium: "medium",
            high: "high",
            full: "full",
        },
        onChange: (value: string) => {
            params.segmentPersonParams.internalResolution = value as BodyPixInternalResolution;
            params.segmentPersonPartsParams.internalResolution = value as BodyPixInternalResolution;
            params.segmentMultiPersonParams.internalResolution = value as BodyPixInternalResolution;
            params.segmentMultiPersonPartsParams.internalResolution = value as BodyPixInternalResolution;
            setParams({ ...params });
        },
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

    const segmentationThresholdSliderProps: CommonSliderProps = {
        id: "segmentation-threshold-slider",
        title: "segmentation threshold",
        currentValue: params.segmentMultiPersonParams.segmentationThreshold!,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            params.segmentPersonParams.segmentationThreshold = value;
            params.segmentPersonPartsParams.segmentationThreshold = value;
            params.segmentMultiPersonParams.segmentationThreshold = value;
            params.segmentMultiPersonPartsParams.segmentationThreshold = value;
            setParams({ ...params });
        },
        integer: false,
    };
    const maxDetectionSliderProps: CommonSliderProps = {
        id: "max-detection-slider",
        title: "max detection",
        currentValue: params.segmentMultiPersonParams.maxDetections!,
        max: 10,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.segmentPersonParams.maxDetections = value;
            params.segmentPersonPartsParams.maxDetections = value;
            params.segmentMultiPersonParams.maxDetections = value;
            params.segmentMultiPersonPartsParams.maxDetections = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const scoreThresholdSliderProps: CommonSliderProps = {
        id: "score-threshold-slider",
        title: "score threshold",
        currentValue: params.segmentMultiPersonParams.scoreThreshold!,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            params.segmentPersonParams.scoreThreshold = value;
            params.segmentPersonPartsParams.scoreThreshold = value;
            params.segmentMultiPersonParams.scoreThreshold = value;
            params.segmentMultiPersonPartsParams.scoreThreshold = value;
            setParams({ ...params });
        },
        integer: false,
    };
    const nmsRadiusSliderProps: CommonSliderProps = {
        id: "nms-radius-slider",
        title: "nms radius",
        currentValue: params.segmentMultiPersonParams.nmsRadius!,
        max: 50,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.segmentPersonParams.nmsRadius = value;
            params.segmentPersonPartsParams.nmsRadius = value;
            params.segmentMultiPersonParams.nmsRadius = value;
            params.segmentMultiPersonPartsParams.nmsRadius = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const minKeypointScoreSliderProps: CommonSliderProps = {
        id: "min-keypoint-score-slider",
        title: "min keypoint score",
        currentValue: params.segmentMultiPersonParams.minKeypointScore!,
        max: 0.9,
        min: 0.1,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            // params.segmentPersonParams.minKeypointScore = value;
            // params.segmentPersonPartsParams.minKeypointScore = value;
            params.segmentMultiPersonParams.minKeypointScore = value;
            params.segmentMultiPersonPartsParams.minKeypointScore = value;
            setParams({ ...params });
        },
        integer: false,
    };

    const refineStepsSliderProps: CommonSliderProps = {
        id: "refine-step-slider",
        title: "refine step",
        currentValue: params.segmentMultiPersonParams.refineSteps!,
        max: 20,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            // params.segmentPersonParams.refineSteps = value;
            // params.segmentPersonPartsParams.refineSteps = value;
            params.segmentMultiPersonParams.refineSteps = value;
            params.segmentMultiPersonPartsParams.refineSteps = value;
            setParams({ ...params });
        },
        integer: true,
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
            <VideoInputSelector {...backgroundSelectorProps}></VideoInputSelector>

            <CommonSelector {...functionSelectorProps}></CommonSelector>
            <CommonSelector {...modelSelectorProps}></CommonSelector>
            <CommonSelector {...outputStrideSelectorProps}></CommonSelector>
            <CommonSelector {...multiplierSelectorProps}></CommonSelector>
            <CommonSelector {...quantBytesSelectorProps}></CommonSelector>
            <CommonSelector {...internalResolutionSelectorProps}></CommonSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSlider {...segmentationThresholdSliderProps}></CommonSlider>
            <CommonSlider {...maxDetectionSliderProps}></CommonSlider>
            <CommonSlider {...scoreThresholdSliderProps}></CommonSlider>
            <CommonSlider {...nmsRadiusSliderProps}></CommonSlider>
            <CommonSlider {...minKeypointScoreSliderProps}></CommonSlider>
            <CommonSlider {...refineStepsSliderProps}></CommonSlider>
            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>
        </div>
    );
};

const App = () => {
    const { inputSource, backgroundSource, config, params } = useAppState();
    const managerRef = useRef<BodypixWorkerManager>();
    const [manager, setManager] = useState<BodypixWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new BodypixWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new BodyPixDrawer();
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
