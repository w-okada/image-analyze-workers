import React, { useContext, useEffect, useState } from "react";
import { ReactNode } from "react";
import { loadURLAsDataURL } from "../utils/urlReader";

/// #if BUILD_TYPE==="lite"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BlazePoseWorkerManager, generateBlazePoseDefaultConfig, generateDefaultBlazePoseParams, BlazePoseConfig, BlazePoseOperationParams, Pose, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices, PosePredictionEx } from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workerlite";

/// #elif BUILD_TYPE==="full"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BlazePoseWorkerManager, generateBlazePoseDefaultConfig, generateDefaultBlazePoseParams, BlazePoseConfig, BlazePoseOperationParams, Pose, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices, PosePredictionEx } from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workerfull";

/// #elif BUILD_TYPE==="heavy"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BlazePoseWorkerManager, generateBlazePoseDefaultConfig, generateDefaultBlazePoseParams, BlazePoseConfig, BlazePoseOperationParams, Pose, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices, PosePredictionEx } from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workerheavy";

/// #elif BUILD_TYPE==="mediapipe"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BlazePoseWorkerManager, generateBlazePoseDefaultConfig, generateDefaultBlazePoseParams, BlazePoseConfig, BlazePoseOperationParams, Pose, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices, PosePredictionEx } from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workermediapipe";

/// #elif BUILD_TYPE==="tfjs"
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BlazePoseWorkerManager, generateBlazePoseDefaultConfig, generateDefaultBlazePoseParams, BlazePoseConfig, BlazePoseOperationParams, Pose, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices, PosePredictionEx } from "@dannadori/blaze-pose-worker-js/dist/blaze-pose-workertfjs";

/// #else
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BlazePoseWorkerManager, generateBlazePoseDefaultConfig, generateDefaultBlazePoseParams, BlazePoseConfig, BlazePoseOperationParams, Pose, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices, PosePredictionEx } from "@dannadori/blaze-pose-worker-js";

/// #endif

export { BlazePoseWorkerManager, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices };
export type { BlazePoseConfig, BlazePoseOperationParams, Pose, PosePredictionEx };
type Props = {
    children: ReactNode;
};

type AppStateValue = {
    inputSourceType: string | null;
    setInputSourceType: (source: string | null) => void;
    inputSource: string | MediaStream | null;
    setInputSource: (source: MediaStream | string | null) => void;

    config: BlazePoseConfig;
    setConfig: (config: BlazePoseConfig) => void;
    params: BlazePoseOperationParams;
    setParams: (params: BlazePoseOperationParams) => void;
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

const initialConfig = generateBlazePoseDefaultConfig();
const initialParams = generateDefaultBlazePoseParams();
initialParams.affineResizedFactor = 1;
initialConfig.processOnLocal = true;

export const AppStateProvider = ({ children }: Props) => {
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
