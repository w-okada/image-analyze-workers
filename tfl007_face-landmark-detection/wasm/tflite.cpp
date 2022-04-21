#include <iostream>
#include <memory>
#include "tflite.hpp"
#include <emscripten.h>

namespace
{
}

using std::chrono::high_resolution_clock;

auto start_time = high_resolution_clock::now();
auto count = 0;
MemoryUtil *m = new MemoryUtil();

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int initDetectorModelBuffer(int size)
    {
        m->initDetectorModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getDetectorModelBufferAddress()
    {
        return m->detectorModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadDetectorModel(int size)
    {
        m->loadDetectorModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initLandmarkModelBuffer(int size)
    {
        m->initLandmarkModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getLandmarkModelBufferAddress()
    {
        return m->landmarkModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadLandmarkModel(int size)
    {
        m->loadLandmarkModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initInputBuffer(int width, int height, int channel)
    {
        m->initInputBuffer(width, height, channel);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getInputBufferAddress()
    {
        return m->inputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    float *getOutputBufferAddress()
    {
        return m->outputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getTemporaryBufferAddress()
    {
        return m->temporaryBuffer;
    }

    // EMSCRIPTEN_KEEPALIVE
    // int copySrc2Dst(int width, int height, int channel)
    // {
    //     m->copySrc2Dst(width, height, channel);
    //     return 0;
    // }

    EMSCRIPTEN_KEEPALIVE
    int exec(int width, int height, int max_palm_num)
    {
        m->exec(width, height, max_palm_num);
        return 0;
    }
}