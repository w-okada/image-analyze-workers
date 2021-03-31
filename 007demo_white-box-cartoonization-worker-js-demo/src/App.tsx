import React, { useEffect, useState } from 'react';
import './App.css';
import { makeStyles } from '@material-ui/core';
import { DropDown, SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { CartoonWorkerManager, generateCartoonDefaultConfig, generateDefaultCartoonParams } from '@dannadori/white-box-cartoonization-worker-js';
import { CartoonConfig, CartoonOperatipnParams } from '@dannadori/white-box-cartoonization-worker-js/dist/const';

let GlobalLoopID:number = 0

const models: { [name: string]: string } = {
    "original": `${process.env.PUBLIC_URL}/white-box-cartoonization/model.json`,
}

const processSizes: { [name: string]: number[] } = {
    "64": [64, 64],
    "128": [128, 128],
    "192": [192, 192],
    "256": [256, 256],
    "320": [320, 320],
    "440": [440, 440],
    "512": [512, 512],
}

  
const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:512,
        maxHeight:512,
    }
}));

interface WorkerProps {
    manager: CartoonWorkerManager
    config : CartoonConfig
    params : CartoonOperatipnParams
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
    const [ processSizeKey, setProcessSizeKey] = useState(Object.keys(processSizes)[0])

    const [ onLocal, setOnLocal]                              = useState(true)
    const [ useWasm, setUseWasm]                              = useState(false)
    const [ strict, setStrict]                                = useState(false)

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
            const m = workerProps? workerProps.manager : new CartoonWorkerManager()
            const count = workerProps? workerProps.count + 1: 0
            const c = generateCartoonDefaultConfig()
            c.processOnLocal = onLocal
            c.useTFWasmBackend = useWasm
            c.modelPath = models[modelKey]
            await m.init(c)
    
            const p = generateDefaultCartoonParams()
            p.processWidth = processSizes[processSizeKey][0]
            p.processHeight = processSizes[processSizeKey][1]
            const newProps = {manager:m, config:c, params:p, count:count}
            setWorkerProps(newProps)
        }
        init()
    }, [modelKey, onLocal, useWasm])

    //// パラメータ変更
    useEffect(()=>{
        if(!workerProps){
            return
        }
        const p = generateDefaultCartoonParams()
        p.processWidth = processSizes[processSizeKey][0]
        p.processHeight = processSizes[processSizeKey][1]
        // setWorkerProps({...workerProps, params:p})
        workerProps.params = p
    }, [processSizeKey])

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
        let counter = 0
        let fps_start = performance.now()

        const render = async () => {
            console.log("RENDER::::", LOOP_ID, renderRequestId,  workerProps?.params)
            const start = performance.now()

            const dst = document.getElementById("output") as HTMLCanvasElement
            if(workerProps){
                if(dst.width > 0 && dst.height>0){

                    const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
                    const background = document.getElementById("background") as HTMLImageElement
                    // const dst = document.getElementById("output") as HTMLCanvasElement
                    const dst_div = document.getElementById("output-div") as HTMLDivElement
                    const dst = document.getElementById("output") as HTMLCanvasElement
                    const tmp = document.getElementById("tmp") as HTMLCanvasElement
                    const front = document.getElementById("front") as HTMLCanvasElement
                    const srcCache = document.getElementById("src-cache") as HTMLCanvasElement
            
                    const tmpCtx = tmp.getContext("2d")!
                    const frontCtx = front.getContext("2d")!
                    const dstCtx   = dst.getContext("2d")!
            
                    srcCache.getContext("2d")!.drawImage(src, 0, 0, srcCache.width, srcCache.height)
            
                    const inference_start = performance.now()
                    const prediction = await workerProps.manager.predict(srcCache!, workerProps.params)
                    const inference_end = performance.now()
                    const info1 = document.getElementById("info") as HTMLCanvasElement
                    info1.innerText = `processing time: ${inference_end - inference_start}`

                    if(prediction){
                        console.log(prediction)
                        dstCtx.drawImage(prediction, 0, 0, dst.width, dst.height)
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
                <div className={classes.inputView}>
                    <VideoInputSelect  title="input"                 current={""}             onchange={inputChange}     options={videoInputList}/>
                    <DropDown title="model" current={modelKey} onchange={setModelKey} options={models} />
                    <DropDown title="processSize" current={processSizeKey} onchange={setProcessSizeKey} options={processSizes} />
                    
                    <Toggle            title="onLocal"               current={onLocal}        onchange={setOnLocal} />


                    {/* <Toggle            title="Strict"        current={strict}         onchange={setStrict} /> */}
                </div>
            </div>
            <div className={classes.inputView} id="output-div"></div>

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
