import { AnnotatedPrediction, FacemeshWorkerManager, generateDefaultFacemeshParams, generateFacemeshDefaultConfig } from '@dannadori/facemesh-worker-js'
import { FacemeshRenderer } from './FaceswapRenderer'

export class FaceSwap {
    private facemeshConfig = generateFacemeshDefaultConfig()
    private facemeshParams = generateDefaultFacemeshParams()
    private facemeshManager: FacemeshWorkerManager = new FacemeshWorkerManager()

    // Mask Info
    private maskImage: HTMLCanvasElement = document.createElement("canvas")
    private maskPrediction: AnnotatedPrediction[]|null = null

    // WebGL
    private glCanvas = document.createElement("canvas")
    private glCanvasOut = document.createElement("canvas")
    private frd: FacemeshRenderer

    set face_countour_alpha(val: number) { this.frd.face_countour_alpha = val }
    get face_countour_alpha() { return this.frd.face_countour_alpha }
    set mask_color_brightness(val: number) { this.frd.mask_color_brightness = val }
    get mask_color_brightness() { return this.frd.mask_color_brightness }
    set mask_color_alpha(val: number) { this.frd.mask_color_alpha = val }
    get mask_color_alpha() { return this.frd.mask_color_alpha }


    // private _maskImage?:HTMLCanvasElement
    // private _maskPrediction?: AnnotatedPrediction[]

    // private glCanvas    = document.createElement("canvas")
    // private glCanvasOut = document.createElement("canvas")
    // private frd:FacemeshRenderer

    // set face_countour_alpha(val:number){this.frd.face_countour_alpha = val}
    // get face_countour_alpha(){return this.frd.face_countour_alpha}
    // set mask_color_brightness(val:number){this.frd.mask_color_brightness = val}
    // get mask_color_brightness(){return this.frd.mask_color_brightness}
    // set mask_color_alpha (val:number){this.frd.mask_color_alpha = val}
    // get mask_color_alpha (){return this.frd.mask_color_alpha}


    constructor(width: number, height: number, testCanvas: HTMLCanvasElement | null = null) {
        if (testCanvas !== null) {
            this.glCanvas = testCanvas
        }
        this.glCanvas.width = width
        this.glCanvas.height = height
        this.glCanvasOut.width = width
        this.glCanvasOut.height = height
        this.frd = new FacemeshRenderer(
            this.glCanvas.getContext("webgl")!,
            this.glCanvas.width,
            this.glCanvas.height
        )
    }

    init = async () => {
        this.facemeshConfig.processOnLocal = false
        await this.facemeshManager.init(this.facemeshConfig)
    }

    setMaskImage = async (maskImage: HTMLCanvasElement, processWidth: number, processHeight: number) => {
        this.facemeshParams.processWidth = processWidth
        this.facemeshParams.processHeight = processHeight
        this.maskImage.width = processWidth
        this.maskImage.height = processHeight
        this.maskImage.getContext("2d")!.drawImage(maskImage, 0, 0, this.maskImage.width, this.maskImage.height)
        this.maskPrediction = await this.facemeshManager.predict(this.maskImage, this.facemeshParams)
        this.frd.setMask(this.glCanvas.getContext("webgl")!, this.maskImage, this.maskPrediction!)
    }




    swapFace = async (videoFrame: HTMLCanvasElement, processWidth: number, processHeight: number)=>{
        this.facemeshParams.processWidth = processWidth
        this.facemeshParams.processHeight = processHeight
        const scaleX = videoFrame.width / processWidth
        const scaleY = videoFrame.height / processHeight

        const prediction = await this.facemeshManager.predict(videoFrame, this.facemeshParams)
        if (this.maskImage) {
            const gl = this.glCanvas.getContext("webgl")!
            this.frd.drawFacemesh(gl, videoFrame, prediction!, scaleX, scaleY)
        }
        const ctx = this.glCanvasOut.getContext("2d")!
        ctx.fillStyle = "rgba(0,0,0,0.0)";
        ctx.clearRect(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
        ctx.fillRect(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
        ctx.drawImage(this.glCanvas, 0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
        return this.glCanvasOut
        // return ctx.getImageData(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
    }

}
