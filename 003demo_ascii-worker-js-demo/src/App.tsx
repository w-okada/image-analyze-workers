import React, { useEffect, useState } from 'react';
import './App.css';
import { makeStyles } from '@material-ui/core';
import { SingleValueSlider, Toggle, VideoInputSelect } from './components/components';
import { VideoInputType } from './const';
import { useVideoInputList } from './hooks/useVideoInputList';
import { AsciiArtWorkerManager, AsciiConfig, AsciiOperatipnParams, generateAsciiArtDefaultConfig, generateDefaultAsciiArtParams } from '@dannadori/asciiart-worker-js';

let GlobalLoopID:number = 0


const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:512,
        maxHeight:512,
    }
}));

const OUT_HEIGHT = 512


interface WorkerProps {
    manager: AsciiArtWorkerManager
    config : AsciiConfig
    params : AsciiOperatipnParams
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

    const [ fontSize, setFontSize] = useState(6)
    const [ ascii, setAscii] = useState(true)
    const [ onLocal, setOnLocal]                              = useState(true)
    const [ useWasm, setUseWasm]                              = useState(false)
    const [ processWidth, setProcessWidth]                    = useState(300)
    const [ processHeight, setProcessHeight]                  = useState(300)
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
            const m = workerProps? workerProps.manager : new AsciiArtWorkerManager()
            const count = workerProps? workerProps.count + 1: 0
            const c = generateAsciiArtDefaultConfig()
            c.processOnLocal = onLocal
            await m.init(c)
    
            const p = generateDefaultAsciiArtParams()
            p.processWidth  = processWidth
            p.processHeight = processHeight
            p.fontSize      = fontSize

            const newProps = {manager:m, config:c, params:p, count:count}
            setWorkerProps(newProps)
        }
        init()
    }, [onLocal, useWasm])

    //// パラメータ変更
    useEffect(()=>{
        if(!workerProps){
            return
        }
        const p = generateDefaultAsciiArtParams()
        p.processWidth  = processWidth
        p.processHeight = processHeight
        p.fontSize      = fontSize

        // setWorkerProps({...workerProps, params:p})
        workerProps.params = p
    }, [processWidth, processHeight, fontSize])


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
                        tmpCtx.font = fontSize + "px monospace"
                        tmpCtx.textBaseline = "top"
                        tmp.width = tmpCtx.measureText(prediction[0]+" ").width
                        tmp.height = prediction.length * fontSize
                        tmpCtx.clearRect(0, 0, dst.width, dst.height)
                        tmpCtx.fillStyle = "rgb(0, 0, 0)";
                        tmpCtx.font = fontSize + "px monospace"
                        for(let n=0; n<prediction.length; n++){
                            tmpCtx.fillText(prediction[n], 0, n * fontSize)
                        }
                        dstCtx.clearRect(0, 0, dst.width, dst.height)
                        dstCtx.drawImage(tmp, 0, 0, dst.width, dst.height)

                        if(ascii){
                            const charCount = prediction[0].length
                            const fontSize = Math.ceil(OUT_HEIGHT/charCount)
                            const a = prediction.reduce((a,n)=>{
                                return a+"\n"+n+""
                            })
                            dst_div.innerHTML = `<pre style="font-size: ${fontSize}px;">${a}</pre>`
                        }else{
                            dst_div.innerHTML = ``
                        }
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
    }, [workerProps, strict, ascii])




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
                    <SingleValueSlider title="fontSize"              current={fontSize}       onchange={setFontSize} min={2} max={20} step={1} />

                    <Toggle            title="onLocal"               current={onLocal}        onchange={setOnLocal} />
                    <Toggle            title="ascii"               current={ascii}        onchange={setAscii} />
                    {/* <SingleValueSlider title="processWidth"          current={processWidth}     onchange={setProcessWidth} min={100} max={1024} step={10} />
                    <SingleValueSlider title="processHeight"         current={processHeight}     onchange={setProcessHeight} min={100} max={1024} step={10} /> */}

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
