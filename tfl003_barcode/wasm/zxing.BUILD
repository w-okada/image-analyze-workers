cc_library(
    name = "zxing",
    srcs = glob(
        [
            "build-wasm/*.a",
        ],
    ),
    hdrs = glob(["core/src/**/*.h*"]),
    includes = ["core/src"],
    linkstatic = 1,
    visibility = ["//visibility:public"],
)

