import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { FacemeshWorkerManager, BackendTypes, AnnotatedPrediction, Coords3D } from "@dannadori/facemesh-worker-js";
import { ApplicationModes, useAppState } from "./provider/AppStateProvider";
import { FacemeshDrawer } from "./FacemeshDrawer";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { CommonSelector, CommonSelectorProps, CommonSlider, CommonSliderProps, CommonSwitch, CommonSwitchProps, VideoInputSelector, VideoInputSelectorProps } from "demo-base";
import { FaceswapDrawer } from "./FaceswapDrawer";
let GlobalLoopID = 0;

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, config, params, setConfig, setParams, applicationMode, setApplicationMode, setMaskCanvas, maskCanvas, setMaskPrediction } = useAppState();

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

    const irisSwitchProps: CommonSwitchProps = {
        id: "iris-switch",
        title: "iris",
        currentValue: params.predictIrises,
        onChange: (value: boolean) => {
            params.predictIrises = value;
            setParams({ ...params });
        },
    };

    const applicationModeSelectorProps: CommonSelectorProps<ApplicationModes> = {
        id: "application-mode-selector",
        title: "application mode",
        currentValue: applicationMode,
        options: {
            facemesh: ApplicationModes.facemesh,
            faceswap: ApplicationModes.faceswap,
        },
        onChange: (value: ApplicationModes) => {
            setApplicationMode(value);
        },
    };

    const maxContinuousCheckSliderProps: CommonSliderProps = {
        id: "max-continuous-check-slider",
        title: "max continuous check",
        currentValue: config.model.maxContinuousChecks,
        max: 10,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            config.model.maxContinuousChecks = value;
            setConfig({ ...config });
        },
        integer: true,
    };

    const confidenceSliderProps: CommonSliderProps = {
        id: "confidence-slider",
        title: "confidence",
        currentValue: config.model.detectionConfidence,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            config.model.detectionConfidence = value;
            setConfig({ ...config });
        },
        integer: false,
    };

    const maxFacesSliderProps: CommonSliderProps = {
        id: "max-faces-slider",
        title: "max faces",
        currentValue: config.model.maxFaces,
        max: 10,
        min: 1,
        step: 1,
        width: "30%",
        onChange: (value: number) => {
            config.model.maxFaces = value;
            setConfig({ ...config });
        },
        integer: false,
    };

    const iouThresholdSliderProps: CommonSliderProps = {
        id: "iou-threshold-slider",
        title: "iou threshold",
        currentValue: config.model.iouThreshold,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            config.model.iouThreshold = value;
            setConfig({ ...config });
        },
        integer: false,
    };

    const scoreThresholdSliderProps: CommonSliderProps = {
        id: "score-threshold-slider",
        title: "score threshold",
        currentValue: config.model.scoreThreshold,
        max: 1,
        min: 0,
        step: 0.1,
        width: "30%",
        onChange: (value: number) => {
            config.model.scoreThreshold = value;
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

    const selectMaskClicked = () => {
        const fileInput = document.getElementById(`select-mask-file-input`) as HTMLInputElement;
        fileInput.onchange = (event: Event) => {
            if (!event || !event.target) {
                return;
            }
            if (!(event.target instanceof HTMLInputElement)) {
                return;
            }
            if (!event.target.files) {
                return;
            }
            if (!event.target.files[0].type.match("image.*")) {
                console.log("not image file", event.target.files[0].type);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const maskImage = document.createElement("img");
                maskImage.onload = () => {
                    const maskCanvas = document.createElement("canvas");
                    const maskCanvas2 = document.getElementById("mask") as HTMLCanvasElement;
                    maskCanvas.width = maskImage.naturalWidth;
                    maskCanvas.height = maskImage.naturalHeight;
                    maskCanvas2.width = maskImage.naturalWidth;
                    maskCanvas2.height = maskImage.naturalHeight;
                    maskCanvas.getContext("2d")!.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
                    maskCanvas2.getContext("2d")!.drawImage(maskImage, 0, 0, maskCanvas2.width, maskCanvas2.height);
                    setMaskCanvas(maskCanvas);
                };
                maskImage.src = reader.result as string;
            };
            reader.readAsDataURL(event.target.files[0]);
        };
        fileInput.click();
    };

    //// (2) Mask
    const managerForMaskRef = useRef<FacemeshWorkerManager>();
    const [manager, setManager] = useState<FacemeshWorkerManager | undefined>(managerForMaskRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new FacemeshWorkerManager();
            await m.init(config);
            managerForMaskRef.current = m;
            setManager(managerForMaskRef.current);
        };
        loadModel();
    }, [config]);
    // useEffect(() => {
    //     if (!managerForMaskRef.current || !maskCanvas) {
    //         console.log("mask prediction initialize not");
    //         return;
    //     }
    //     console.log("Mask Prediction...");
    //     const maskPrediction = async () => {
    //         await managerForMaskRef.current!.predict(params, maskCanvas);
    //         await managerForMaskRef.current!.predict(params, maskCanvas);
    //         await managerForMaskRef.current!.predict(params, maskCanvas);
    //         await managerForMaskRef.current!.predict(params, maskCanvas);
    //         const prediction = await managerForMaskRef.current!.predict(params, maskCanvas);
    //         setMaskPrediction(prediction);
    //         console.log("mask image", maskCanvas.width, maskCanvas.height);
    //     };
    //     maskPrediction();
    // }, [managerForMaskRef.current, maskCanvas, config, params]);

    const fitMaskClicked = async () => {
        if (!managerForMaskRef.current || !maskCanvas) {
            console.log("mask prediction initialize not");
            return;
        }
        console.log("Mask Prediction...");
        const maskPrediction = async () => {
            await managerForMaskRef.current!.predict(params, maskCanvas);
            await managerForMaskRef.current!.predict(params, maskCanvas);
            await managerForMaskRef.current!.predict(params, maskCanvas);
            await managerForMaskRef.current!.predict(params, maskCanvas);
            const prediction = await managerForMaskRef.current!.predict(params, maskCanvas);
            setMaskPrediction(prediction);
        };
        maskPrediction();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSelector {...backendSelectorProps}></CommonSelector>
            <CommonSwitch {...irisSwitchProps}></CommonSwitch>

            <CommonSelector {...applicationModeSelectorProps}></CommonSelector>
            {applicationMode === ApplicationModes.faceswap ? (
                <div style={{ display: "flex" }}>
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                            selectMaskClicked();
                        }}
                    >
                        select mask
                    </button>
                    <div>
                        {" "}
                        --{">"}
                        {">"}{" "}
                    </div>
                    <button
                        className="btn btn-sm btn-accent"
                        onClick={() => {
                            fitMaskClicked();
                        }}
                    >
                        fit mask
                    </button>
                    <input type="file" id={`select-mask-file-input`} hidden></input>
                </div>
            ) : (
                <></>
            )}

            <CommonSlider {...maxContinuousCheckSliderProps}></CommonSlider>
            <CommonSlider {...confidenceSliderProps}></CommonSlider>
            <CommonSlider {...maxFacesSliderProps}></CommonSlider>
            <CommonSlider {...iouThresholdSliderProps}></CommonSlider>
            <CommonSlider {...scoreThresholdSliderProps}></CommonSlider>

            <CommonSlider {...processWidthSliderProps}></CommonSlider>
            <CommonSlider {...processHeightSliderProps}></CommonSlider>
        </div>
    );
};
const App = () => {
    const { applicationMode, inputSource, config, params, maskCanvas, maskPrediction } = useAppState();
    const managerRef = useRef<FacemeshWorkerManager>();
    const [manager, setManager] = useState<FacemeshWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new FacemeshWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new FacemeshDrawer();
    }, []);

    useEffect(() => {
        const output = document.getElementById("output") as HTMLCanvasElement;
        drawer.setOutputCanvas(output);
    }, []);

    const faceswapDrawer = useMemo(() => {
        return new FaceswapDrawer();
    }, []);
    useEffect(() => {
        const test = document.getElementById("test") as HTMLCanvasElement;
        faceswapDrawer.setTestCanvas(test);
        const output = document.getElementById("output") as HTMLCanvasElement;
        faceswapDrawer.setOutputCanvas(output);
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

        const results: AnnotatedPrediction[][] = [];
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
                const prediction = await managerRef.current!.predict(params, snap);
                if (prediction.length > 0) {
                    if (results.length > 3) {
                        results.shift();
                    }
                    results.push(prediction);
                }

                const keypointsEach = results.map((pred) => {
                    return pred[0].scaledMesh as Coords3D;
                });
                const summedKeypoints = keypointsEach.reduce((prev, cur) => {
                    for (let i = 0; i < cur.length; i++) {
                        if (prev[i]) {
                            prev[i][0] = prev[i][0] + cur[i][0];
                            prev[i][1] = prev[i][1] + cur[i][1];
                            prev[i][2] = prev[i][2] + cur[i][2];
                        } else {
                            prev.push([cur[i][0], cur[i][1], cur[i][2]]);
                        }
                    }
                    return prev;
                }, [] as Coords3D);
                for (let i = 0; i < summedKeypoints.length; i++) {
                    summedKeypoints[i][0] = summedKeypoints[i][0] / results.length;
                    summedKeypoints[i][1] = summedKeypoints[i][1] / results.length;
                    summedKeypoints[i][2] = summedKeypoints[i][2] / results.length;
                }
                prediction[0].scaledMesh = summedKeypoints;

                if (applicationMode === ApplicationModes.facemesh) {
                    drawer.draw(snap, params, prediction);
                } else {
                    const scaleX = snap.width / params.processWidth;
                    const scaleY = snap.height / params.processHeight;
                    faceswapDrawer.swapFace(snap, prediction, scaleX, scaleY);
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

    useEffect(() => {
        if (!maskCanvas || !maskPrediction) {
            return;
        }
        faceswapDrawer.setMask(maskCanvas, maskPrediction, params);
    }, [maskCanvas, maskPrediction]);

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
