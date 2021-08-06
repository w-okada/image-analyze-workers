import React, {  useEffect, useState } from 'react';
import './App.css';
import useTFLite from './hooks/useTFLite';
import { makeStyles} from '@material-ui/core';
import { useVideoInputList } from './hooks/useVideoInputList';
import { VideoInputType } from './const';
import { VideoInputSelect, DropDown, Toggle } from './components/components';


const models: { [name: string]: string } = {
  "192x192"    : `${process.env.PUBLIC_URL}/models/whitebox192.tflite`,
  "256x256"    : `${process.env.PUBLIC_URL}/models/whitebox256.tflite`,
}

const processSize: { [name: string]: number[] } = {
    "192x192": [192, 192],
    "256x256": [256, 256],
}

const useStyles = makeStyles((theme) => ({
    inputView:{
        maxWidth:300
    }
}));

const App = () => {
    const classes = useStyles();
    const { tflite, tfliteSIMD, setModelPath } = useTFLite()
    const { videoInputList } = useVideoInputList()
    // const {setTFLite, setSrc, setDst, setProcessSize} = usePipeline()


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
    const [inputMedia, setInputMedia] = useState<InputMedia>({mediaType:"IMAGE", media:"img/yuka_kawamura.jpg"})
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

    /// For output change
    // useEffect(()=>{
    //     const dst = document.getElementById("output") as HTMLCanvasElement
    //     // NOOP
    // },[])

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
        dst.width  = width
        dst.height = height
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

                /// Input data
                const imageData = tmpCtx.getImageData(0, 0, tmp.width, tmp.height)
                const inputImageBufferOffset = currentTFLite._getInputImageBufferOffset()
                for (let i = 0; i < tmp.width * tmp.height; i++) {
                    currentTFLite.HEAPU8[inputImageBufferOffset + i * 3 + 0] = imageData.data[i * 4 + 0]
                    currentTFLite.HEAPU8[inputImageBufferOffset + i * 3 + 1] = imageData.data[i * 4 + 1]
                    currentTFLite.HEAPU8[inputImageBufferOffset + i * 3 + 2] = imageData.data[i * 4 + 2]
                }

                /// inferecence
                const start = performance.now();                
                currentTFLite._exec(tmp.width, tmp.height)
                const end   = performance.now();
                const duration = end - start
                /////infoDiv.innerText = `MS: ${duration}`



                /// Output data
                const outputImageBufferOffset = currentTFLite._getOutputImageBufferOffset() 
                // const outputImageBufferOffset = tflite._getGrayedImageBufferOffset() 
                const segmentationMask = new ImageData(tmp.width, tmp.height)
                for (let i = 0; i < tmp.width * tmp.height; i++) {

                    segmentationMask.data[i * 4 + 0] =  (currentTFLite.HEAPU8[outputImageBufferOffset + i * 3 + 0] + 0) 
                    segmentationMask.data[i * 4 + 1] =  (currentTFLite.HEAPU8[outputImageBufferOffset + i * 3 + 1] + 0) 
                    segmentationMask.data[i * 4 + 2] =  (currentTFLite.HEAPU8[outputImageBufferOffset + i * 3 + 2] + 0) 
                    segmentationMask.data[i * 4 + 3] =  255                
                    }
                tmpCtx.putImageData(segmentationMask, 0, 0)
                outCtx.clearRect(0, 0, dst.width, dst.height)
                outCtx.drawImage(tmp, 0, 0, dst.width, dst.height)

                const info = document.getElementById("info") as HTMLCanvasElement
                info.innerText = `processing time: ${duration}` 

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
    }, [tflite, tfliteSIMD, inputMedia, useSIMD]) // eslint-disable-line



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
