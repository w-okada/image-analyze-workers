import { getBrowserType } from "@dannadori/000_WorkerBase";
import React, { useContext, useEffect, useState, useRef } from "react";
import { ReactNode } from "react";
import { BackendTypes, PoseLandmarkDetectionConfig, PoseLandmarkDetectionOperationParams } from "../const";
import { loadURLAsDataURL } from "../utils/urlReader";

// @ts-ignore
import tflite_pose_float32 from "../../resources/tflite/detector/pose_detection.bin";


// @ts-ignore
// import tflite_model_landmark from "../../resources/tflite/landmark/pose_landmark_full.bin";
import tflite_pose_model_landmark from "../../resources/tflite/landmark/pose_landmark_lite.bin";
// import tflite_model_landmark from "../../resources/tflite/landmark/pose_landmark_heavy.bin";




// @ts-ignore
import wasm from "../../resources/wasm/tflite.wasm";
// @ts-ignore
import wasmSimd from "../../resources/wasm/tflite-simd.wasm";
import { TFLiteWrapper } from "./class/TFLiteWrapper";

export const generatePoseLandmarkDetectionDefaultConfig = (): PoseLandmarkDetectionConfig => {
    const defaultConf: PoseLandmarkDetectionConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.WebGL,
        processOnLocal: false,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        /** POSE */
        poseDetectorModelTFLites: {
            float32: tflite_pose_float32.split(",")[1],
        },
        poseLandmarkModelTFLites: {
            float32: tflite_pose_model_landmark.split(",")[1],
        },
        poseModelKey: "float32",
        
        useSimd: true,
        wasmBase64: wasm.split(",")[1],
        wasmSimdBase64: wasmSimd.split(",")[1],
        maxProcessWidth: 1024 ,
        maxProcessHeight: 1024 
    };
    return defaultConf;
};

export const generateDefaultPoseLandmarkDetectionParams = () => {
    const defaultParams: PoseLandmarkDetectionOperationParams = {
        processWidth: 1024 ,
        processHeight: 1024 ,
        // processWidth: 840 ,
        // processHeight: 360 ,
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

    config: PoseLandmarkDetectionConfig;
    setConfig: (config: PoseLandmarkDetectionConfig) => void;
    params: PoseLandmarkDetectionOperationParams;
    setParams: (params: PoseLandmarkDetectionOperationParams) => void;
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

const initialInputSourcePath = "mov/Yoga.mp4";
// const initialInputSourcePath = "img/face.png";



const initialConfig = generatePoseLandmarkDetectionDefaultConfig();
const initialParams = generateDefaultPoseLandmarkDetectionParams();

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
