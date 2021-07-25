import React, { useEffect, useState } from 'react';
import './App.css';
import { makeStyles } from '@material-ui/core';
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { generateDefaultPoseNetParams, generatePoseNetDefaultConfig, getAdjacentKeyPoints, PoseNetConfig, PoseNetFunctionType, PoseNetOperatipnParams, PoseNetWorkerManager } from '@dannadori/posenet-worker-js'

let GlobalLoopID:number = 0


const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:512,
        maxHeight:512,
    }
}));


const models: { [name: string]: 'ResNet50' | 'MobileNetV1' } = {
    "MobileNetV1":"MobileNetV1",
    "ResNet50":"ResNet50",
}
const functions: { [name: string]: PoseNetFunctionType } = {
    "SinglePerson":PoseNetFunctionType.SinglePerson,
    "MultiPerson":PoseNetFunctionType.MultiPerson,
}
const outputStrides: { [name: string]: 8 | 16 | 32 } = {
    "8":  8,
    "16": 16,
    "32": 32,
}
const multipliers: { [name: string]: 1 | 0.75 | 0.5 } = {
    "0.5"  : 0.5,
    "0.75" : 0.75,
    "1.0"  : 1.0,
}

const quantBytes: { [name: string]: 1 | 2 | 4 } = {
    "1": 1,
    "2": 2,
    "4": 4,
}



interface WorkerProps {
    manager: PoseNetWorkerManager
    config : PoseNetConfig
    params : PoseNetOperatipnParams
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

    const [ modelKey, setModelKey] = useState(Object.keys(models)[0])
    const [ functionKey, setFunctionKey ]                     = useState(Object.keys(functions)[0])
    const [ outputStrideKey, setOutputStrideKey]              = useState(Object.keys(outputStrides)[1])
    const [ multiplierKey, setMultiplierKey]                  = useState(Object.keys(multipliers)[1])
    const [ quantByteKey, setQuantByteKey]                    = useState(Object.keys(quantBytes)[1])
    const [ internalWidth, setInternalWidth]                  = useState(257)
    const [ internalHeight, setInternalHeight]                = useState(257)

    const [ onLocal, setOnLocal]                              = useState(true)
    const [ useWasm, setUseWasm]                              = useState(false) // eslint-disable-line
    const [ flip, setFlip]                                    = useState(false) // eslint-disable-line
    const [ maxDetection, setMaxDetection]                    = useState(10)
    const [ socreThreshold, setScoreThreshold]                = useState(0.3)
    const [ nmsRadius, setNmsRadius]                          = useState(50)

