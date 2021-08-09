import { makeStyles } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import './App.css';
import { VideoInputType } from './const';
import { generateDefaultSuperResolutionParams, generateSuperResolutionDefaultConfig, SuperResolutionWorkerManager, InterpolationType, SuperResolutionConfig, SuperResolutionOperationParams } from '@dannadori/super-resolution-worker-js'
import { useVideoInputList } from './hooks/useVideoInputList';
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from './components/components';

let GlobalLoopID: number = 0
const models: { [name: string]: string } = {
    "x2": `${process.env.PUBLIC_URL}/models/model_x2_nopadding.tflite`,
    "x3": `${process.env.PUBLIC_URL}/models/model_x3_nopadding.tflite`,
    "x4": `${process.env.PUBLIC_URL}/models/model_x4_nopadding.tflite`,
}

const tfjsModels: { [name: string]: string } = {
    "x2"    : `${process.env.PUBLIC_URL}/tensorflowjs/model_x2_nopadding_tfjs/model.json`,
    "x3"    : `${process.env.PUBLIC_URL}/tensorflowjs/model_x3_nopadding_tfjs/model.json`,
    "x4"    : `${process.env.PUBLIC_URL}/tensorflowjs/model_x4_nopadding_tfjs/model.json`,
}
  
const scaleFactors: { [name: string]: number } = {
    "x2": 2,
    "x3": 3,
    "x4": 4,
}


const interpolationTypes: { [name: string]: number } = {
    "espcn": InterpolationType.INTER_ESPCN,
    "LANCZOS4": InterpolationType.INTER_LANCZOS4,
    "CUBIC": InterpolationType.INTER_CUBIC,
    "AREA": InterpolationType.INTER_AREA,
    "LINEAR": InterpolationType.INTER_LINEAR,
    "NEAREST": InterpolationType.INTER_NEAREST,
    "canvas": 200,
}

const useStyles = makeStyles((theme) => ({
    inputView: {
        maxWidth: 512
    }
}));

interface WorkerProps {
    manager: SuperResolutionWorkerManager
    params: SuperResolutionOperationParams
    config: SuperResolutionConfig
    count: number
}
interface InputMedia {
    mediaType: VideoInputType
    media: MediaStream | string
}

