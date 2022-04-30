import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { InterpolationTypes, SuperResolutionWorkerManager, BackendTypes } from "@dannadori/super-resolution-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { SuperResolutionDrawer } from "./SuperResolutionDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, VideoInputSelector, VideoInputSelectorProps } from "@dannadori/demo-base";

let GlobalLoopID = 0;

const filePaths: { [key: string]: string } = {
    sample: "./img/yuka_kawamura.jpg",
};
const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, config, setConfig, params, setParams } = useAppState();

    const videoInputSelectorProps: VideoInputSelectorProps = {
        id: "video-input-selector",
        currentValue: inputSourceType || "File",
        onInputSourceTypeChanged: setInputSourceType,
        onInputSourceChanged: setInputSource,
        filePaths: filePaths,
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

    const useTFJSSwitchProps: CommonSwitchProps = {
        id: "use-tensorflowJS-switch",
        title: "use tensorflowJS",
        currentValue: config.useTFJS,
        onChange: (value: boolean) => {
            config.useTFJS = value;
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

    const modelOptions: { [key: string]: string } = {};
    Object.keys(config.modelJson).map((x) => {
        modelOptions[x] = x;
    });
    const modelSelectorProps: CommonSelectorProps<string> = {
        id: "model-selector",
        title: "model-bytes",
        currentValue: config.modelKey,
        options: modelOptions,
        onChange: (value: string) => {
            config.modelKey = value;
            setConfig({ ...config });
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
        id: "interpolation-type-selector",
        title: "interpolation type",
        currentValue: interpolationOptionsKey,
        options: interpolationOptionsKeys,
        onChange: (value: string) => {
            params.interpolation = interpolationOptions[value];
            setParams({ ...params });
            setInterpolationOptionsKey(value);
        },
    };

    const processWidthSliderProps: CommonSliderProps = {
        id: "process-width-slider",
        title: "process width",
        currentValue: params.processWidth,
        max: 512,
        min: 128,
        step: 128,
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
        max: 512,
        min: 128,
        step: 128,
        width: "30%",
        onChange: (value: number) => {
            params.processHeight = value;
            setParams({ ...params });
        },
        integer: true,
    };
    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Credit></Credit>

            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSelector {...modelSelectorProps}></CommonSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSwitch {...useSimdSwitchProps}></CommonSwitch>
            <CommonSwitch {...useTFJSSwitchProps}></CommonSwitch>
            <CommonSelector {...backendSelectorProps}></CommonSelector>

            <CommonSelector {...interpolationSelectorProps}></CommonSelector>
            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>
        </div>
    );
};

const App = () => {
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<SuperResolutionWorkerManager>();
    const [manager, setManager] = useState<SuperResolutionWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new SuperResolutionWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new SuperResolutionDrawer();
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
        // elem.style.objectFit = "contain";
        // elem.style.width = "100%";
        // elem.style.height = "100%";
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
            inputSourceElement.width = params.processWidth;
            inputSourceElement.height = params.processHeight;
            snap.width = params.processWidth;
            snap.height = params.processHeight;

            const snapCtx = snap.getContext("2d")!;
            snapCtx.drawImage(inputSourceElement, 0, 0, snap.width, snap.height);
            try {
                if (snap.width > 0 && snap.height > 0) {
                    const prediction = await managerRef.current!.predict(params, snap);
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

    const outputCanvas = useMemo(() => {
        const output = document.createElement("canvas");
        output.id = "output";
        return output;
        // return  <canvas id="output" />
    }, []);

    return (
        <div style={{ width: "100%", height: "100%", display: "flex", objectFit: "contain", alignItems: "flex-start" }}>
            <div style={{ width: "66%" }}>
                <div
                    style={{ display: "flex", alignItems: "flex-start" }}
                    ref={(ref) => {
                        ref?.replaceChildren(inputSourceElement, outputCanvas);
                    }}
                ></div>
            </div>
            <div style={{ width: "33%", objectFit: "contain" }}></div>
            <div style={{ width: "30%", marginLeft: "3%", objectFit: "contain" }}>
                <Controller></Controller>
            </div>
            <div style={{ position: "absolute", top: "2%", left: "2%", background: "#000000", color: "#aabbaa" }} id="info"></div>
        </div>
    );
};

export default App;
