import { SemanticPersonSegmentation  } from '@dannadori/bodypix-worker-js'

interface VirtualBackgroundConfig{
    frontPositionX:number, // ratio (position and size of front image)
    frontPositionY:number, // ratio (position and size of front image)
    frontWidth: number,    // ratio (position and size of front image)
    frontHeight: number,   // ratio (position and size of front image)
 
    width:number,          // pixel (output size. If =<0, fit the background canvas size )
    height:number,         // pixel (output size. If =<0, fit the background canvas size )
}

export class VirtualBackground{
    private canvasOut = document.createElement("canvas")   // for final image
    private canvasFront = document.createElement("canvas") // for bodypix result size image
    private canvasFrontResized = document.createElement("canvas")
    private defaultConfig:VirtualBackgroundConfig={
        frontPositionX:0, // ratio (position and size of front image)
        frontPositionY:0, // ratio (position and size of front image)
        frontWidth:1,     // ratio (position and size of front image)
        frontHeight:1,    // ratio (position and size of front image)
        width:-1,         // pixel (output size. If =<0, fit the background canvas size )
        height:-1,        // pixel (output size. If =<0, fit the background canvas size )
    }

    convert = (foreground:HTMLCanvasElement, background:HTMLCanvasElement, 
        bodypixResult:SemanticPersonSegmentation, conf:VirtualBackgroundConfig=Object.assign({},this.defaultConfig))=>{

        // (1) resize output canvas and draw background
        if(conf.width <=0 || conf.height<=0){
            conf.width = foreground.width > background.width ? foreground.width : background.width
            conf.height = foreground.height > background.height ? foreground.height : background.height
        }

        this.canvasOut.width  = conf.width
        this.canvasOut.height = conf.height
        this.canvasOut.getContext("2d")!.drawImage(background, 0, 0, conf.width, conf.height)
        if(bodypixResult == null){ // Depends on timing, bodypixResult is null
            return this.canvasOut
        }

        // (2) generate foreground transparent
        this.canvasFront.width  = bodypixResult.width
        this.canvasFront.height = bodypixResult.height
        const frontCtx=this.canvasFront.getContext("2d")!
        frontCtx.drawImage(foreground, 0, 0, bodypixResult.width, bodypixResult.height)
        const pixelData = new Uint8ClampedArray(bodypixResult.width * bodypixResult.height * 4)

        for (let rowIndex = 0; rowIndex < bodypixResult.height; rowIndex++){
            for(let colIndex = 0; colIndex < bodypixResult.width; colIndex++){
                const seg_offset = ((rowIndex * bodypixResult.width) + colIndex)
                const pix_offset = ((rowIndex * bodypixResult.width) + colIndex) * 4
                // if(segmentation.data[seg_offset] === 110 ){
                if(bodypixResult.data[seg_offset] === 0 ){
                    pixelData[pix_offset]     = 0
                    pixelData[pix_offset + 1] = 0
                    pixelData[pix_offset + 2] = 0
                    pixelData[pix_offset + 3] = 0
                }else{
                    // pixelData[pix_offset]     = fgImageData.data[pix_offset]
                    // pixelData[pix_offset + 1] = fgImageData.data[pix_offset + 1]
                    // pixelData[pix_offset + 2] = fgImageData.data[pix_offset + 2]
                    // pixelData[pix_offset + 3] = fgImageData.data[pix_offset + 3]
                    pixelData[pix_offset]     = 255
                    pixelData[pix_offset + 1] = 255
                    pixelData[pix_offset + 2] = 255
                    pixelData[pix_offset + 3] = 255
                }
            }
        }
        const fgImageDataTransparent = new ImageData(pixelData, bodypixResult.width, bodypixResult.height);
        frontCtx.putImageData(fgImageDataTransparent, 0, 0)

        this.canvasFrontResized.width = foreground.width
        this.canvasFrontResized.height = foreground.height
        this.canvasFrontResized.getContext("2d")!.drawImage(this.canvasFront, 0, 0, this.canvasFrontResized.width, this.canvasFrontResized.height)
        this.canvasFrontResized.getContext("2d")!.globalCompositeOperation = 'source-in';
        this.canvasFrontResized.getContext("2d")!.drawImage(foreground, 0, 0, this.canvasFrontResized.width, this.canvasFrontResized.height)



        // (3) merge Front into Bacground
        const frontPositionX = conf.width  * conf.frontPositionX
        const frontPositionY = conf.height * conf.frontPositionY
        const frontWidth     = conf.width  * conf.frontWidth
        const frontHeight    = conf.height * conf.frontHeight
        this.canvasOut.getContext("2d")!.drawImage(this.canvasFrontResized, frontPositionX, frontPositionY, 
            frontWidth, frontHeight)

        // (4) return
        return this.canvasOut
    }


}