import { getBrowserType } from "@dannadori/000_WorkerBase";
import React, { useContext, useEffect, useState, useRef } from "react";
import { ReactNode } from "react";
import { BackendTypes, HandposeConfig, HandposeOperationParams } from "../const";
import { loadURLAsDataURL } from "../utils/urlReader";

// @ts-ignore
// import tflite_float32 from "../../resources/tflite/palm/palm_detection_lite.bin";
import tflite_float32 from "../../resources/tflite/palm/palm_detection_full.bin";
// import tflite_float32 from "../../resources/tflite/palm/palm_detection_old.bin";


// @ts-ignore
// import tflite_model_landmark from "../../resources/tflite/landmark/hand_landmark_lite.bin";
import tflite_model_landmark from "../../resources/tflite/landmark/hand_landmark_full.bin";
// import tflite_model_landmark from "../../resources/tflite/landmark/landmark_old.bin";


// @ts-ignore
import wasm from "../../resources/wasm/tflite.wasm";
// @ts-ignore
import wasmSimd from "../../resources/wasm/tflite-simd.wasm";
import { TFLiteWrapper } from "./class/TFLiteWrapper";

export const generateHandposeDefaultConfig = (): HandposeConfig => {
    const defaultConf: HandposeConfig = {
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
        landmarkModelTFLites: {
            float32: tflite_model_landmark.split(",")[1],
        },

        modelKey: "float32",
        useSimd: true,
        wasmBase64: wasm.split(",")[1],
        wasmSimdBase64: wasmSimd.split(",")[1],
        maxProcessWidth: 1024 /2,
        maxProcessHeight: 1024 /2
    };
    return defaultConf;
};

export const generateDefaultHandposeParams = () => {
    const defaultParams: HandposeOperationParams = {
        processWidth: 1024 /2,
        processHeight: 1024 /2,
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

    config: HandposeConfig;
    setConfig: (config: HandposeConfig) => void;
    params: HandposeOperationParams;
    setParams: (params: HandposeOperationParams) => void;
    tflite?:TFLiteWrapper 
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

// const initialInputSourcePath = "mov/Model.mp4";
const initialInputSourcePath = "img/hand.jpg";
// const initialInputSourcePath = "img/5hand.jpg";



const initialConfig = generateHandposeDefaultConfig();
const initialParams = generateDefaultHandposeParams();

export const AppStateProvider = ({ children }: Props) => {
    const TFLiteWrapperRef = useRef<TFLiteWrapper>();
    const [tfliteWrapper, setTfliteWrapper] = useState<TFLiteWrapper|undefined>(TFLiteWrapperRef.current);

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
        setTfliteWrapper(TFLiteWrapperRef.current)
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
        tflite:TFLiteWrapperRef.current
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
