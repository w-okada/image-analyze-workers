import React, { useContext, useEffect, useState } from "react";
import { ReactNode } from "react";
import { useWindowStateChangeListener, WindowSize } from "demo-base";
import { loadURLAsDataURL } from "../utils/urlReader";
import { generateDefaultU2NetPortraitParams, generateU2NetPortraitDefaultConfig, U2NetPortraitConfig, U2NetPortraitOperationParams } from "@dannadori/u2net-portrait-worker-js";
import { generateDefaultOpenCVParams, generateOpenCVDefaultConfig, OpenCVConfig, OpenCVOperatipnParams } from "@dannadori/opencv-worker-js";

type Props = {
    children: ReactNode;
};

type AppStateValue = {
    windowSize: WindowSize;
    inputSourceType: string | null;
    setInputSourceType: (source: string | null) => void;
    inputSource: string | MediaStream | null;
    setInputSource: (source: MediaStream | string | null) => void;

    config: U2NetPortraitConfig;
    setConfig: (config: U2NetPortraitConfig) => void;
    params: U2NetPortraitOperationParams;
    setParams: (params: U2NetPortraitOperationParams) => void;

    configCV: OpenCVConfig;
    setConfigCV: (config: OpenCVConfig) => void;
    paramsCV: OpenCVOperatipnParams;
    setParamsCV: (params: OpenCVOperatipnParams) => void;

    useBlurBlend: boolean;
    setUseBlurBlend: (val: boolean) => void;
    blurAlpha: number;
    setBlurAlpha: (alpha: number) => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

const initialInputSourcePath = "img/yuka_kawamura.jpg";

const initialConfig = generateU2NetPortraitDefaultConfig();
const initialParams = generateDefaultU2NetPortraitParams();
const initialConfigCV = generateOpenCVDefaultConfig();
const initialParamsCV = generateDefaultOpenCVParams();
initialParamsCV.processWidth = initialConfig.modelInputs[initialConfig.modelKey][0];
initialParamsCV.processHeight = initialConfig.modelInputs[initialConfig.modelKey][1];

export const AppStateProvider = ({ children }: Props) => {
    const { windowSize } = useWindowStateChangeListener();
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
    const [configCV, setConfigCV] = useState(initialConfigCV);
    const [paramsCV, setParamsCV] = useState(initialParamsCV);

    const [useBlurBlend, setUseBlurBlend] = useState(true);
    const [blurAlpha, setBlurAlpha] = useState(100);

    useEffect(() => {
        const loadInitialInputSource = async (path: string) => {
            const data = await loadURLAsDataURL(path);
            setInputSource(data);
        };
        loadInitialInputSource(initialInputSourcePath);
    }, []);

    const providerValue = {
        windowSize,
        inputSourceType,
        setInputSourceType,
        inputSource,
        setInputSource,

        config,
        setConfig,
        params,
        setParams,
        configCV,
        setConfigCV,
        paramsCV,
        setParamsCV,

        useBlurBlend,
        setUseBlurBlend,
        blurAlpha,
        setBlurAlpha,
    };

    return <AppStateContext.Provider value={providerValue}>{children}</AppStateContext.Provider>;
};