    // const [ processWidth, setProcessWidth]                    = useState(300)
    // const [ processHeight, setProcessHeight]                  = useState(300)
    const [ strict, setStrict]                                = useState(false) // eslint-disable-line

    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"yuka_kawamura.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        setInputMedia({mediaType:mediaType, media:input})
    }

    ///////////////////////////
    /// プロパティ設定      ///
    ///////////////////////////
    //// モデル切り替え
    useEffect(()=>{
        const init = async () =>{
            const m = workerProps? workerProps.manager : new PoseNetWorkerManager()
            const count = workerProps? workerProps.count + 1: 0
            const c = generatePoseNetDefaultConfig()
            c.processOnLocal = onLocal
            c.useTFWasmBackend = useWasm
            c.model.architecture = models[modelKey]
            c.model.multiplier = multipliers[multiplierKey]
            c.model.outputStride = outputStrides[outputStrideKey]
            c.model.quantBytes = quantBytes[quantByteKey]
            c.model.inputResolution = {width:internalWidth, height:internalHeight}
            await m.init(c)
    
            const p = generateDefaultPoseNetParams()
            p.type = functions[functionKey]
            p.singlePersonParams.flipHorizontal = flip
            p.multiPersonParams.flipHorizontal = flip
            p.multiPersonParams.maxDetections = maxDetection
            p.multiPersonParams.nmsRadius = nmsRadius
            p.multiPersonParams.scoreThreshold = socreThreshold

            const newProps = {manager:m, config:c, params:p, count:count}
            setWorkerProps(newProps)
        }
        init()
    }, [onLocal, useWasm, modelKey, multiplierKey, outputStrideKey, quantByteKey, internalWidth, internalHeight]) // eslint-disable-line

    //// パラメータ変更
    useEffect(()=>{
        if(!workerProps){
            return
        }
        const p = generateDefaultPoseNetParams()
        p.type = functions[functionKey]
        p.singlePersonParams.flipHorizontal = flip
        p.multiPersonParams.flipHorizontal = flip
        p.multiPersonParams.maxDetections = maxDetection
        p.multiPersonParams.nmsRadius = nmsRadius
        p.multiPersonParams.scoreThreshold = socreThreshold

        // setWorkerProps({...workerProps, params:p})
        workerProps.params = p
    }, [flip, maxDetection, functionKey, nmsRadius, socreThreshold]) // eslint-disable-line


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

    useEffect(()=>{
        console.log("[Pipeline] Start", workerProps)
        let renderRequestId: number
        const LOOP_ID = performance.now()
        GlobalLoopID = LOOP_ID

        const render = async () => {
            console.log("RENDER::::", LOOP_ID, renderRequestId,  workerProps?.params)
            const start = performance.now()

            const dst = document.getElementById("output") as HTMLCanvasElement
            if(workerProps){
                if(dst.width > 0 && dst.height>0){

                    const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
                    const dst = document.getElementById("output") as HTMLCanvasElement
                    const srcCache = document.getElementById("src-cache") as HTMLCanvasElement
            
                    const dstCtx   = dst.getContext("2d")!
            
                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
            
                    const inference_start = performance.now()
                    const prediction = await workerProps.manager.predict(srcCache!, workerProps.params)
                    const inference_end = performance.now()
                    const info1 = document.getElementById("info") as HTMLCanvasElement
                    info1.innerText = `processing time: ${inference_end - inference_start}`

                    if(prediction){
                        // dstCtx.clearRect(0, 0, dst.width, dst.height)
                        dstCtx.drawImage(src, 0, 0, dst.width, dst.height)

                        prediction.forEach((x)=>{
                            // Draw Point
                            const keypoints = x.keypoints
                            keypoints.forEach(k =>{
                                const x = k.position.x
                                const y = k.position.y
                                dstCtx.fillStyle = "rgba(0,0,255,0.3)"
                                dstCtx.fillRect(x, y, 6, 6)
                            })


                            // Draw Skeleton
                            const adjacentKeyPoints = getAdjacentKeyPoints(x.keypoints, 0.0)
                            const scaleX = 1
                            const scaleY = 1  
                            adjacentKeyPoints.forEach(keypoints => {
                                dstCtx.beginPath();
                                dstCtx.moveTo(keypoints[0].position.x * scaleX, keypoints[0].position.y * scaleY);
                                dstCtx.lineTo(keypoints[1].position.x * scaleX, keypoints[1].position.y * scaleY);
                                dstCtx.lineWidth = 6;
                                dstCtx.strokeStyle = "rgba(255,0,0,0.3)";
                                dstCtx.stroke();
                              })

                        })

                        
                        
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
                        <img  className={classes.inputView} alt="input_img" id="input_img"></img>
                        :
                        <video  className={classes.inputView} id="input_video"></video>
                    }
                    <canvas className={classes.inputView} id="output"></canvas>
                </div>
                <div className={classes.inputView}>
                    <VideoInputSelect  title="input"                 current={""}             onchange={inputChange}     options={videoInputList}/>
                    <DropDown          title="model"         current={modelKey}       onchange={setModelKey}     options={models} />
                    <DropDown          title="func"         current={functionKey}       onchange={setFunctionKey}     options={functions} />
                    <DropDown          title="outputStride"         current={outputStrideKey}       onchange={setOutputStrideKey}     options={outputStrides} />
                    <DropDown          title="multiplier"         current={multiplierKey}       onchange={setMultiplierKey}     options={multipliers} />
                    <DropDown          title="quantByte"         current={quantByteKey}       onchange={setQuantByteKey}     options={quantBytes} />

                    <SingleValueSlider title="resolutionW"              current={internalWidth}       onchange={setInternalWidth} min={128} max={512} step={10} />
                    <SingleValueSlider title="resolutionH"              current={internalHeight}       onchange={setInternalHeight} min={128} max={512} step={10} />
                    <SingleValueSlider title="maxDetection"    current={maxDetection}     onchange={setMaxDetection} min={1} max={20} step={1} />
                    <SingleValueSlider title="scoThreshold"    current={socreThreshold}     onchange={setScoreThreshold} min={0} max={1} step={0.1} />
                    <SingleValueSlider title="nmsRadius"    current={nmsRadius}     onchange={setNmsRadius} min={1} max={50} step={1} />

                    <Toggle            title="onLocal"               current={onLocal}        onchange={setOnLocal} />


                    {/* <Toggle            title="Strict"        current={strict}         onchange={setStrict} /> */}
                </div>
            </div>
            <div className={classes.inputView} id="output-div"></div>

            <div style={{display:"flex"}}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
                <img className={classes.inputView} alt="background" id="background" src="img/north-star-2869817_640.jpg" hidden></img>

            </div>
            <div >
                <div id="info"> </div>
                <div id="info2"> </div>
            </div>
        </div>
        );
}

export default App;
