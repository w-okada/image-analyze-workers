import { getBrowserType } from "@dannadori/000_WorkerBase";
import React, { useContext, useEffect, useState, useRef } from "react";
import { ReactNode } from "react";
import { BackendTypes, BlazefaceConfig, BlazefaceOperationParams } from "../const";
import { loadURLAsDataURL } from "../utils/urlReader";

// @ts-ignore
// import tflite_float32 from "../../resources/tflite/org.bin";
// import tflite_float32 from "../../resources/tflite/model_float32.bin";
// import tflite_float32 from "../../resources/tflite/model_weight_quant.bin";
// import tflite_float32 from "../../resources/tflite/model_integer_quant.bin";
// import tflite_float32 from "../../resources/tflite/model_float16_quant.bin";
// import tflite_float32 from "../../resources/tflite/model_dynamic_range_quant.bin";
import tflite_float32 from "../../resources/tflite/hand_recrop.bin";

// @ts-ignore
import wasm from "../../resources/wasm/tflite.wasm";
import { TFLiteWrapper } from "./class/TFLiteWrapper";

export const generateBlazefaceDefaultConfig = (): BlazefaceConfig => {
    const defaultConf: BlazefaceConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.WebGL,
        processOnLocal: false,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        modelTFLites: {
            float32: tflite_float32.split(",")[1],
        },
        modelKey: "float32",
        useSimd: false,
        wasmBase64: wasm.split(",")[1],
        // wasmSimdBase64: barcodeWasmSimd.split(",")[1],
    };
    return defaultConf;
};

export const generateDefaultBlazefaceParams = () => {
    const defaultParams: BlazefaceOperationParams = {
        processWidth: 300,
        processHeight: 300,
    };
    return defaultParams;
};

type Props = {
    children: ReactNode;
};
export const ApplicationModes = {
    facemask: "facemask",
    tracking: "tracking",
} as const;
export type ApplicationModes = typeof ApplicationModes[keyof typeof ApplicationModes];

type AppStateValue = {
    applicationMode: ApplicationModes;
    setApplicationMode: (mode: ApplicationModes) => void;
    inputSourceType: string | null;
    setInputSourceType: (source: string | null) => void;
    inputSource: string | MediaStream | null;
    setInputSource: (source: MediaStream | string | null) => void;

    config: BlazefaceConfig;
    setConfig: (config: BlazefaceConfig) => void;
    params: BlazefaceOperationParams;
    setParams: (params: BlazefaceOperationParams) => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

const initialInputSourcePath = "mov/Model.mp4";

const initialConfig = generateBlazefaceDefaultConfig();
const initialParams = generateDefaultBlazefaceParams();

export const AppStateProvider = ({ children }: Props) => {
    const TFLiteWrapperRef = useRef<TFLiteWrapper>();
    // const [tfliteWrapper, setTfliteWrapper] = useState<TFLiteWrapper>(TFLiteWrapperRef.current);

    const [applicationMode, setApplicationMode] = useState<ApplicationModes>(ApplicationModes.facemask);

    const [inputSourceType, setInputSourceType] = useState<string | null>(null);
    const [inputSource, _setInputSource] = useState<MediaStream | string | null>(null);
    const setInputSource = (source: MediaStream | string | null) => {
        if (inputSource instanceof MediaStream) {
            inputSource.getTracks().forEach((x) => {
                x.stop();
            });
        }
        _setInputSource(source);
    };

    const [config, setConfig] = useState(initialConfig);
    const [params, setParams] = useState(initialParams);

    useEffect(() => {
        const loadInitialInputSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);
            setInputSource(data);
        };
        loadInitialInputSource(initialInputSourcePath);
    }, []);

    useEffect(() => {
        TFLiteWrapperRef.current = new TFLiteWrapper();
        TFLiteWrapperRef.current.init(initialConfig);
    }, []);

    const providerValue = {
        applicationMode,
        setApplicationMode,
        inputSourceType,
        setInputSourceType,
        inputSource,
        setInputSource,
        config,
        setConfig,
        params,
        setParams,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
