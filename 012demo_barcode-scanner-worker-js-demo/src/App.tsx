import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { BarcodeScannerWorkerManager, ScanModes, ScanScales } from "@dannadori/barcode-scanner-worker-js";
import { useAppState } from "./provider/AppStateProvider";
import { DataTypesOfDataURL, getDataTypeOfDataURL } from "./utils/urlReader";
import { BarcodeScannerDrawer } from "./BarcodeScannerDrawer";
import { CommonSelector, CommonSelectorProps, CommonSwitch, CommonSwitchProps, Credit, VideoInputSelector, VideoInputSelectorProps } from "demo-base";

let GlobalLoopID = 0;

const cameraResolutions: { [key: string]: number[] } = {
    "450x450": [450, 450],
    "600x600": [600, 600],
    "900x900": [900, 900],
};
const filePaths: { [key: string]: string } = {
    SAMPLE_QHD: "./mov/barcode_960_540.mp4",
    SAMPLE_HD: "./mov/barcode_1280_720.mp4",
    SAMPLE_FULLHD: "./mov/barcode_1920_1080.mp4",
};

const Controller = () => {
    const { inputSourceType, setInputSourceType, setInputSource, config, setConfig, params, setParams } = useAppState();

    const videoInputSelectorProps: VideoInputSelectorProps = {
        id: "video-input-selector",
        currentValue: inputSourceType || "File",
        onInputSourceTypeChanged: setInputSourceType,
        onInputSourceChanged: setInputSource,
        cameraResolutions: cameraResolutions,
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

    const scanScaleOptions: { [key: string]: ScanScales } = {};
    const scanScaleOptionsKeys: { [key: string]: string } = {};
    Object.entries(ScanScales).forEach(([x, y]) => {
        scanScaleOptions[x] = y;
        scanScaleOptionsKeys[x] = x;
    });
    const [scanScaleOptionsKey, setScanScaleOptionsKey] = useState<string>(Object.values(scanScaleOptionsKeys)[0]);
    const scanScaleSelectorProps: CommonSelectorProps<string> = {
        id: "scan-scale-selector",
        title: "scan scale",
        currentValue: scanScaleOptionsKey,
        options: scanScaleOptionsKeys,
        onChange: (value: string) => {
            params.scale = scanScaleOptions[value];
            setParams({ ...params });
            setScanScaleOptionsKey(value);
        },
    };

    const scanModeOptions: { [key: string]: ScanModes } = {};
    const scanModeOptionsKeys: { [key: string]: string } = {};
    Object.entries(ScanModes).forEach(([x, y]) => {
        scanModeOptions[x] = y;
        scanModeOptionsKeys[x] = x;
    });
    const [scanModeOptionsKey, setScanModeOptionsKey] = useState<string>(Object.values(scanModeOptionsKeys)[0]);
    const scanModeSelectorProps: CommonSelectorProps<string> = {
        id: "scan-mode-selector",
        title: "scan mode",
        currentValue: scanModeOptionsKey,
        options: scanModeOptionsKeys,
        onChange: (value: string) => {
            params.type = scanModeOptions[value];
            setParams({ ...params });
            setScanModeOptionsKey(value);
        },
    };

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <Credit></Credit>

            <VideoInputSelector {...videoInputSelectorProps}></VideoInputSelector>
            <CommonSwitch {...onLocalSwitchProps}></CommonSwitch>
            <CommonSwitch {...useSimdSwitchProps}></CommonSwitch>

            <CommonSelector {...scanScaleSelectorProps}></CommonSelector>
            <CommonSelector {...scanModeSelectorProps}></CommonSelector>
        </div>
    );
};

const App = () => {
    const { inputSource, config, params } = useAppState();
    const managerRef = useRef<BarcodeScannerWorkerManager>();
    const [manager, setManager] = useState<BarcodeScannerWorkerManager | undefined>(managerRef.current);
    useEffect(() => {
        const loadModel = async () => {
            const m = manager ? manager : new BarcodeScannerWorkerManager();
            await m.init(config);
            managerRef.current = m;
            setManager(managerRef.current);
        };
        loadModel();
    }, [config]);

    const drawer = useMemo(() => {
        return new BarcodeScannerDrawer();
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