const App = () => {
    const classes = useStyles();
    const { videoInputList } = useVideoInputList()
    const [workerProps, setWorkerProps] = useState<WorkerProps>()


    const [modelKey, setModelKey] = useState(Object.keys(models)[0])
    const [interpolationTypeKey, setInterpolationTypeKey] = useState(Object.keys(interpolationTypes)[0])
    const [useSIMD, setUseSIMD] = useState(false)
    const [useTensorflowJS, setUseTensorflowJS] = useState(false)
    const [inputSize, setInputSize] = useState(64)
    const [onLocal, setOnLocal] = useState(true)

    const [inputMedia, setInputMedia] = useState<InputMedia>({ mediaType: "IMAGE", media: "img/yuka_kawamura.jpg" })
    const inputChange = (mediaType: VideoInputType, input: MediaStream | string) => {
        setInputMedia({ mediaType: mediaType, media: input })
    }

    const [strict, setStrict] = useState(false)  // eslint-disable-line

    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(() => {
        const init = async () => {
            const m = workerProps ? workerProps.manager : new SuperResolutionWorkerManager()
            const count = workerProps ? workerProps.count + 1 : 0
            const c = generateSuperResolutionDefaultConfig()
            c.processOnLocal = onLocal
            c.modelPath = models[modelKey]
            c.tfjsModelPath = tfjsModels[modelKey]
            c.enableSIMD = true

            await m.init(c)

            const p = generateDefaultSuperResolutionParams()
            p.inputHeight = inputSize
            p.inputWidth = inputSize
            p.interpolation = interpolationTypes[interpolationTypeKey]
            p.scaleFactor = scaleFactors[modelKey]
            p.useSIMD = useSIMD
            p.useTensorflowjs = useTensorflowJS
            const newProps = { manager: m, config: c, params: p, count: count }
            console.log("CALLED new MANAGER", onLocal)
            setWorkerProps(newProps)
        }
        init()
    }, [modelKey, onLocal])  // eslint-disable-line

    //// パラメータ変更
    useEffect(() => {
        if (!workerProps) {
            return
        }
        const p = generateDefaultSuperResolutionParams()
        p.inputHeight = inputSize
        p.inputWidth = inputSize
        p.interpolation = interpolationTypes[interpolationTypeKey]
        p.scaleFactor = scaleFactors[modelKey]
        p.useSIMD = useSIMD
        p.useTensorflowjs = useTensorflowJS
        setWorkerProps({ ...workerProps, params: p })
    }, [inputSize, interpolationTypeKey, useSIMD, useTensorflowJS, onLocal])  // eslint-disable-line


    /// input設定
    useEffect(() => {
        const video = document.getElementById("input_video") as HTMLVideoElement
        if (inputMedia.mediaType === "IMAGE") {
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () => {
                setLayout()
            }
            img.src = inputMedia.media as string
        } else if (inputMedia.mediaType === "MOVIE") {
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = null
            vid.src = inputMedia.media as string
            vid.loop = true
            vid.onloadeddata = () => {
                video.play()
                setLayout()
            }
        } else {
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () => {
                video.play()
                setLayout()
            }
        }
    }, [inputMedia])  // eslint-disable-line

    //////////////
    ///// util  //
    //////////////
    const setLayout = () => {
        const outputElem = document.getElementById("output") as HTMLCanvasElement
        const scaleFactor = scaleFactors[modelKey]
        if (inputMedia.mediaType === "IMAGE") {
            const inputElem = document.getElementById("input_img") as HTMLImageElement
            const ratio = inputSize / inputElem.naturalWidth
            inputElem.width = inputElem.naturalWidth * ratio
            inputElem.height = inputElem.naturalHeight * ratio
            outputElem.width = inputElem.width * scaleFactor
            outputElem.height = inputElem.height * scaleFactor

        } else {
            const inputElem = document.getElementById("input_video") as HTMLVideoElement
            const ratio = inputSize / inputElem.videoWidth
            inputElem.width = inputElem.videoWidth * ratio
            inputElem.height = inputElem.videoHeight * ratio
            outputElem.width = inputElem.width * scaleFactor
            outputElem.height = inputElem.height * scaleFactor
        }
    }
    //////////////////
    //  pipeline    //
    //////////////////
    useEffect(() => {
        console.log("[Pipeline] Start", workerProps)
        let renderRequestId: number
        const LOOP_ID = performance.now()
        GlobalLoopID = LOOP_ID

        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const dstCtx = dst.getContext("2d")!
        const tmpCtx = tmp.getContext("2d")!

        setLayout()

        const render = async () => {
            console.log("RENDER::::", LOOP_ID, renderRequestId, workerProps?.params)
            const start = performance.now()

            if (workerProps) {
                tmp.width = src.width
                tmp.height = src.height
                tmpCtx.drawImage(src, 0, 0, tmp.width, tmp.height)

                if(workerProps.params.interpolation === InterpolationType.CANVAS){
                    const start = performance.now();                
                    dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
                    const end   = performance.now();
                    const duration = end - start
                    const info = document.getElementById("info") as HTMLCanvasElement
                    info.innerText = `processing time: ${duration}` 

                }else{
                    const inference_start = performance.now()
                    workerProps.params.inputWidth = src.width                    
                    workerProps.params.inputHeight = src.height
                    const prediction = await workerProps.manager.predict(tmp!, workerProps.params)
                    const inference_end = performance.now()
                    const info = document.getElementById("info") as HTMLCanvasElement
                    info.innerText = `processing time: ${inference_end - inference_start}`
                    if (!prediction) {
                        if (GlobalLoopID === LOOP_ID) {
                            renderRequestId = requestAnimationFrame(render)
                        }
                        return
                    }
                    try{
                        const resizedImage = new ImageData(new Uint8ClampedArray(prediction), workerProps.params.inputWidth * workerProps.params.scaleFactor, workerProps.params.inputHeight * workerProps.params.scaleFactor)
                        dstCtx.putImageData(resizedImage, 0, 0)
                    }catch(exception){
                        console.log(exception)
                    }
                }

                if (GlobalLoopID === LOOP_ID) {
                    renderRequestId = requestAnimationFrame(render)
                }
            }
            const end = performance.now()
            const info2 = document.getElementById("info2") as HTMLCanvasElement
            info2.innerText = `processing time: ${end - start}`
        }
        render()
        return () => {
            console.log("CANCEL", renderRequestId)
            cancelAnimationFrame(renderRequestId)
        }
    }, [workerProps, inputMedia]) // eslint-disable-line




    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{ display: "flex" }}>
                <div>
                    <VideoInputSelect title="input" current={""} onchange={inputChange} options={videoInputList} />
                    <DropDown title="model" current={modelKey} onchange={setModelKey} options={models} />
                    <DropDown title="type" current={interpolationTypeKey} onchange={setInterpolationTypeKey} options={interpolationTypes} />

                    <Toggle title="onLocal" current={onLocal} onchange={setOnLocal} />
                    <SingleValueSlider title="inputSize(w)" current={inputSize} onchange={setInputSize} min={64} max={256} step={16} />
                    <Toggle title="SIMD" current={useSIMD} onchange={setUseSIMD} />
                    <Toggle title="TensorflowJS" current={useTensorflowJS} onchange={setUseTensorflowJS} />

                    <div >
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                    {inputMedia.mediaType === "IMAGE" ?
                        <img className={classes.inputView} id="input_img" alt=""></img>
                        :
                        <video className={classes.inputView} id="input_video"></video>
                    }
                    <canvas className={classes.inputView} id="output"></canvas>
                </div>
            </div>

            <div style={{ display: "flex" }}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>

            </div>
            <div >
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
    );
}

export default App;
