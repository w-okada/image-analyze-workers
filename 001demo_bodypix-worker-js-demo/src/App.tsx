import React, { useEffect, useState } from 'react';
import './App.css';
import { makeStyles } from '@material-ui/core';
import { DropDown, FileChooser, SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { BodypixFunctionType, BodyPixInternalResolution, BodypixWorkerManager, generateBodyPixDefaultConfig, generateDefaultBodyPixParams, PartSegmentation, PersonSegmentation, SemanticPartSegmentation, SemanticPersonSegmentation } from '@dannadori/bodypix-worker-js'
import { BodyPixConfig, BodyPixOperatipnParams } from '@dannadori/bodypix-worker-js/dist/const';

let GlobalLoopID:number = 0

export const rainbow = [
    [110, 64, 170], [143, 61, 178], [178, 60, 178], [210, 62, 167],
    [238, 67, 149], [255, 78, 125], [255, 94, 99],  [255, 115, 75],
    [255, 140, 56], [239, 167, 47], [217, 194, 49], [194, 219, 64],
    [175, 240, 91], [135, 245, 87], [96, 247, 96],  [64, 243, 115],
    [40, 234, 141], [28, 219, 169], [26, 199, 194], [33, 176, 213],
    [47, 150, 224], [65, 125, 224], [84, 101, 214], [99, 81, 195]
];

const models: { [name: string]: string } = {
    "MobileNetV1":"MobileNetV1",
    "ResNet50":"ResNet50",
}
const functions: { [name: string]: string } = {
    "segmentPerson"          : "" + BodypixFunctionType.SegmentPerson,
    "segmentPersonParts"     : "" + BodypixFunctionType.SegmentPersonParts,
    "segmentMultiPerson"     : "" + BodypixFunctionType.SegmentMultiPerson,
    "segmentMultiPersonParts": "" + BodypixFunctionType.SegmentMultiPersonParts,
}
const outputStrides: { [name: string]: string } = {
    "8":"8",
    "16":"16",
    "32":"32",
}
const multipliers: { [name: string]: string } = {
    "0.5"  : "0.5",
    "0.75" : "0.75",
    "1.0"  : "1.0",
}

const quantBytes: { [name: string]: string } = {
    "1":"1",
    "2":"2",
    "4":"4",
}
const internalResolutions: { [name: string]: string } = {
    "low":"low",
    "medium":"medium",
    "high":"high",
    "full":"full",
}


const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:512,
        maxHeight:512,
    }
}));

interface WorkerProps {
    manager: BodypixWorkerManager
    config : BodyPixConfig
    params : BodyPixOperatipnParams
    count  : number
}
interface InputMedia{
    mediaType : VideoInputType
    media     : MediaStream|string
}

