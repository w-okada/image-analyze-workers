cc_library(
    name = "opencv",
    srcs = glob(
        [
            "build_wasm/install/lib/*.a",
            "build_wasm/install/lib/opencv4/3rdparty/*.a",
        ],
    ),
    hdrs = glob(["build_wasm/install/include/opencv4/opencv2/**/*.h*"]),
    includes = ["build_wasm/install/include/opencv4"],
    linkstatic = 1,
    visibility = ["//visibility:public"],
)
