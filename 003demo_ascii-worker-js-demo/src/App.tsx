import './App.css';
import { AsciiArtWorkerManager, AsciiConfig, generateAsciiArtDefaultConfig, generateDefaultAsciiArtParams } from '@dannadori/asciiart-worker-js'
import DemoBase, { ControllerUIProp } from './DemoBase';

class App extends DemoBase {
  manager: AsciiArtWorkerManager = new AsciiArtWorkerManager()
  canvas = document.createElement("canvas")

  config:AsciiConfig = generateAsciiArtDefaultConfig()
  params = generateDefaultAsciiArtParams()

  getCustomMenu = () => {
    const menu: ControllerUIProp[] = [
      {
        title: "processOnLocal",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "reload model",
        currentIndexOrValue: 0,
        callback: (val: string | number | MediaStream) => {
          const processOnLocal = this.controllerRef.current!.getCurrentValue("processOnLocal")
          this.config.processOnLocal     = (processOnLocal === "on" ? true  : false) as boolean
          this.requireReload()
        },
      },
      {
        title: "fontSize",
        currentIndexOrValue: 6,
        range: [2, 20, 1],
        callback: (val: string | number | MediaStream) => { 
          this.params.fontSize = val as number
        },
      },
    ]
    return menu
  }

  handleResult = (prediction: any) => {
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.drawImage(prediction, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }
}


export default App;
