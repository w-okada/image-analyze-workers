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
    int initPalmDetectorModelBuffer(int size)
    {
        hand->initPalmDetectorModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getPalmDetectorModelBufferAddress()
    {
        return hand->palmDetectorModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadPalmDetectorModel(int size)
    {
        hand->loadPalmDetectorModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initHandLandmarkModelBuffer(int size)
    {
        hand->initHandLandmarkModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getHandLandmarkModelBufferAddress()
    {
        return hand->handLandmarkModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadHandLandmarkModel(int size)
    {
        hand->loadHandLandmarkModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initHandInputBuffer(int width, int height, int channel)
    {
        hand->initHandInputBuffer(width, height, channel);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getHandInputBufferAddress()
    {
        return hand->handInputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    float *getHandOutputBufferAddress()
    {
        return hand->handOutputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getHandTemporaryBufferAddress()
    {
        return hand->handTemporaryBuffer;
    }

    // EMSCRIPTEN_KEEPALIVE
    // int copySrc2Dst(int width, int height, int channel)
    // {
    //     m->copySrc2Dst(width, height, channel);
    //     return 0;
    // }

    EMSCRIPTEN_KEEPALIVE
    int execHand(int width, int height, int max_palm_num, int resizedFactor)
    {
        hand->execHand(width, height, max_palm_num, resizedFactor);
        return 0;
    }
}