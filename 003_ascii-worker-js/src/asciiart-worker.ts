import { WorkerResponse, WorkerCommand, AsciiConfig, AsciiFunctionType, AsciiOperatipnParams } from "./const"
import { getBrowserType, BrowserType } from "./BrowserUtil";

export { AsciiConfig, AsciiOperatipnParams, AsciiFunctionType } from './const'
export { BrowserType, getBrowserType} from './BrowserUtil';
export { IMAGE_PATH } from "./DemoUtil"

export const generateAsciiArtDefaultConfig = ():AsciiConfig => {
    const defaultConf:AsciiConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false
    }
    return defaultConf
}

export const generateDefaultAsciiArtParams = () =>{
    const defaultParams: AsciiOperatipnParams = {
        type: AsciiFunctionType.AsciiArt,
        processWidth        : 300,
        processHeight       : 300,
        asciiStr            : " .,:;i1tfLCG08@",
        fontSize            : 6
    }
    return defaultParams
}

class LocalAA{
    // _asciiStr = " .,:;i1tfLCG08@"
    // _asciiCharacters = (this._asciiStr).split("");
    // _fontSize = 6
    contrastFactor = (259 * (128 + 255)) / (255 * (259 - 128));

    brightnessCanvas = document.createElement("canvas")
    drawingCanvas = document.createElement("canvas")

    convert = async (inCanvas: HTMLCanvasElement, outCanvas:HTMLCanvasElement, params:AsciiOperatipnParams) => {
        // ImageData作成
        const asciiStr = params.asciiStr
        const fontSize = params.fontSize
        const asciiCharacters = (asciiStr).split("");

        const ctx = inCanvas.getContext("2d")!
        ctx.font = fontSize + "px monospace"
        ctx.textBaseline = "top"
        const m = ctx.measureText(asciiStr)
        const charWidth = Math.floor(m.width / asciiCharacters.length)
        const tmpWidth  = Math.ceil(inCanvas.width  / charWidth)
        const tmpHeight = Math.ceil(inCanvas.height / fontSize)

        // Generate Image for Brightness
        this.brightnessCanvas.width=tmpWidth
        this.brightnessCanvas.height=tmpHeight
        const brCtx = this.brightnessCanvas.getContext("2d")!
        brCtx.drawImage(inCanvas, 0, 0, tmpWidth, tmpHeight)
        const brImageData = brCtx.getImageData(0, 0, tmpWidth, tmpHeight)

        // generate chars agaist the each dot
        const lines = []
        let maxWidth = 0
        for(let y = 0; y < tmpHeight; y++){
            let line =""
            for(let x = 0; x < tmpWidth; x++){
                const offset = (y * tmpWidth + x) * 4
                const r = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 0] - 128 ) * this.contrastFactor) + 128), 255))
                const g = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 1] - 128 ) * this.contrastFactor) + 128), 255))
                const b = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 2] - 128 ) * this.contrastFactor) + 128), 255))

                var brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                var character = asciiCharacters[
                    (asciiCharacters.length - 1) - Math.round(brightness * (asciiCharacters.length - 1))
                ]
                line += character
            }
            lines.push(line)
        }

        this.drawingCanvas.width = ctx.measureText(lines[0]).width
        this.drawingCanvas.height = tmpHeight * fontSize
        const drCtx = this.drawingCanvas.getContext("2d")!
        drCtx.fillStyle = "rgb(255, 255, 255)";
        drCtx.fillRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height)
        drCtx.fillStyle = "rgb(0, 0, 0)";
        drCtx.font = fontSize + "px monospace"
        for(let n=0; n<lines.length; n++){
            drCtx.fillText(lines[n], 0, n * fontSize)
        }


        // draw output
        outCanvas.width  = inCanvas.width
        outCanvas.height = inCanvas.height
        const outCtx = outCanvas.getContext("2d")!
        outCtx.drawImage(this.drawingCanvas, 0, 0, outCanvas.width, outCanvas.height)

        return outCanvas
    }
}


export class AsciiArtWorkerManager{
    private workerAA:Worker|null = null
    private outCanvas:HTMLCanvasElement = document.createElement("canvas")

    private localAA = new LocalAA()
    private config:AsciiConfig = generateAsciiArtDefaultConfig()

    init = (config: AsciiConfig|null) => {
        if(config != null){
            this.config = config
        }

        if(this.workerAA){
            this.workerAA.terminate()
        }

        // safariはwebworkerでCanvasが使えないのでworkerは使わない。
        if (this.config.browserType === BrowserType.SAFARI || this.config.processOnLocal === true) {
            return new Promise((onResolve, onFail) => {
                onResolve()
                return
            })
        }

        // AsciiArt 用ワーカー
        this.workerAA = new Worker('./workerAA.ts', { type: 'module' })
        this.workerAA!.postMessage({message: WorkerCommand.INITIALIZE})
        const p = new Promise((onResolve, onFail)=>{
            this.workerAA!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                }else{
                    console.log("Bodypix Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }

    predict(targetCanvas:HTMLCanvasElement, params:AsciiOperatipnParams){
        if(this.config.browserType === BrowserType.SAFARI || this.config.processOnLocal === true){
            // Safariはローカルで処理
            const p = new Promise(async (onResolve: (v:HTMLCanvasElement) => void, onFail) => {
                this.outCanvas = await this.localAA.convert(targetCanvas, this.outCanvas, params)
                onResolve(this.outCanvas)
            })
            return p
        }else{
            const offscreen = new OffscreenCanvas(targetCanvas.width, targetCanvas.height)
            const offctx    = offscreen.getContext("2d")!
            offctx.drawImage(targetCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
            const imageBitmap = offscreen.transferToImageBitmap()
    
            const uid = performance.now()
            this.workerAA!.postMessage({message: WorkerCommand.PREDICT, uid:uid, params:params, image: imageBitmap}, [imageBitmap])
            const p = new Promise((onResolve:(v:HTMLCanvasElement)=>void, onFail)=>{
                this.workerAA!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const image = event.data.image as ImageBitmap
                        this.outCanvas.width=image.width
                        this.outCanvas.height=image.height
                        this.outCanvas.getContext("2d")!.drawImage(image, 0, 0, image.width, image.height)
                        image.close()
                        onResolve(this.outCanvas)
                    }else{
                        console.log("AsciiArt something wrong..")
                        onFail(event)
                    }
                }
            })
            return p
        }
    }
}
