
FROM tensorflow/tensorflow:devel

RUN apt-get update -y && apt-get install -y cmake emacs mlocate

### EMSCRIPTEN
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 2.0.14 --depth 1 emsdk
WORKDIR /emsdk
RUN ./emsdk install latest
RUN ./emsdk activate latest

### openCV
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b 4.5.3 --depth 1 opencv
RUN git clone https://github.com/opencv/opencv_contrib.git -b 4.5.3 --depth 1 opencv_contrib
WORKDIR /opencv
RUN sed -i '/^\W*"cmake",\W*$/a "-DOPENCV_EXTRA_MODULES_PATH=/opencv_contrib/modules",' platforms/js/build_js.py
RUN sed -i 's/"-DBUILD_opencv_imgcodecs=OFF"/"-DBUILD_opencv_imgcodecs=ON"/' platforms/js/build_js.py
RUN python3  platforms/js/build_js.py build_wasm             --emscripten_dir=/emsdk/upstream/emscripten --config_only
RUN python3  platforms/js/build_js.py build_wasm_simd --simd --emscripten_dir=/emsdk/upstream/emscripten --config_only
ENV OPENCV_JS_WHITELIST /opencv/platforms/js/opencv_js.config.py
RUN cd build_wasm && /emsdk/upstream/emscripten/emmake make -j$(nproc) && /emsdk/upstream/emscripten/emmake make install
RUN cd build_wasm_simd && /emsdk/upstream/emscripten/emmake make -j$(nproc) && /emsdk/upstream/emscripten/emmake make install

### MediaPipe
WORKDIR /
RUN git clone https://github.com/google/mediapipe.git -b v0.8.4 --depth 1

### Tensorflow
WORKDIR /
RUN git -C /tensorflow_src pull
RUN git -C /tensorflow_src checkout 9d461da4cb0af2f737bbfc68cca3f6445f1ceb60  # May 15, 2021 latest

RUN sed -i 's/"crosstool_top": "\/\/external:android\/emscripten"/"crosstool_top": "\/\/emscripten_toolchain\/everything"/' /tensorflow_src/tensorflow/BUILD


###
WORKDIR /
