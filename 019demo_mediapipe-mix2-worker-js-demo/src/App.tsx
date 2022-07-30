import React, { useEffect, useMemo } from "react";
import "./App.css";
import { useAppState } from "./provider/AppStateProvider";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, Credit, VideoInputSelector, VideoInputSelectorProps } from "@dannadori/demo-base";
import { BlazePoseDrawer } from "./BlazePoseDrawer";
import { FacemeshDrawer } from "./FacemeshDrawer";
import { HandPoseDetectionDrawer } from "./HandPoseDetectionDrawer";
import { FacePredictionEx, HandPredictionEx, OperationType, PosePredictionEx } from "@dannadori/mediapipe-mix2-worker-js";

let GlobalLoopID = 0;

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, config, params, setConfig, setParams } = useAppState();

    if (!config) {
        return <></>;
    }

    const videoInputSelectorProps: VideoInputSelectorProps = {
        id: "video-input-selector",
        currentValue: inputSourceType || "File",
        onInputSourceTypeChanged: setInputSourceType,
        onInputSourceChanged: setInputSource,
    };

    const operationTypeSelectorProps: CommonSelectorProps<OperationType> = {
        id: "operation-type-selector",
        title: "operation type",
        currentValue: params.operationType,
        options: {
            hand: OperationType.hand,
            face: OperationType.face,
            pose: OperationType.pose,
        },
        onChange: (value: OperationType) => {
            params.operationType = value;
            setConfig({ ...config });
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

    const processWidthSliderProps: CommonSliderProps = {
        id: "process-width-slider",
        title: "process width",
        currentValue: params.faceProcessWidth,
        max: 1000,
        min: 100,
        step: 10,
        width: "30%",
        onChange: (value: number) => {
            params.handProcessWidth = value;
            params.faceProcessWidth = value;
            params.poseProcessWidth = value;
            setParams({ ...params });
        },
        integer: true,
    };
    const processHeightSliderProps: CommonSliderProps = {
        id: "process-height-slider",
        title: "process height",
        currentValue: params.faceProcessHeight,
        max: 1000,
        min: 100,
        step: 10,
        width: "30%",
        onChange: (value: number) => {
            params.handProcessHeight = value;
            params.faceProcessHeight = value;
            params.poseProcessHeight = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const movingAverageWindowSliderProps: CommonSliderProps = {
        id: "moving-average-window-slider",
        title: "moving average window",
        currentValue: params.faceMovingAverageWindow,
        max: 100,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.faceMovingAverageWindow = value;
            params.poseMovingAverageWindow = value;
            setParams({ ...params });
        },
        integer: true,
    };

    const affineResizedSliderProps: CommonSliderProps = {
        id: "affine-resized-slider",
        title: "affine resized ",
        currentValue: params.handAffineResizedFactor,
        max: 8,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            params.handAffineResizedFactor = value;
            params.poseAffineResizedFactor = value;
            setParams({ ...params });
        },
        integer: true,
    };
    const cropExtentionSliderProps: CommonSliderProps = {
        id: "crop-extention-slider",
        title: "crop extention",
        currentValue: params.poseCropExt,
        max: 2,
        min: 1,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            params.poseCropExt = value;
            setParams({ ...params });
        },
        integer: false,
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Credit></Credit>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSelector {...operationTypeSelectorProps}></CommonSelector>
            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>
            <CommonSlider {...movingAverageWindowSliderProps}></CommonSlider>
            <CommonSlider {...affineResizedSliderProps}></CommonSlider>
            <CommonSlider {...cropExtentionSliderProps}></CommonSlider>
        </div>
    );
};
const App = () => {
    console.log("render2");
    const { inputSource, config, params, manager } = useAppState();

    const handDrawer = useMemo(() => {
        return new HandPoseDetectionDrawer();
    }, []);
    const faceDrawer = useMemo(() => {
        return new FacemeshDrawer();
    }, []);
    const poseDrawer = useMemo(() => {
        return new BlazePoseDrawer();
    }, []);

    useEffect(() => {
        const output = document.getElementById("output") as HTMLCanvasElement;
        handDrawer.setOutputCanvas(output);
        faceDrawer.setOutputCanvas(output);
        poseDrawer.setOutputCanvas(output);
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
        if (!config) {
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
                    const prediction = await manager.predict(params, snap);
                    // console.log("prediction", prediction);
                    if (prediction) {
                        if (prediction.operationType === OperationType.hand) {
                            handDrawer.draw(snap, config, params, prediction as HandPredictionEx);
                        } else if (prediction.operationType === OperationType.face) {
                            faceDrawer.draw(snap, config, params, prediction as FacePredictionEx);
                        } else {
                            poseDrawer.draw(snap, config, params, prediction as PosePredictionEx);
                        }
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
    }, [inputSourceElement, config, params]);

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
