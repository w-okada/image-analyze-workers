
FROM tensorflow/tensorflow:devel

RUN apt-get update -y && apt-get install -y cmake emacs mlocate

## For Chrome, Firefox
### EMSCRIPTEN
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 2.0.14 --depth 1 emsdk2.0.14
WORKDIR /emsdk2.0.14
RUN ./emsdk install latest
RUN ./emsdk activate latest
### openCV
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b 4.5.1 --depth 1 opencv_for_emsdk2.0.14
WORKDIR /opencv_for_emsdk2.0.14
RUN python3  platforms/js/build_js.py build_wasm             --emscripten_dir=/emsdk2.0.14/upstream/emscripten --config_only
RUN python3  platforms/js/build_js.py build_wasm_simd --simd --emscripten_dir=/emsdk2.0.14/upstream/emscripten --config_only
ENV OPENCV_JS_WHITELIST /opencv_for_emsdk2.0.14/platforms/js/opencv_js.config.py
RUN cd build_wasm && /emsdk2.0.14/upstream/emscripten/emmake make -j$(nproc) && /emsdk2.0.14/upstream/emscripten/emmake make install
RUN cd build_wasm_simd && /emsdk2.0.14/upstream/emscripten/emmake make -j$(nproc) && /emsdk2.0.14/upstream/emscripten/emmake make install

## For Safari
### EMSCRIPTEN
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 1.40.1 --depth 1 emsdk1.40.1
WORKDIR /emsdk1.40.1
RUN ./emsdk install latest
RUN ./emsdk activate latest

### openCV
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b 4.5.1 --depth 1 opencv_for_emsdk1.40.1
WORKDIR /opencv_for_emsdk1.40.1
RUN python3  platforms/js/build_js.py build_wasm             --emscripten_dir=/emsdk1.40.1/upstream/emscripten --config_only
RUN python3  platforms/js/build_js.py build_wasm_simd --simd --emscripten_dir=/emsdk1.40.1/upstream/emscripten --config_only
ENV OPENCV_JS_WHITELIST /opencv_for_emsdk1.40.1/platforms/js/opencv_js.config.py
RUN cd build_wasm && /emsdk1.40.1/upstream/emscripten/emmake make -j$(nproc) && /emsdk1.40.1/upstream/emscripten/emmake make install
RUN sed -i -e "2660,2661d" /opencv_for_emsdk1.40.1/modules/core/include/opencv2/core/hal/intrin_wasm.hpp
RUN cd build_wasm_simd && /emsdk1.40.1/upstream/emscripten/emmake make -j$(nproc) && /emsdk1.40.1/upstream/emscripten/emmake make install

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
