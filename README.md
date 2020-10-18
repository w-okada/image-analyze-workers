This repository is the zoo of image processing webworkers for javascript. 
You can use these workers as npm package.

Note. some module is not provided as webworker for safari because of it's restriction.

<a href="https://www.buymeacoffee.com/wokad" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

# Webworkers

- [Webworkers](#webworkers)
  - [bodypix](#bodypix)
  - [facemesh](#facemesh)
  - [asciiart](#asciiart)
  - [opencv](#opencv)
  - [PoseNet](#posenet)
  - [HandPose](#handpose)
- [Reference](#reference)



## bodypix
![image](https://user-images.githubusercontent.com/48346627/95987700-be773780-0e62-11eb-9645-40b7c0adb826.png)


- installation and usage 
[See here](/001_bodypix-worker-js)

- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t01_bodypix/index.html


## facemesh
![image](https://user-images.githubusercontent.com/48346627/95987793-dfd82380-0e62-11eb-9fe5-d0fab9eb2598.png)


- install
```
$ npm install \@dannadori/facemesh-worker-js
$ cp node_modules/\@dannadori/facemesh-worker-js/dist/0.facemesh-worker.worker.js public/
```

- basic usage

```
// Generate Config
config:FacemeshConfig = generateFacemeshDefaultConfig()

// Initialize with config
facemesh:FacemeshWorkerManager = new FacemeshWorkerManager()
facemesh.init(config).then(()=>{
  console.log("initialized.")
})

// Predict
facemesh.predict(canvas).then(prediction=>{
  console.log(prediction)
}

```

for more detail, you can see the demo source.

- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t02_facemesh/index.html

## asciiart
![image](https://user-images.githubusercontent.com/48346627/95987874-fc745b80-0e62-11eb-95ac-43b3d998d50f.png)

- install
```
$ npm install \@dannadori/asciiart-worker-js
$ cp node_modules/\@dannadori/asciiart-worker-js/dist/0.asciiart-worker.worker.js public/
```

- basic usage

```
// Generate Config
config:AsciiConfig = generateAsciiDefaultConfig()

// Initialize with config
aa: AsciiArtWorkerManager = new AsciiArtWorkerManager()
aa.init(this.config).then(() => {
  console.log("initialized.")
})

// Predict
this.aa.predict(this.canvas).then(converted => {
}
```

for more detail, you can see the demo source.
- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t03_asciiart/index.html

## opencv
![image](https://user-images.githubusercontent.com/48346627/95988031-40676080-0e63-11eb-81a6-0262a24f685e.png)

- install
```
$ npm install \@dannadori/opencv-worker-js
$ cp node_modules/\@dannadori/opencv-worker-js/dist/0.opencv-worker.worker.js public/;
```
- basic usage

```
// Generate Config
config:OpenCVConfig = generateOpenCVDefaultConfig()

// Initialize with config
opencv:OpenCVWorkerManager = new OpenCVWorkerManager()
opencv.init(this.config).then(()=>{
  console.log("initialized.")
})

// Predict
this.opencv.predict(this.canvas, params).then(converted=>{
}
```

for more detail, you can see the demo source.


- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t04_opencv/index.html


## PoseNet
![image](https://user-images.githubusercontent.com/48346627/95988122-6260e300-0e63-11eb-9b1e-8712b47410dd.png)

- install
```
$ npm install \@dannadori/posenet-worker-js
$ cp node_modules/\@dannadori/posenet-worker-js/dist/0.posenet-worker.worker.js public/;
```
- basic usage

```
// Generate Config
config = generatePoseNetDefaultConfig()()
params = generateDefaultPoseNetParams()
// Initialize with config
manager: PoseNetWorkerManager = new PoseNetWorkerManager()
manager.init(this.config).then(()=>{
  console.log("initialized.")
})

// Predict
manager.predict(this.canvas, params).then(converted=>{
}
```

for more detail, you can see the demo source.


- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t05_posenet/index.html


## HandPose
![image](https://user-images.githubusercontent.com/48346627/95988209-88868300-0e63-11eb-809a-35a52b7f77fe.png)

- install
```
$ npm install \@dannadori/handpose-worker-js
$ cp node_modules/\@dannadori/handpose-worker-js/dist/0.handpose-worker.worker.js public/;
```
- basic usage

```
// Generate Config
config = generateHandPoseDefaultConfig()()
params = generateDefaultHandPoseParams()
// Initialize with config
manager: HandPoseWorkerManager = new HandPoseWorkerManager()
manager.init(this.config).then(()=>{
  console.log("initialized.")
})

// Predict
manager.predict(this.canvas, params).then(converted=>{
}
```

for more detail, you can see the demo source.

- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t06_handpose/index.html



# Reference
This repository was inspired by this site.

https://github.com/terryky/tfjs_webgl_app






