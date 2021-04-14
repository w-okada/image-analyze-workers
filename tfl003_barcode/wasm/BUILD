# Description:
#   TensorFlow Lite minimal inference tool.

load("@org_tensorflow//tensorflow/lite:build_def.bzl", "tflite_linkopts")

cc_binary(
  name = "tflite",
  srcs = ["tflite.cc"],
  linkopts = tflite_linkopts() + [
    "-s ALLOW_MEMORY_GROWTH=1",
    "-s USE_PTHREADS=0",
    "-s MODULARIZE=1",
    "-s EXPORT_NAME=createTFLiteModule",
    "-s INITIAL_MEMORY=536870912",
    "-s ASSERTIONS=1",
    "-s DISABLE_EXCEPTION_CATCHING=0",
    "-O3",
  ],
  deps = [
    "@org_tensorflow//tensorflow/lite:framework",
    "@org_tensorflow//tensorflow/lite:tflite_with_xnnpack",
    "@org_tensorflow//tensorflow/lite/kernels:builtin_ops",
    "@opencv//:opencv",

    "@org_tensorflow//tensorflow/lite:string_util",
    "@org_tensorflow//tensorflow/lite/c:common",
#    "@org_tensorflow/tensorflow/lite/delegates/nnapi:nnapi_delegate",
#    "@org_tensorflow//tensorflow/lite/delegates/xnnpack:xnnpack_delegate",
    "@org_tensorflow//tensorflow/lite/profiling:profiler",
    "@org_tensorflow//tensorflow/lite/tools:command_line_flags",
    "@org_tensorflow//tensorflow/lite/tools:tool_params",
    "@org_tensorflow//tensorflow/lite/tools/delegates:delegate_provider_hdr",
    "@org_tensorflow//tensorflow/lite/tools/delegates:tflite_execution_providers",
    "@org_tensorflow//tensorflow/lite/tools/evaluation:utils",

    
  ],
)

cc_binary(
  name = "tflite-simd",
  srcs = ["tflite.cc"],
  linkopts = tflite_linkopts() + [
    "-s ALLOW_MEMORY_GROWTH=1",
    "-s USE_PTHREADS=0",
    "-s MODULARIZE=1",
    "-s EXPORT_NAME=createTFLiteSIMDModule",
    "-s INITIAL_MEMORY=536870912",
    "-O3",
  ],
  deps = [
    "@org_tensorflow//tensorflow/lite:framework",
    "@org_tensorflow//tensorflow/lite:tflite_with_xnnpack",
    "@org_tensorflow//tensorflow/lite/kernels:builtin_ops",
    "@opencv//:opencv",
  ],
)