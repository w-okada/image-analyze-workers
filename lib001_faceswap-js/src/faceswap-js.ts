import { AnnotatedPrediction, FacemeshWorkerManager, generateDefaultFacemeshParams, generateFacemeshDefaultConfig } from '@dannadori/facemesh-worker-js'
import { FacemeshRenderer } from './FaceswapRenderer'

export class FaceSwap {
    private facemeshConfig = generateFacemeshDefaultConfig()
    private facemeshParams = generateDefaultFacemeshParams()
    private facemeshManager_mask: FacemeshWorkerManager = new FacemeshWorkerManager()
    private facemeshManager_input: FacemeshWorkerManager = new FacemeshWorkerManager()
    // Input Image
    private inputImage: HTMLCanvasElement = document.createElement("canvas")
    private inputPrediction: AnnotatedPrediction[]|null = null

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

    init = async (onLocal=false) => {
        this.facemeshConfig.processOnLocal = onLocal
        await this.facemeshManager_mask.init(this.facemeshConfig)
        await this.facemeshManager_input.init(this.facemeshConfig)
    }

    setMaskImage = async (maskImage: HTMLCanvasElement, processWidth: number, processHeight: number) => {
        this.facemeshParams.processWidth = processWidth
        this.facemeshParams.processHeight = processHeight
        this.facemeshParams.predictIrises = true

        // To avoid scaling the output of facemesh, resize the image to processWidth/Height
        this.maskImage.width = processWidth
        this.maskImage.height = processHeight
        this.maskImage.getContext("2d")!.drawImage(maskImage, 0, 0, this.maskImage.width, this.maskImage.height)

        this.maskPrediction = await this.facemeshManager_mask.predict(this.maskImage, this.facemeshParams)
        // setMask to Renderer.
        this.frd.setMask(this.glCanvas.getContext("webgl")!, this.maskImage, this.maskPrediction!)
    }




    swapFace = async (videoFrame: HTMLCanvasElement, processWidth: number, processHeight: number)=>{
        this.facemeshParams.processWidth = processWidth
        this.facemeshParams.processHeight = processHeight
        this.facemeshParams.predictIrises = true

        // To avoid scaling the output of facemesh, resize the image to processWidth/Height
        this.inputImage.width = processWidth
        this.inputImage.height = processHeight
        this.inputImage.getContext("2d")!.drawImage(videoFrame, 0, 0, this.inputImage.width, this.inputImage.height)

        const scaleX = 1
        const scaleY = 1

        this.inputPrediction = await this.facemeshManager_input.predict(this.inputImage, this.facemeshParams)
        if (this.maskPrediction && this.inputPrediction) {
            const gl = this.glCanvas.getContext("webgl")!
            this.frd.drawFacemesh(gl, videoFrame, this.inputPrediction!, scaleX, scaleY)
        }

        // Draw to output Canvas
        const ctx = this.glCanvasOut.getContext("2d")!
        ctx.fillStyle = "rgba(0,0,0,0.0)";
        ctx.clearRect(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
        ctx.fillRect(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
        ctx.drawImage(this.glCanvas, 0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
        return this.glCanvasOut
    }

}
