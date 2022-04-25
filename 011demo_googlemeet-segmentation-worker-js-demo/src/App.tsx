import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { useAppState } from "./provider/AppStateProvider";
import { GoogleMeetDrawer } from "./GoogleMeetDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { GoogleMeetSegmentationWorkerManager, InterpolationTypes, PostProcessTypes } from "./provider/AppStateProvider";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, VideoInputSelector, VideoInputSelectorProps } from "demo-base";
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

    const useSimdSwitchProps: CommonSwitchProps = {
        id: "use-simd-switch",
        title: "use SIMD",
        currentValue: config.useSimd,
        onChange: (value: boolean) => {
            config.useSimd = value;
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
    Object.keys(config.modelTFLites).map((x) => {
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
            <Credit></Credit>

            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <VideoInputSelector {...backgroundSelectorProps}></VideoInputSelector>
            <CommonSelector {...modelSelectorProps}></CommonSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
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
                        drawer.draw(inputSourceElement, params, lightWrapping, prediction);
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

export default App;
