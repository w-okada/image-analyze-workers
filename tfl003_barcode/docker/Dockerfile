
FROM tensorflow/tensorflow:devel

RUN apt-get update -y && apt-get install -y cmake emacs mlocate

### EMSCRIPTEN
RUN git clone https://github.com/emscripten-core/emsdk.git -b 2.0.14 --depth 1
WORKDIR /emsdk
RUN ./emsdk install latest
RUN ./emsdk activate latest


### openCV
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b 4.5.1 --depth 1
RUN git -C /opencv checkout -b 4.5.1
WORKDIR /opencv
RUN python3  platforms/js/build_js.py build_wasm --emscripten_dir=/emsdk/upstream/emscripten --config_only
ENV OPENCV_JS_WHITELIST /opencv/platforms/js/opencv_js.config.py
RUN cd build_wasm && /emsdk/upstream/emscripten/emmake make -j && /emsdk/upstream/emscripten/emmake make install

### Tensorflow
WORKDIR /
RUN git -C /tensorflow_src checkout refs/tags/v2.4.1 -b v2.4.1
RUN sed -i 's/"crosstool_top": "\/\/external:android\/emscripten"/"crosstool_top": "\/\/emscripten_toolchain\/everything"/' /tensorflow_src/tensorflow/BUILD
RUN sed -i '/":tvos_arm64": COMMON_SRCS + MACH_SRCS + MACH_ARM_SRCS,/a ":emscripten_wasm": COMMON_SRCS + EMSCRIPTEN_SRCS,' /tensorflow_src/third_party/cpuinfo/BUILD.bazel
COPY workspace.bzl.patch /tensorflow_src/tensorflow/
WORKDIR /tensorflow_src/tensorflow
RUN patch -u < workspace.bzl.patch

###
WORKDIR /
