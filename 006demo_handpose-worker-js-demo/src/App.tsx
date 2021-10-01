import React, { useEffect, useState } from 'react';
import './App.css';
import { makeStyles } from '@material-ui/core';
import { SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { generateDefaultHandPoseParams, generateHandPoseDefaultConfig, HandPoseWorkerManager, HandPoseConfig, HandPoseOperatipnParams } from '@dannadori/handpose-worker-js';

let GlobalLoopID:number = 0

const fingerLookupIndices:{[key:string]:number[]} = {
    "thumb": [0, 1, 2, 3, 4],
    "indexFinger": [0, 5, 6, 7, 8],
    "middleFinger": [0, 9, 10, 11, 12],
    "ringFinger": [0, 13, 14, 15, 16],
    "pinky": [0, 17, 18, 19, 20]
}
  
const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:512,
        maxHeight:512,
    }
}));

interface WorkerProps {
    manager: HandPoseWorkerManager
    config : HandPoseConfig
    params : HandPoseOperatipnParams
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

    const [ maxContinuousCheck, setMaxContinuousCheck] = useState(1)
    const [ confidence, setConfidence] = useState(0.8)
    const [ iouThreshold, setIouThreshold] = useState(0.3)
    const [ scoreThreshold, setScoreThreshold] = useState(0.75)

    const [ onLocal, setOnLocal]                              = useState(true)
    const [ useWasm, setUseWasm]                              = useState(false) // eslint-disable-line
    const [ flip, setFlip]                                    = useState(false) // eslint-disable-line

    const [ processWidth, setProcessWidth]                    = useState(300)
    const [ processHeight, setProcessHeight]                  = useState(300)
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
            const m = workerProps? workerProps.manager : new HandPoseWorkerManager()
            const count = workerProps? workerProps.count + 1: 0
            const c = generateHandPoseDefaultConfig()
            c.processOnLocal = onLocal
            c.useTFWasmBackend = useWasm
            c.model.detectionConfidence = confidence
            c.model.iouThreshold = iouThreshold
            c.model.maxContinuousChecks = maxContinuousCheck
            c.model.scoreThreshold = scoreThreshold
            await m.init(c)
    
            const p = generateDefaultHandPoseParams()
            p.estimateHands.flipHorizontal = flip
            p.processHeight = processHeight
            p.processWidth = processWidth

            const newProps = {manager:m, config:c, params:p, count:count}
            setWorkerProps(newProps)
        }
        init()
    }, [onLocal, useWasm]) // eslint-disable-line

    //// パラメータ変更
    useEffect(()=>{
        if(!workerProps){
            return
        }
        const p = generateDefaultHandPoseParams()
        p.estimateHands.flipHorizontal = flip
        p.processHeight = processHeight
        p.processWidth = processWidth
        // setWorkerProps({...workerProps, params:p})
        workerProps.params = p
    }, [flip, processHeight, processWidth])// eslint-disable-line

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
                        console.log(prediction)
                        const scaleX = src.width  / workerProps.params.processWidth
                        const scaleY = src.height / workerProps.params.processHeight
                        dstCtx.drawImage(src, 0, 0, dst.width, dst.height)
                        prediction.forEach(x=>{
                            const landmarks = x.landmarks as number[][]
                            landmarks.forEach(landmark=>{
                                const x = landmark[0] * scaleX
                                const y = landmark[1] * scaleY
                                dstCtx.fillRect(x,y,5,5)
                            })
                            const fingers = Object.keys(fingerLookupIndices);
                            fingers.forEach(x=>{
                              const points = fingerLookupIndices[x].map(idx => landmarks[idx])
                      
                              dstCtx.beginPath();
                              dstCtx.moveTo(points[0][0]*scaleX, points[0][1]*scaleY);
                              for (let i = 1; i < points.length; i++) {
                                const point = points[i];
                                dstCtx.lineTo(point[0]*scaleX, point[1]*scaleY);
                              }
                              dstCtx.lineWidth = 3;
                              dstCtx.stroke();
                              dstCtx.closePath();
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
                    
                    <SingleValueSlider title="maxContinuousCheck"    current={maxContinuousCheck}     onchange={setMaxContinuousCheck} min={1} max={10} step={1} />                
                    <SingleValueSlider title="confidence"            current={confidence}     onchange={setConfidence} min={0} max={1} step={0.01} />                
                    <SingleValueSlider title="iouThreshold"          current={iouThreshold}     onchange={setIouThreshold} min={0} max={1} step={0.01} /> 
                    <SingleValueSlider title="scoreThreshold"        current={scoreThreshold}     onchange={setScoreThreshold} min={0} max={1} step={0.01} /> 

                    <SingleValueSlider title="processWidth"    current={processWidth}     onchange={setProcessWidth} min={100} max={1024} step={10} />
                    <SingleValueSlider title="processHeight"    current={processHeight}     onchange={setProcessHeight} min={100} max={1024} step={10} />

                    <Toggle            title="onLocal"               current={onLocal}        onchange={setOnLocal} />


                    <div >
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
            </div>
            <div className={classes.inputView} id="output-div"></div>

            <div style={{display:"flex"}}>
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
