import React, {  useEffect, useState } from 'react';
import './App.css';
import useTFLite from './hooks/useTFLite';
import { makeStyles} from '@material-ui/core';
import { useVideoInputList } from './hooks/useVideoInputList';
import { VideoInputSelect, DropDown, Toggle } from './components/components';
import { VideoInputType } from './const';


const models: { [name: string]: string } = {
    "172x172"    : `${process.env.PUBLIC_URL}/models/barcode172_light.tflite`,
}

const processSize: { [name: string]: number[] } = {
    "172x172": [172, 172],
}

const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:300
    }
}));

export const App = () => {
    const classes = useStyles();
    const { tflite, tfliteSIMD, setModelPath } = useTFLite()
    const { videoInputList } = useVideoInputList()


    ////////////
    /// Properties
    ////////////
    const [ modelKey, setModelKey ]            = useState(Object.keys(models)[0])
    // const [ processSizeKey, setProcessSizeKey] = useState(Object.keys(processSize)[0])
    const [ useSIMD, setUseSIMD]               = useState(false)

    interface InputMedia{
        mediaType : VideoInputType
        media     : MediaStream|string
    }
    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"img/barcode_01.jpg"})
    const inputChange = (mediaType: VideoInputType, input:MediaStream|string) =>{
        console.log("[inputchange]", mediaType, input)
        setInputMedia({mediaType:mediaType, media:input})
    }

    ////////////////////
    //// Effects
    ////////////////////

    /// For model change
    useEffect(()=>{
        const modelPath = models[modelKey]
        console.log("path change", modelPath)
        setModelPath(modelPath)
    },[modelKey]) // eslint-disable-line

    /// For model setting change
    useEffect(()=>{
        if(!tflite){
            return
        }
        /// NOOP
    },[tflite, tfliteSIMD])

    /// For input change
    useEffect(()=>{
        const video = document.getElementById("input_video") as HTMLVideoElement
        if(inputMedia.mediaType === "IMAGE"){
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () =>{
                resizeDst(img)
            }
            img.src = inputMedia.media as string
            // setSrc(img)
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
            // setSrc(vid)
        }else{
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () =>{
                video.play()
                resizeDst(vid)
            }
            // setSrc(vid)
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
        const src_cache = document.getElementById("src-cache") as HTMLCanvasElement

        dst.width  = width
        dst.height = height
        front.width  = width
        front.height = height
        src_cache.width = width
        src_cache.height = height
    }


    //////////////////
    //  pipeline    //
    //////////////////
    useEffect(()=>{
        console.log("[Pipeline] Start")
        let renderRequestId: number
        const LOOP_ID = performance.now()

        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const src_cache = document.getElementById("src-cache") as HTMLCanvasElement
        const src_cacheCtx = src_cache.getContext("2d")!
        const tmpCtx = tmp.getContext("2d")!
        const outCtx = dst.getContext("2d")!
        const render = () => {
            console.log("RENDER::::", LOOP_ID)
            let currentTFLite
            if(useSIMD){
                currentTFLite = tfliteSIMD
            }else{
                currentTFLite = tflite
            }
            if(currentTFLite && modelKey){
                tmp.width = processSize[modelKey][0]
                tmp.height = processSize[modelKey][1]
                tmpCtx.drawImage(src, 0, 0, tmp.width, tmp.height)

                // outCtx.filter = `blur(10px)`;
                // outCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
                // outCtx.filter = `none`;
                outCtx.clearRect(0, 0, dst.width, dst.height)

                src_cacheCtx.drawImage(tmp, 0, 0, dst.width, dst.height)

                /// Input data
                const imageData = tmpCtx.getImageData(0, 0, tmp.width, tmp.height)                
                const inputImageBufferOffset = currentTFLite._getInputImageBufferOffset()
                currentTFLite.HEAPU8.set(imageData.data, inputImageBufferOffset);

                /// inferecence
                console.log("EXEC START")
                try{
                    // currentTFLite._exec(tmp.width, tmp.height, 3, 1)
                    // currentTFLite._exec(tmp.width, tmp.height, 2, 0)
                    currentTFLite._exec(tmp.width, tmp.height, 2, 1)
                }catch(e){
                    console.log(e)
                }
                console.log("EXEC END")
                /////infoDiv.innerText = `MS: ${duration}`



                /// Output data
                const outputImageBufferOffset = currentTFLite._getOutputImageBufferOffset() 
                // const outputImageBufferOffset = tflite._getGrayedImageBufferOffset() 
                const segmentationMask = new ImageData(new Uint8ClampedArray(currentTFLite.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + tmp.width * tmp.height * 4)), tmp.width, tmp.height)
                console.log(segmentationMask)

                tmpCtx.putImageData(segmentationMask, 0, 0)
                // frontCtx.clearRect(0, 0, front.width, front.height)
                // frontCtx.drawImage(tmp, 0, 0, front.width, front.height)
                outCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
                // const info = document.getElementById("info") as HTMLCanvasElement
                // info.innerText = `processing time: ${duration}` 
            
//                console.log("size; tmp, dst",tmpCanvas.width, tmpCanvas.height,dst.width, dst.height)
            }else{
                // console.log("not ready", tflite, src, dst)
            }
            renderRequestId = requestAnimationFrame(render)
        }
        render()
        return ()=>{
            cancelAnimationFrame(renderRequestId)
        }
    }, [tflite, inputMedia, useSIMD]) // eslint-disable-line



    ///////////////
    // Render    //
    ///////////////
    return (
        <div>
            <div style={{display:"flex"}}>
                <div style={{display:"flex"}}>
                    {inputMedia.mediaType === "IMAGE" ? 
                        <img  className={classes.inputView} id="input_img" alt=""></img>
                        :
                        <video  className={classes.inputView} id="input_video"></video>
                    }
                    <canvas className={classes.inputView} id="output"></canvas>
                </div>
                <div>
                    <VideoInputSelect  title="input"       current={""}             onchange={inputChange}     options={videoInputList}/>
                    <DropDown          title="model"       current={modelKey}       onchange={setModelKey}     options={models} />
                    {/* <DropDown          title="ProcessSize" current={processSizeKey} onchange={setProcessSizeKey} options={processSize} /> */}
                    <Toggle            title="SIMD"        current={useSIMD}        onchange={setUseSIMD} />
                </div>
            </div>
            <div style={{display:"flex"}}>
                <canvas className={classes.inputView} id="tmp" hidden></canvas>
                <canvas className={classes.inputView} id="front" hidden></canvas>
                <canvas className={classes.inputView} id="src-cache" hidden></canvas>
            </div>

            <div>
                <div id="info">
                </div>
            </div>
        </div>
    )
}

export default App;
