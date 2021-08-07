import React, {  useEffect, useState } from 'react';
import './App.css';
import useTFLite from './hooks/useTFLite';
import { makeStyles} from '@material-ui/core';
import { useVideoInputList } from './hooks/useVideoInputList';
import { VideoInputType } from './const';
import { VideoInputSelect, DropDown, Toggle, SingleValueSlider } from './components/components';


const models: { [name: string]: string } = {
  "x2"    : `${process.env.PUBLIC_URL}/models/model_x2_nopadding.tflite`,
  "x3"    : `${process.env.PUBLIC_URL}/models/model_x3_nopadding.tflite`,
  "x4"    : `${process.env.PUBLIC_URL}/models/model_x4_nopadding.tflite`,
}
const scaleFactors: { [name: string]: number} = {
    "x2"    : 2,
    "x3"    : 3,
    "x4"    : 4,
}
  

const interpolationTypes: { [name: string]: number } = {
    "espcn"    : 100,
    "LANCZOS4" : 4,
    "CUBIC"    : 3,
    "AREA"     : 2,
    "LINEAR"   : 1,
    "NEAREST"  : 0,
    "canvas"   : 200,
}


const useStyles = makeStyles((theme) => ({
    inputView:{
        // maxWidth:300
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
    const [ interpolationTypeKey, setInterpolationTypeKey] = useState(Object.keys(interpolationTypes)[0])
    const [ useSIMD, setUseSIMD]               = useState(false)
    const [ inputSize, setInputSize ]          = useState(64)


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


    /// For input change
    useEffect(()=>{
        const video = document.getElementById("input_video") as HTMLVideoElement
        if(inputMedia.mediaType === "IMAGE"){
            const img = document.getElementById("input_img") as HTMLImageElement
            img.onloadeddata = () =>{
                setLayout()
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
                setLayout()
            }
            // setSrc(vid)
        }else{
            const vid = document.getElementById("input_video") as HTMLVideoElement
            vid.pause()
            vid.srcObject = inputMedia.media as MediaStream
            vid.onloadeddata = () =>{
                video.play()
                setLayout()
            }
            // setSrc(vid)
        }
    },[inputMedia]) // eslint-disable-line

    const setLayout = () =>{
        const outputElem = document.getElementById("output") as HTMLCanvasElement
        const scaleFactor = scaleFactors[modelKey]
        if(inputMedia.mediaType === "IMAGE"){
            const inputElem = document.getElementById("input_img") as HTMLImageElement
            const ratio = inputSize / inputElem.naturalWidth
            inputElem.width = inputElem.naturalWidth * ratio
            inputElem.height = inputElem.naturalHeight * ratio
            outputElem.width = inputElem.width * scaleFactor
            outputElem.height = inputElem.height * scaleFactor
            
        }else{
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
    useEffect(()=>{
        console.log("[Pipeline] Start")
        let renderRequestId: number
        const LOOP_ID = performance.now()

        const src = document.getElementById("input_img") as HTMLImageElement || document.getElementById("input_video") as HTMLVideoElement
        const dst = document.getElementById("output") as HTMLCanvasElement
        const tmp = document.getElementById("tmp") as HTMLCanvasElement
        const tmpCtx = tmp.getContext("2d")!
        const outCtx = dst.getContext("2d")!

        const interpolationType = interpolationTypes[interpolationTypeKey]
        const scaleFactor = scaleFactors[modelKey]
        setLayout()

        const render = () => {
            console.log("RENDER::::", LOOP_ID)
            let currentTFLite
            if(useSIMD){
                currentTFLite = tfliteSIMD
            }else{
                currentTFLite = tflite
            }
            if(currentTFLite && modelKey){
                tmp.width = src.width
                tmp.height = src.height
                tmpCtx.drawImage(src, 0, 0, tmp.width, tmp.height)

                if(interpolationType === 200){
                    const start = performance.now();                
                    outCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
                    const end   = performance.now();
                    const duration = end - start
                    const info = document.getElementById("info") as HTMLCanvasElement
                    info.innerText = `processing time: ${duration}` 

                }else{
                    /// Input data
                    const imageData = tmpCtx.getImageData(0, 0, tmp.width, tmp.height)
                    const inputImageBufferOffset = currentTFLite._getInputImageBufferOffset()
                    currentTFLite.HEAPU8.set(imageData.data, inputImageBufferOffset)
                    // console.log(imageData.data)
    
                    /// inferecence
                    const start = performance.now();                
                    currentTFLite._exec(tmp.width, tmp.height, interpolationType)
                    const end   = performance.now();
                    const duration = end - start
                    /////infoDiv.innerText = `MS: ${duration}`
        
                    /// Output data
                    const outputImageBufferOffset = currentTFLite._getOutputImageBufferOffset() 
                    // const outputImageBufferOffset = tflite._getGrayedImageBufferOffset() 
                    const resizedWidth = tmp.width * scaleFactor
                    const resizedHeight = tmp.height * scaleFactor
                    const resizedImage = new ImageData(new Uint8ClampedArray(currentTFLite.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4)), resizedWidth, resizedHeight)
                    // console.log(segmentationMask.data)
                    tmp.width = resizedImage.width
                    tmp.height = resizedImage.height
                    tmpCtx.putImageData(resizedImage, 0, 0)
                    outCtx.clearRect(0, 0, dst.width, dst.height)
                    outCtx.drawImage(tmp, 0, 0, dst.width, dst.height)
    
                    const info = document.getElementById("info") as HTMLCanvasElement
                    info.innerText = `processing time: ${duration}` 
                }
            }else{
                // console.log("not ready", tflite, src, dst)
            }
            renderRequestId = requestAnimationFrame(render)
        }
        render()
        return ()=>{
            cancelAnimationFrame(renderRequestId)
        }
    }, [tflite, tfliteSIMD, inputMedia, useSIMD, interpolationTypeKey, inputSize]) // eslint-disable-line



    ///////////////
    // Render    //
    ///////////////
    return (
        <div>
            <div style={{display:"flex"}}>
                <div>
                    <VideoInputSelect  title="input"       current={""}             onchange={inputChange}     options={videoInputList}/>
                    <DropDown          title="model"       current={modelKey}       onchange={setModelKey}     options={models} />
                    <DropDown          title="type"        current={interpolationTypeKey}       onchange={setInterpolationTypeKey}     options={interpolationTypes} />
                    
                    <SingleValueSlider title="inputSize(w)"    current={inputSize}     onchange={setInputSize} min={64} max={256} step={16} />
                    <Toggle            title="SIMD"        current={useSIMD}        onchange={setUseSIMD} />
                    <div >
                        <a href="https://github.com/w-okada/image-analyze-workers">github repository</a>
                    </div>
                </div>
                <div style={{display:"flex", alignItems: "flex-start"}}>
                    {inputMedia.mediaType === "IMAGE" ? 
                        <img  className={classes.inputView} id="input_img" alt=""></img>
                        :
                        <video  className={classes.inputView} id="input_video"></video>
                    }
                    <canvas className={classes.inputView} id="output"></canvas>
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
