
FROM tensorflow/tensorflow:devel

RUN apt-get update -y && apt-get install -y cmake emacs mlocate

### EMSCRIPTEN
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 3.1.3 --depth 1 emsdk
WORKDIR /emsdk
RUN ./emsdk install latest
RUN ./emsdk activate latest

### MediaPipe
WORKDIR /
RUN git clone https://github.com/google/mediapipe.git -b v0.8.9 --depth 1

### Tensorflow
WORKDIR /
RUN git -C /tensorflow_src pull
#RUN git -C /tensorflow_src checkout 9d461da4cb0af2f737bbfc68cca3f6445f1ceb60  # May 15, 2021 latest

RUN sed -i 's/"crosstool_top": "\/\/external:android\/emscripten"/"crosstool_top": "\/\/emscripten_toolchain\/everything"/' /tensorflow_src/tensorflow/BUILD


###
WORKDIR /
