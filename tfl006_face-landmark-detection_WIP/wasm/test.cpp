#include <iostream>
#include <memory>
#include "test.hpp"
#include <emscripten.h>

// MemoryUtil<unsigned char> *m = new MemoryUtil<unsigned char>();

MemoryUtil<unsigned char, float> *m = new MemoryUtil<unsigned char, float>();

extern "C"
{

    EMSCRIPTEN_KEEPALIVE
    int initModelBuffer(int size)
    {
        m->initModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getModelBufferAddress()
    {
        return m->modelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadModel(int size)
    {
        m->loadModel(size);
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

    // EMSCRIPTEN_KEEPALIVE
    // int copySrc2Dst(int width, int height, int channel)
    // {
    //     m->copySrc2Dst(width, height, channel);
    //     return 0;
    // }

    EMSCRIPTEN_KEEPALIVE
    int exec2(int width, int height)
    {
        m->exec2(width, height);
        return 0;
    }
}
