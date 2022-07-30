import { Config, ImageProcessor, OperationParams, WorkerDispatcher, WorkerDispatcherCallbacks } from "@dannadori/worker-base";
import { MediapipeMix2Config, MediapipeMix2OperationParams, OperationType, TFLite, TFLiteFaceLandmarkDetection, TFLiteHand, TFLitePoseLandmarkDetection } from "./const";
import { MediapipeMixProcessor } from "./MediapipeMixProcessor";

const ctx: Worker = self as any;
const dispatcher = new WorkerDispatcher<MediapipeMix2Config, MediapipeMix2OperationParams>(ctx)
const dispatcherCallbacks: WorkerDispatcherCallbacks<MediapipeMix2Config, MediapipeMix2OperationParams> = {
    init: async (config: MediapipeMix2Config) => {
        const imageProcessor = new MediapipeMixProcessor()
        await imageProcessor.init(config)
        return imageProcessor
    }
    // Predictはdispatcherの中に隠蔽。imageProcessor.predictを内部的に呼んでいる。
}
dispatcher.setCallback(dispatcherCallbacks)
onmessage = dispatcher.dispach

