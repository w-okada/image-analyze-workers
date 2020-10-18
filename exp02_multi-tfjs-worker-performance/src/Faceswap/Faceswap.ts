import { AnnotatedPrediction } from '@dannadori/facemesh-worker-js'
import { FacemeshRenderer } from './FaceswapRenderer';

export class FaceSwap {
    private _maskImage?:HTMLCanvasElement
    private _maskPrediction?: AnnotatedPrediction[]
    
    private glCanvas    = document.createElement("canvas")
    private glCanvasOut = document.createElement("canvas")
    private frd:FacemeshRenderer
  
    set face_countour_alpha(val:number){this.frd.face_countour_alpha = val}
    get face_countour_alpha(){return this.frd.face_countour_alpha}
    set mask_color_brightness(val:number){this.frd.mask_color_brightness = val}
    get mask_color_brightness(){return this.frd.mask_color_brightness}
    set mask_color_alpha (val:number){this.frd.mask_color_alpha = val}
    get mask_color_alpha (){return this.frd.mask_color_alpha}
    

    constructor(width:number, height:number, testCanvas:HTMLCanvasElement|null=null){
      if(testCanvas!==null){
        this.glCanvas = testCanvas
      }
      this.glCanvas.width  = width
      this.glCanvas.height = height
      this.glCanvasOut.width= width
      this.glCanvasOut.height=height
      this.frd = new FacemeshRenderer(
        this.glCanvas.getContext("webgl")!, 
        this.glCanvas.width,
        this.glCanvas.height
      )
    }
  
    setMask(maskImage:HTMLCanvasElement, maskPrediction:AnnotatedPrediction[]){
      console.log("set mask")
      this._maskImage = maskImage
      this._maskPrediction = maskPrediction
      this.frd.setMask(this.glCanvas.getContext("webgl")!, this._maskImage, this._maskPrediction)
    }
  
  
    swapFace(videoFrame:HTMLCanvasElement, maskPrediction:AnnotatedPrediction[], scaleX:number,scaleY:number):HTMLCanvasElement{
      if(this._maskImage){
        const gl = this.glCanvas.getContext("webgl")!
        this.frd.drawFacemesh(gl, videoFrame, maskPrediction, scaleX, scaleY)
      }
      const ctx = this.glCanvasOut.getContext("2d")!
      ctx.fillStyle = "rgba(0,0,0,0.0)";
      ctx.clearRect(0,0,this.glCanvasOut.width,this.glCanvasOut.height)
      ctx.fillRect(0,0,this.glCanvasOut.width,this.glCanvasOut.height)
      ctx.drawImage(this.glCanvas,0,0, this.glCanvasOut.width,this.glCanvasOut.height)
      return this.glCanvasOut
      // return ctx.getImageData(0, 0, this.glCanvasOut.width, this.glCanvasOut.height)
    }
  
  
  }
  