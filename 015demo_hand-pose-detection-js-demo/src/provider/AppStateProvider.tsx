import React, { useContext, useEffect, useState } from "react";
import { ReactNode } from "react";
import { loadURLAsDataURL } from "../utils/urlReader";

/// #if BUILD_TYPE==="lite"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { HandPoseDetectionWorkerManager, HandPoseDetectionConfig, HandPoseDetectionOperationParams, generateHandPoseDetectionDefaultConfig, generateDefaultHandPoseDetectionParams, ModelTypes, BackendTypes, ModelTypes2, Hand, FingerLookupIndice, FingerLookupIndices } from "@dannadori/hand-pose-detection-worker-js/dist/hand-pose-detection-workerlite";

/// #elif BUILD_TYPE==="full"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { HandPoseDetectionWorkerManager, HandPoseDetectionConfig, HandPoseDetectionOperationParams, generateHandPoseDetectionDefaultConfig, generateDefaultHandPoseDetectionParams, ModelTypes, BackendTypes, ModelTypes2, Hand, FingerLookupIndice, FingerLookupIndices } from "@dannadori/hand-pose-detection-worker-js/dist/hand-pose-detection-workerfull";

/// #elif BUILD_TYPE==="mediapipe"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { HandPoseDetectionWorkerManager, HandPoseDetectionConfig, HandPoseDetectionOperationParams, generateHandPoseDetectionDefaultConfig, generateDefaultHandPoseDetectionParams, ModelTypes, BackendTypes, ModelTypes2, Hand, FingerLookupIndice, FingerLookupIndices } from "@dannadori/hand-pose-detection-worker-js/dist/hand-pose-detection-workermediapipe";

/// #elif BUILD_TYPE==="tfjs"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { HandPoseDetectionWorkerManager, HandPoseDetectionConfig, HandPoseDetectionOperationParams, generateHandPoseDetectionDefaultConfig, generateDefaultHandPoseDetectionParams, ModelTypes, BackendTypes, ModelTypes2, Hand, FingerLookupIndice, FingerLookupIndices } from "@dannadori/hand-pose-detection-worker-js/dist/hand-pose-detection-workertfjs";

/// #else
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { HandPoseDetectionWorkerManager, HandPoseDetectionConfig, HandPoseDetectionOperationParams, generateHandPoseDetectionDefaultConfig, generateDefaultHandPoseDetectionParams, ModelTypes, BackendTypes, ModelTypes2, Hand, FingerLookupIndice, FingerLookupIndices } from "@dannadori/hand-pose-detection-worker-js/dist/hand-pose-detection-worker";
/// #endif
export { HandPoseDetectionWorkerManager, ModelTypes2, BackendTypes, ModelTypes, FingerLookupIndices };
export type { Hand, HandPoseDetectionOperationParams, HandPoseDetectionConfig };

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

    config: HandPoseDetectionConfig;
    setConfig: (config: HandPoseDetectionConfig) => void;
    params: HandPoseDetectionOperationParams;
    setParams: (params: HandPoseDetectionOperationParams) => void;
};

const AppStateContext = React.createContext<AppStateValue | null>(null);

export const useAppState = (): AppStateValue => {
    const state = useContext(AppStateContext);
    if (!state) {
        throw new Error("useAppState must be used within AppStateProvider");
    }
    return state;
};

const initialInputSourcePath = "mov/Hands.mp4";

const initialConfig = generateHandPoseDetectionDefaultConfig();
const initialParams = generateDefaultHandPoseDetectionParams();

export const AppStateProvider = ({ children }: Props) => {
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
