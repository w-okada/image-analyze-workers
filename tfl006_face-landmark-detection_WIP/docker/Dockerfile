FROM mcr.microsoft.com/vscode/devcontainers/cpp:0-ubuntu-21.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y && apt-get install -y cmake emacs mlocate

# For Bazel
RUN curl -fsSL https://bazel.build/bazel-release.pub.gpg | gpg --dearmor > /etc/apt/trusted.gpg.d/bazel.gpg
RUN echo "deb [arch=amd64] https://storage.googleapis.com/bazel-apt stable jdk1.8" > /etc/apt/sources.list.d/bazel.list

# For Node
RUN curl -fsSL https://deb.nodesource.com/setup_17.x | bash -

# install
ARG BAZEL_VERSION=4.2.1
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
  bazel-${BAZEL_VERSION} \
  nodejs \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/bazel-${BAZEL_VERSION} /usr/bin/bazel

# Bazel formatter
RUN wget -q -O /usr/local/bin/buildifier https://github.com/bazelbuild/buildtools/releases/download/5.0.1/buildifier-linux-amd64 && \
  chmod +x /usr/local/bin/buildifier

# EMSCRIPTEN
ARG EMSCRIPTEN_VERSION=3.1.0
WORKDIR /
RUN git clone https://github.com/emscripten-core/emsdk.git -b 3.1.3 --depth 1 emsdk
WORKDIR /emsdk
RUN ./emsdk install ${EMSCRIPTEN_VERSION} && ./emsdk activate ${EMSCRIPTEN_VERSION}

### Tensorflow
ARG TENSORFLOW_VERSION=v2.8.0
WORKDIR /
RUN git clone https://github.com/tensorflow/tensorflow.git tensorflow_src -b ${TENSORFLOW_VERSION}
RUN sed -i 's/"crosstool_top": "\/\/external:android\/emscripten"/"crosstool_top": "\/\/emscripten_toolchain\/everything"/' /tensorflow_src/tensorflow/BUILD

### MediaPipe
ARG MEDIAPIPE_VERSION=v0.8.9
WORKDIR /
RUN git clone https://github.com/google/mediapipe.git -b ${MEDIAPIPE_VERSION} --depth 1


### openCV
ARG OPENCV_VERSION=4.5.5
WORKDIR /
RUN git clone https://github.com/opencv/opencv.git -b ${OPENCV_VERSION} --depth 1
RUN git -C /opencv checkout -b ${OPENCV_VERSION}
RUN git clone https://github.com/opencv/opencv_contrib.git -b ${OPENCV_VERSION} --depth 1
RUN git -C /opencv_contrib checkout ${OPENCV_VERSION}


ENV OPENCV_CMAKE_FLAGS="\
  -DOPENCV_EXTRA_MODULES_PATH=/opencv_contrib/modules \
  -DBUILD_LIST=core,imgproc,calib3d,video,ximgproc \
  -DBUILD_opencv_imgcodecs=ON \
  -DBUILD_opencv_js=OFF \
  -DBUILD_TESTS=OFF \
  -DBUILD_PERF_TESTS=OFF \
  -DBUILD_EXAMPLES=OFF \
  -DBUILD_opencv_apps=OFF \
  -DWITH_PNG=ON \
  -DWITH_JPEG=OFF \
  -DWITH_TIFF=OFF \
  -DWITH_WEBP=ON \
  -DWITH_OPENJPEG=OFF \
  -DWITH_JASPER=OFF \
  -DWITH_OPENEXR=OFF \
  -DCMAKE_BUILD_TYPE=Release \
  "

ENV OPENCV_CONFIG_FLAG_EMSCRIPTEN="\
  --config_only \
  --emscripten_dir=/emsdk/upstream/emscripten \
  "

WORKDIR /opencv
RUN python3  platforms/js/build_js.py build_wasm                               $OPENCV_CONFIG_FLAG_EMSCRIPTEN $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})
RUN python3  platforms/js/build_js.py build_wasm_simd --simd                   $OPENCV_CONFIG_FLAG_EMSCRIPTEN $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})
RUN python3  platforms/js/build_js.py build_wasm_threads --threads             $OPENCV_CONFIG_FLAG_EMSCRIPTEN $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})
RUN python3  platforms/js/build_js.py build_wasm_simd_threads --simd --threads $OPENCV_CONFIG_FLAG_EMSCRIPTEN $(sh -c 'for x in "$@"; do echo "--cmake_option=$x"; done' "" ${OPENCV_CMAKE_FLAGS})

RUN cmake --build /opencv/build_wasm              --parallel $(nproc)
RUN cmake --build /opencv/build_wasm_simd         --parallel $(nproc)
RUN cmake --build /opencv/build_wasm_threads      --parallel $(nproc)
RUN cmake --build /opencv/build_wasm_simd_threads --parallel $(nproc)

RUN cmake --install /opencv/build_wasm              --prefix /build_wasm
RUN cmake --install /opencv/build_wasm_simd         --prefix /build_wasm_simd
RUN cmake --install /opencv/build_wasm_threads      --prefix /build_wasm_threads
RUN cmake --install /opencv/build_wasm_simd_threads --prefix /build_wasm_simd_threads


RUN apt-get update \
  && apt-get -y install --no-install-recommends \
  ca-certificates \
  python \
  python3-dev \
  python3-numpy \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
  