const App = () => {
    const classes = useStyles();
    const { videoInputList } = useVideoInputList()
    const [ workerProps, setWorkerProps] = useState<WorkerProps>()

    const [ modelKey, setModelKey ]                           = useState(Object.keys(models)[0])
    const [ functionKey, setFunctionKey ]                     = useState(Object.keys(functions)[0])
    const [ outputStrideKey, setOutputStrideKey]              = useState(Object.keys(outputStrides)[1])
    const [ multiplierKey, setMultiplierKey]                  = useState(Object.keys(multipliers)[1])
    const [ quantByteKey, setQuantByteKey]                    = useState(Object.keys(quantBytes)[1])
    const [ internalResolutionKey, setInternalResolutionKey]  = useState(Object.keys(internalResolutions)[1])

    const [ onLocal, setOnLocal]                              = useState(true)
    const [ useWasm, setUseWasm]                              = useState(false)
    const [ flip, setFlip]                                    = useState(true)
    const [ segmentationThreshold, setSegmentationThreshold]  = useState(0.7)
    const [ maxDetection, setMaxDetection]                    = useState(10)
    const [ socreThreshold, setScoreThreshold]                = useState(0.3)
    const [ nmsRadius, setNmsRadius]                          = useState(50)
    const [ minKeypointScore, setMinKeypointScore]            = useState(0.3)
    const [ refineSteps, setRefineSteps]                      = useState(10)
    const [ processWidth, setProcessWidth]                    = useState(300)
    const [ processHeight, setProcessHeight]                  = useState(300)
    const [ strict, setStrict]                                = useState(false)

    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"yuka_kawamura.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        setInputMedia({mediaType:mediaType, media:input})
    }

    const backgroundChange = (mediaType: VideoInputType, input:string) =>{
        console.log("background:", mediaType, input)
        if(mediaType==="IMAGE"){
            const img = document.getElementById("background") as HTMLImageElement
            img.src = input
        }
    }
    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(()=>{
        const init = async () =>{
            const m = workerProps? workerProps.manager : new BodypixWorkerManager()
            const count = workerProps? workerProps.count + 1: 0
            const c = generateBodyPixDefaultConfig()
            c.processOnLocal = onLocal
            c.model.architecture = models[modelKey] as ('ResNet50' | 'MobileNetV1')
            c.model.outputStride = parseInt(outputStrides[outputStrideKey]) as 8 | 16 |32
            c.model.multiplier = parseFloat(multipliers[multiplierKey]) as 0.5 | 0.75 | 1.0
            c.model.quantBytes = parseInt(quantBytes[quantByteKey]) as 4 | 2 | 1
            c.processOnLocal = onLocal
            c.useTFWasmBackend = useWasm
            await m.init(c)
    
            const p = generateDefaultBodyPixParams()
            p.processWidth  = processWidth
            p.processHeight = processHeight
            p.type = parseInt(functions[functionKey])

            // flip
            p.segmentPersonParams!.flipHorizontal = flip
            p.segmentPersonPartsParams!.flipHorizontal = flip
            p.segmentMultiPersonParams!.flipHorizontal = flip
            p.segmentMultiPersonPartsParams!.flipHorizontal = flip
            // internalResolution
            p.segmentPersonParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
            p.segmentPersonPartsParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
            p.segmentMultiPersonParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
            p.segmentMultiPersonPartsParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
            // segmentationThreshold
            p.segmentPersonParams!.segmentationThreshold = segmentationThreshold
            p.segmentPersonPartsParams!.segmentationThreshold = segmentationThreshold
            p.segmentMultiPersonParams!.segmentationThreshold = segmentationThreshold
            p.segmentMultiPersonPartsParams!.segmentationThreshold = segmentationThreshold
            // maxDetection
            p.segmentPersonParams!.maxDetections = maxDetection
            p.segmentPersonPartsParams!.maxDetections = maxDetection
            p.segmentMultiPersonParams!.maxDetections = maxDetection
            p.segmentMultiPersonPartsParams!.maxDetections = maxDetection
            // socreThreshold
            p.segmentPersonParams!.scoreThreshold = socreThreshold
            p.segmentPersonPartsParams!.scoreThreshold = socreThreshold
            p.segmentMultiPersonParams!.scoreThreshold = socreThreshold
            p.segmentMultiPersonPartsParams!.scoreThreshold = socreThreshold
            // nmsRadius
            p.segmentPersonParams!.nmsRadius = nmsRadius
            p.segmentPersonPartsParams!.nmsRadius = nmsRadius
            p.segmentMultiPersonParams!.nmsRadius = nmsRadius
            p.segmentMultiPersonPartsParams!.nmsRadius = nmsRadius
            // minKeypointScore
            p.segmentMultiPersonParams!.minKeypointScore = minKeypointScore
            p.segmentMultiPersonPartsParams!.minKeypointScore = minKeypointScore
            // refineSteps
            p.segmentMultiPersonParams!.refineSteps = refineSteps
            p.segmentMultiPersonPartsParams!.refineSteps = refineSteps


            const newProps = {manager:m, config:c, params:p, count:count}
            setWorkerProps(newProps)
        }
        init()
    }, [modelKey, onLocal, outputStrideKey, multiplierKey, quantByteKey, useWasm])

    //// パラメータ変更
    useEffect(()=>{
        if(!workerProps){
            return
        }
        const p = generateDefaultBodyPixParams()
        p.processWidth  = processWidth
        p.processHeight = processHeight
        p.type = parseInt(functions[functionKey])

        // flip
        p.segmentPersonParams!.flipHorizontal = flip
        p.segmentPersonPartsParams!.flipHorizontal = flip
        p.segmentMultiPersonParams!.flipHorizontal = flip
        p.segmentMultiPersonPartsParams!.flipHorizontal = flip
        // internalResolution
        p.segmentPersonParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
        p.segmentPersonPartsParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
        p.segmentMultiPersonParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
        p.segmentMultiPersonPartsParams!.internalResolution = internalResolutions[internalResolutionKey] as BodyPixInternalResolution
        // segmentationThreshold
        p.segmentPersonParams!.segmentationThreshold = segmentationThreshold
        p.segmentPersonPartsParams!.segmentationThreshold = segmentationThreshold
        p.segmentMultiPersonParams!.segmentationThreshold = segmentationThreshold
        p.segmentMultiPersonPartsParams!.segmentationThreshold = segmentationThreshold
        // maxDetection
        p.segmentPersonParams!.maxDetections = maxDetection
        p.segmentPersonPartsParams!.maxDetections = maxDetection
        p.segmentMultiPersonParams!.maxDetections = maxDetection
        p.segmentMultiPersonPartsParams!.maxDetections = maxDetection
        // socreThreshold
        p.segmentPersonParams!.scoreThreshold = socreThreshold
        p.segmentPersonPartsParams!.scoreThreshold = socreThreshold
        p.segmentMultiPersonParams!.scoreThreshold = socreThreshold
        p.segmentMultiPersonPartsParams!.scoreThreshold = socreThreshold
        // nmsRadius
        p.segmentPersonParams!.nmsRadius = nmsRadius
        p.segmentPersonPartsParams!.nmsRadius = nmsRadius
        p.segmentMultiPersonParams!.nmsRadius = nmsRadius
        p.segmentMultiPersonPartsParams!.nmsRadius = nmsRadius
        // minKeypointScore
        p.segmentMultiPersonParams!.minKeypointScore = minKeypointScore
        p.segmentMultiPersonPartsParams!.minKeypointScore = minKeypointScore
        // refineSteps
        p.segmentMultiPersonParams!.refineSteps = refineSteps
        p.segmentMultiPersonPartsParams!.refineSteps = refineSteps

        setWorkerProps({...workerProps, params:p})
    }, [processWidth, processHeight, functionKey, flip, internalResolutionKey, segmentationThreshold, maxDetection, socreThreshold, nmsRadius, minKeypointScore, refineSteps])


    /// input設定
    useEffect(()=>{
        const video = document.getElementById("input_video") as HTMLVideoElement
        if(inputMedia.mediaType === "IMAGE"){
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () =>{
                resizeDst(img)
            }
            img.src = inputMedia.media as string
        }else if(inputMedia.mediaType === "MOVIE"){
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject=null
            vid.src = inputMedia.media as string
            vid.loop = true
            vid.onloadeddata = () =>{
                video.play()
                resizeDst(vid)
            }
        }else{
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () =>{
                video.play()
                resizeDst(vid)
            }
        }
    },[inputMedia])

    /// resize
    useEffect(()=>{
        const input = document.getElementById("input_img") || document.getElementById("input_video")
        resizeDst(input!)
    })

    //////////////
    ///// util  //
    //////////////
    const resizeDst = (input:HTMLElement) =>{
        const cs = getComputedStyle(input)
        const width = parseInt(cs.getPropertyValue("width"))
        const height = parseInt(cs.getPropertyValue("height"))
        const dst = document.getElementById("output") as HTMLCanvasElement
        const front = document.getElementById("front") as HTMLCanvasElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement
        
        [dst, srcCache, front].forEach((c)=>{
            c.width = width
            c.height = height
        })
    }

    //////////////////
    //  pipeline    //
    //////////////////

    const drawSegmentation = async (workerProps:WorkerProps) => {
        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const background = document.getElementById("background") as HTMLImageElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const front = document.getElementById("front") as HTMLCanvasElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

        const tmpCtx = tmp.getContext("2d")!
        const frontCtx = front.getContext("2d")!
        const dstCtx = dst.getContext("2d")!

        srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)

        const inference_start = performance.now()
        const prediction = await workerProps.manager.predict(srcCache!, workerProps.params) as SemanticPersonSegmentation
        const inference_end = performance.now()
        const info1 = document.getElementById("info") as HTMLCanvasElement
        info1.innerText = `processing time: ${inference_end - inference_start}`


        if(!prediction.data){
            return
        }
        // console.log("PREDICTION", prediction)

        // generate mask
        const image = new ImageData(prediction.width, prediction.height)
        for(let i=0; i < prediction.data.length; i++){
            if(prediction.data[i] === 0){
                image.data[i * 4 + 0] = 0
                image.data[i * 4 + 1] = 0
                image.data[i * 4 + 2] = 0
                image.data[i * 4 + 3] = 0
            }else{
                image.data[i * 4 + 0] = 255
                image.data[i * 4 + 1] = 255
                image.data[i * 4 + 2] = 255
                image.data[i * 4 + 3] = 255
            }
        }
        tmp.width = prediction.width
        tmp.height = prediction.height
        tmpCtx.putImageData(image, 0, 0)

        // Generate front Image
        frontCtx.clearRect(0, 0, front.width, front.height)
        frontCtx.drawImage(tmp, 0, 0, front.width, front.height)
        frontCtx.globalCompositeOperation = "source-atop";
        frontCtx.drawImage(srcCache, 0, 0,  front.width, front.height)
        frontCtx.globalCompositeOperation = "source-over"; 

        // Generate Output
        dstCtx.clearRect(0, 0, dst.width, dst.height)
        dstCtx.drawImage(background, 0, 0, dst.width, dst.height)
        dstCtx.drawImage(front, 0, 0, dst.width, dst.height)
    }

    const drawParts = async (workerProps:WorkerProps) => {
        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const background = document.getElementById("background") as HTMLImageElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const front = document.getElementById("front") as HTMLCanvasElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

        const tmpCtx = tmp.getContext("2d")!
        const frontCtx = front.getContext("2d")!
        const dstCtx = dst.getContext("2d")!

        srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
        const prediction = await workerProps.manager.predict(srcCache!, workerProps.params) as SemanticPartSegmentation
        if(!prediction.data){
            return
        }

        // generate mask
        const image = new ImageData(prediction.width, prediction.height)
        for(let i=0; i < prediction.data.length; i++){
            const flag = prediction.data[i]
            if(flag === -1){
                image.data[i * 4 + 0] = 0
                image.data[i * 4 + 1] = 0
                image.data[i * 4 + 2] = 0
                image.data[i * 4 + 3] = 0
            }else{
                image.data[i * 4 + 0] = rainbow[flag][0]
                image.data[i * 4 + 1] = rainbow[flag][1]
                image.data[i * 4 + 2] = rainbow[flag][2]
                image.data[i * 4 + 3] = 100
            }
        }
        tmp.width = prediction.width
        tmp.height = prediction.height
        tmpCtx.putImageData(image, 0, 0)

        // Generate Output
        dstCtx.clearRect(0, 0, dst.width, dst.height)
        // dstCtx.drawImage(background, 0, 0, dst.width, dst.height)
        dstCtx.drawImage(srcCache, 0, 0, dst.width, dst.height)
        dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
    }

    const drawMultiSegmentation = async (workerProps:WorkerProps) => {
        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const background = document.getElementById("background") as HTMLImageElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const front = document.getElementById("front") as HTMLCanvasElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

        const tmpCtx = tmp.getContext("2d")!
        const frontCtx = front.getContext("2d")!
        const dstCtx = dst.getContext("2d")!

        srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
        const prediction = await workerProps.manager.predict(srcCache!, workerProps.params) as PersonSegmentation[]
        // console.log("PREDICTION", prediction)

        tmpCtx.clearRect(0, 0, tmp.width, tmp.height)
        if(prediction.length > 0){
            // generate mask
            //// First ALL CLEAR
            if(!prediction[0].width){
                return
            }
            const image = new ImageData(prediction[0].width, prediction[0].height)
            image.data.fill(0)

            //// THEN draw each person segment
            prediction.forEach(x=>{
                for(let i = 0; i<x.data.length;i++){
                    if(x.data[i] !== 0){
                        image.data[i * 4 + 0] = 255
                        image.data[i * 4 + 1] = 255
                        image.data[i * 4 + 2] = 255
                        image.data[i * 4 + 3] = 255
                    }
                }
            })

            tmp.width = prediction[0].width
            tmp.height = prediction[0].height
            tmpCtx.putImageData(image, 0, 0)
        }

        // Generate front Image
        frontCtx.clearRect(0, 0, front.width, front.height)
        frontCtx.drawImage(tmp, 0, 0, front.width, front.height)
        frontCtx.globalCompositeOperation = "source-atop";
        frontCtx.drawImage(srcCache, 0, 0,  front.width, front.height)
        frontCtx.globalCompositeOperation = "source-over"; 

        // Generate Output
        dstCtx.clearRect(0, 0, dst.width, dst.height)
        dstCtx.drawImage(background, 0, 0, dst.width, dst.height)
        dstCtx.drawImage(front, 0, 0, dst.width, dst.height)
    }    



    const drawMultiPersonParts = async (workerProps:WorkerProps) => {
        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const background = document.getElementById("background") as HTMLImageElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const front = document.getElementById("front") as HTMLCanvasElement
        const srcCache = document.getElementById("src-cache") as HTMLCanvasElement

        const tmpCtx = tmp.getContext("2d")!
        const frontCtx = front.getContext("2d")!
        const dstCtx = dst.getContext("2d")!

        srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
        const prediction = await workerProps.manager.predict(srcCache!, workerProps.params) as PartSegmentation[]

        tmpCtx.clearRect(0, 0, tmp.width, tmp.height)
        if(prediction.length > 0){
            if(!prediction[0].width){
                return
            }
            const image = new ImageData(prediction[0].width, prediction[0].height)
            image.data.fill(0)

            //// THEN draw each person segment
            prediction.forEach(x=>{
                for(let i = 0; i<x.data.length;i++){
                    const flag = x.data[i]
                    if(flag !== -1){
                        image.data[i * 4 + 0] = rainbow[flag][0]
                        image.data[i * 4 + 1] = rainbow[flag][1]
                        image.data[i * 4 + 2] = rainbow[flag][2]
                        image.data[i * 4 + 3] = 100
                    }
                }
            })
            tmp.width = prediction[0].width
            tmp.height = prediction[0].height
            tmpCtx.putImageData(image, 0, 0)
        }

        // Generate Output
        dstCtx.clearRect(0, 0, dst.width, dst.height)
        // dstCtx.drawImage(background, 0, 0, dst.width, dst.height)
        dstCtx.drawImage(srcCache, 0, 0, dst.width, dst.height)
        dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
    }

    useEffect(()=>{
        console.log("[Pipeline] Start", workerProps)
        let renderRequestId: number
        const LOOP_ID = performance.now()
        GlobalLoopID = LOOP_ID
        let counter = 0
        let fps_start = performance.now()

        const render = async () => {
            console.log("RENDER::::", LOOP_ID, renderRequestId,  workerProps?.params)
            const start = performance.now()

            const dst = document.getElementById("output") as HTMLCanvasElement
            if(workerProps){
                if(dst.width > 0 && dst.height>0){
                    switch(workerProps.params.type){
                        case BodypixFunctionType.SegmentPerson:
                            await drawSegmentation(workerProps)
                            break
                        case BodypixFunctionType.SegmentPersonParts:
                            await drawParts(workerProps)
                            break
                        case BodypixFunctionType.SegmentMultiPerson:
                            await drawMultiSegmentation(workerProps)
                            break
                        case BodypixFunctionType.SegmentMultiPersonParts:
                            await drawMultiPersonParts(workerProps)
                            break
                        default:
                            break
                    }
                }
                if(GlobalLoopID === LOOP_ID){
                    renderRequestId = requestAnimationFrame(render)
                }
            }
            
            const end = performance.now()
            const info2 = document.getElementById("info2") as HTMLCanvasElement
            info2.innerText = `processing time: ${end-start}`
        }
        render()
        return ()=>{
            console.log("CANCEL", renderRequestId)
            cancelAnimationFrame(renderRequestId)
        }
    }, [workerProps, strict])




    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{display:"flex"}}>
                <div style={{display:"flex"}}>
                    {inputMedia.mediaType === "IMAGE" ? 
                        <img  className={classes.inputView} id="input_img"></img>
                        :
                        <video  className={classes.inputView} id="input_video"></video>
                    }
                    <canvas className={classes.inputView} id="output"></canvas>
                </div>
                <div>
                    <VideoInputSelect  title="input"         current={""}             onchange={inputChange}     options={videoInputList}/>
                    <DropDown          title="model"         current={modelKey}       onchange={setModelKey}     options={models} />
                    <DropDown          title="func"         current={functionKey}       onchange={setFunctionKey}     options={functions} />
                    <DropDown          title="outputStride"         current={outputStrideKey}       onchange={setOutputStrideKey}     options={outputStrides} />
                    <DropDown          title="multiplier"         current={multiplierKey}       onchange={setMultiplierKey}     options={multipliers} />
                    <DropDown          title="quantByte"         current={quantByteKey}       onchange={setQuantByteKey}     options={quantBytes} />
                    <DropDown          title="resolution"         current={internalResolutionKey}       onchange={setInternalResolutionKey}     options={internalResolutions} />

                    <Toggle            title="onLocal"       current={onLocal}        onchange={setOnLocal} />
                    {/* <Toggle            title="useWasm"       current={useWasm}        onchange={setUseWasm} /> */}
                    {/* <Toggle            title="flip"       current={flip}        onchange={setFlip} /> */}

                    <SingleValueSlider title="segThreshold"    current={segmentationThreshold}     onchange={setSegmentationThreshold} min={0} max={1} step={0.1} />                
                    <SingleValueSlider title="maxDetection"    current={maxDetection}     onchange={setMaxDetection} min={1} max={20} step={1} />
                    <SingleValueSlider title="scoThreshold"    current={socreThreshold}     onchange={setScoreThreshold} min={0} max={1} step={0.1} />
                    <SingleValueSlider title="nmsRadius"    current={nmsRadius}     onchange={setNmsRadius} min={1} max={50} step={1} />
                    <SingleValueSlider title="minKeypointScore"    current={minKeypointScore}     onchange={setMinKeypointScore} min={0.1} max={0.9} step={0.1} />
                    <SingleValueSlider title="refineSteps"    current={refineSteps}     onchange={setRefineSteps} min={1} max={20} step={1} />
                    

                    <SingleValueSlider title="processWidth"    current={processWidth}     onchange={setProcessWidth} min={100} max={1024} step={10} />
                    <SingleValueSlider title="processHeight"    current={processHeight}     onchange={setProcessHeight} min={100} max={1024} step={10} />
                    
                    {/* <Toggle            title="Strict"        current={strict}         onchange={setStrict} /> */}
                    <FileChooser       title="background"  onchange={backgroundChange} />
                </div>
            </div>

            <div style={{display:"flex"}}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <img className={classes.inputView} id="background" src="img/north-star-2869817_640.jpg" hidden></img>

            </div>
            <div >
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
        );
}

export default App;
