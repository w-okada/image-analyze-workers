import { AnnotatedPrediction, FacemeshConfig, FacemeshOperatipnParams, FaceMeshPredictionEx, generateDefaultFacemeshParams, generateFacemeshDefaultConfig } from "@dannadori/facemesh-worker-js";
import React, { useContext, useEffect, useState } from "react";
import { ReactNode } from "react";
import { loadURLAsDataURL } from "../utils/urlReader";

type Props = {
    children: ReactNode;
};
export const ApplicationModes = {
    facemesh: "facemesh",
    faceswap: "faceswap",
} as const;
export type ApplicationModes = typeof ApplicationModes[keyof typeof ApplicationModes];

type AppStateValue = {
    applicationMode: ApplicationModes;
    setApplicationMode: (mode: ApplicationModes) => void;
    inputSourceType: string | null;
    setInputSourceType: (source: string | null) => void;
    inputSource: string | MediaStream | null;
    setInputSource: (source: MediaStream | string | null) => void;

    maskCanvas: HTMLCanvasElement | null;
    setMaskCanvas: (source: HTMLCanvasElement | null) => void;
    maskPrediction: FaceMeshPredictionEx | null;
    setMaskPrediction: (prediction: FaceMeshPredictionEx) => void;

    config: FacemeshConfig;
    setConfig: (config: FacemeshConfig) => void;
    params: FacemeshOperatipnParams;
    setParams: (params: FacemeshOperatipnParams) => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

// const initialInputSourcePath = "img/yuka_kawamura.jpg";
const initialInputSourcePath = "mov/Model.mp4";
//const initialInputSourcePath = "mov/Couple.mp4";
// const initialBackgroundSourcePath = "img/yuka_kawamura.jpg";
const initialMaskSourcePath = "img/ai_face.jpg";

const initialConfig = generateFacemeshDefaultConfig();
const initialParams = generateDefaultFacemeshParams();

export const AppStateProvider = ({ children }: Props) => {
    const [applicationMode, setApplicationMode] = useState<ApplicationModes>(ApplicationModes.facemesh);

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

    const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
    const [maskPrediction, setMaskPrediction] = useState<FaceMeshPredictionEx | null>(null);

    const [config, setConfig] = useState(initialConfig);
    const [params, setParams] = useState(initialParams);

    useEffect(() => {
        const loadInitialInputSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);
            setInputSource(data);
        };
        loadInitialInputSource(initialInputSourcePath);

        const loadInitialBackgroundSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);

            const maskImage = document.createElement("img");
            maskImage.onloadeddata = () => {
                const maskCanvas = document.createElement("canvas");
                maskCanvas.width = maskImage.naturalWidth;
                maskCanvas.height = maskImage.naturalHeight;
                maskCanvas.getContext("2d")!.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
                setMaskCanvas(maskCanvas);
            };
            maskImage.src = data;
        };
        loadInitialBackgroundSource(initialMaskSourcePath);
    }, []);

    const providerValue = {
        applicationMode,
        setApplicationMode,
        inputSourceType,
        setInputSourceType,
        inputSource,
        setInputSource,
        maskCanvas,
        setMaskCanvas,
        maskPrediction,
        setMaskPrediction,

        config,
        setConfig,
        params,
        setParams,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
