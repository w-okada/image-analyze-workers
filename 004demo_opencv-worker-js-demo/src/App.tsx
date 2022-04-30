import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { OpenCVProcessTypes, OpenCVWorkerManager } from "@dannadori/opencv-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { OpenCVDrawer } from "./OpenCVDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, VideoInputSelector, VideoInputSelectorProps } from "@dannadori/demo-base";

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
            <Credit></Credit>

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

export default App;
