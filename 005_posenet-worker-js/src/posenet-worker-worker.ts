import { WorkerCommand, WorkerResponse } from "./const";
import { PoseNetConfig, PoseNetFunctionTypes, PoseNetOperatipnParams } from "./const";
import * as poseNet from "@tensorflow-models/posenet";
import * as tf from "@tensorflow/tfjs";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: poseNet.PoseNet | null;

//// we can not use posenet with wasm...
//// https://github.com/tensorflow/tfjs/issues/2724
// const load_module = async (config: PoseNetConfig) => {
//     if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
//       console.log("use wasm backend" ,config.wasmPath)
//       require('@tensorflow/tfjs-backend-wasm')
//       setWasmPath(config.wasmPath)
//       await tf.setBackend("wasm")
//     }else{
//       console.log("use webgl backend")
//       require('@tensorflow/tfjs-backend-webgl')
//       await tf.setBackend("webgl")
//     }
// }

// const predict = async (image: ImageBitmap, config: PoseNetConfig, params: PoseNetOperatipnParams): Promise<poseNet.Pose[]> => {
//     // ImageData作成
//     //// input resolutionにリサイズするのでここでのリサイズは不要
//     // const processWidth = (config.processWidth <= 0 || config.processHeight <= 0) ? image.width : config.processWidth
//     // const processHeight = (config.processWidth <= 0 || config.processHeight <= 0) ? image.height : config.processHeight
//     const processWidth = image.width;
//     const processHeight = image.height;

//     //console.log("process image size:", processWidth, processHeight)
//     const offscreen = new OffscreenCanvas(processWidth, processHeight);
//     const ctx = offscreen.getContext("2d")!;
//     ctx.drawImage(image, 0, 0, processWidth, processHeight);
//     const newImg = ctx.getImageData(0, 0, processWidth, processHeight);

//     if (params.type === PoseNetFunctionType.SinglePerson) {
//         const prediction = await model!.estimateSinglePose(newImg, params.singlePersonParams!);
//         return [prediction];
//     } else if (params.type === PoseNetFunctionType.MultiPerson) {
//         const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
//         return prediction;
//     } else {
//         // multi に倒す
//         const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
//         return prediction;
//     }
// };

const predict = async (config: PoseNetConfig, params: PoseNetOperatipnParams, newImg: ImageData) => {
    // ImageData作成
    if (params.type === PoseNetFunctionTypes.SinglePerson) {
        const prediction = await model!.estimateSinglePose(newImg, params.singlePersonParams!);
        return [prediction];
    } else if (params.type === PoseNetFunctionTypes.MultiPerson) {
        const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
        return prediction;
    } else {
        // multi に倒す
        const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
        return prediction;
    }
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        await tf.ready();
        tf.env().set("WEBGL_CPU_FORWARD", false);
        model = await poseNet.load(event.data.config.model);
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config: PoseNetConfig = event.data.config;
        const params: PoseNetOperatipnParams = event.data.params;

        const data: Uint8ClampedArray = event.data.data;
        const newImg = new ImageData(new Uint8ClampedArray(data), params.processWidth, params.processHeight);

        const prediction = await predict(config, params, newImg);
        ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction });
    }
};
