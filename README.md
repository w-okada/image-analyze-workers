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
- [Experiments](#experiments)
  - [Multi-version based tfjs model](#multi-version-based-tfjs-model)
  - [Performance improvement](#performance-improvement)
- [Reference](#reference)



## bodypix
![image](https://user-images.githubusercontent.com/48346627/95987700-be773780-0e62-11eb-9645-40b7c0adb826.png)


- installation and usage 
[See here](/001_bodypix-worker-js)

- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t01_bodypix/index.html


## facemesh
![image](https://user-images.githubusercontent.com/48346627/95987793-dfd82380-0e62-11eb-9fe5-d0fab9eb2598.png)

- installation and usage 
[See here](/002_facemesh-worker-js)

- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t02_facemesh/index.html

## asciiart
![image](https://user-images.githubusercontent.com/48346627/95987874-fc745b80-0e62-11eb-95ac-43b3d998d50f.png)


- installation and usage 
[See here](/003_ascii-worker-js)

- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t03_asciiart/index.html

## opencv
![image](https://user-images.githubusercontent.com/48346627/95988031-40676080-0e63-11eb-81a6-0262a24f685e.png)

- installation and usage 
[See here](/004_opencv-worker-js)


- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t04_opencv/index.html


## PoseNet
![image](https://user-images.githubusercontent.com/48346627/95988122-6260e300-0e63-11eb-9b1e-8712b47410dd.png)


- installation and usage 
[See here](/005_posenet-worker-js)


- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t05_posenet/index.html


## HandPose
![image](https://user-images.githubusercontent.com/48346627/95988209-88868300-0e63-11eb-809a-35a52b7f77fe.png)


- installation and usage 
[See here](/006_handpose-worker-js)


- demo
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t06_handpose/index.html


# Experiments
## Multi-version based tfjs model
With webworker, we can use models which based on the differenct tfjs models.

- demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/exp01_multi-worker-performance/index.html

- [src](/exp01_multi-worker-performance)

## Performance improvement
With webworker, we can improve performance when we use multiple models.

- demo

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/exp02_multi-worker-performance_sub/index.html

- [src](/exp02_multi-tfjs-worker-performance)


# Reference
This repository was inspired by this site.

https://github.com/terryky/tfjs_webgl_app


Demo images are from pakutaso

http://www.pakutaso.com





