#include <iostream>
#include <memory>
#include "hand-core.hpp"
#include <emscripten.h>

namespace
{
}

auto count = 0;
HandCore *hand = new HandCore();

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int initModelBuffer(int size)
    {
        hand->initModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getModelBufferAddress()
    {
        return hand->modelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadModel(int size)
    {
        hand->loadModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initLandmarkModelBuffer(int size)
    {
        hand->initLandmarkModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getLandmarkModelBufferAddress()
    {
        return hand->landmarkModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadLandmarkModel(int size)
    {
        hand->loadLandmarkModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initInputBuffer(int width, int height, int channel)
    {
        hand->initInputBuffer(width, height, channel);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getInputBufferAddress()
    {
        return hand->inputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    float *getOutputBufferAddress()
    {
        return hand->outputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getTemporaryBufferAddress()
    {
        return hand->temporaryBuffer;
    }

    // EMSCRIPTEN_KEEPALIVE
    // int copySrc2Dst(int width, int height, int channel)
    // {
    //     m->copySrc2Dst(width, height, channel);
    //     return 0;
    // }

    EMSCRIPTEN_KEEPALIVE
    int exec(int width, int height, int max_palm_num, int resizedFactor)
    {
        hand->exec(width, height, max_palm_num, resizedFactor);
        return 0;
    }
}