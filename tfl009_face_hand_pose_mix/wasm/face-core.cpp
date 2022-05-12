#include <iostream>
#include <memory>
#include "face-core.hpp"
#include <emscripten.h>

namespace
{
}

FaceCore *face = new FaceCore();

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int initFaceDetectorModelBuffer(int size)
    {
        face->initFaceDetectorModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getFaceDetectorModelBufferAddress()
    {
        return face->faceDetectorModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadFaceDetectorModel(int size)
    {
        face->loadFaceDetectorModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initFaceLandmarkModelBuffer(int size)
    {
        face->initFaceLandmarkModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getFaceLandmarkModelBufferAddress()
    {
        return face->faceLandmarkModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadFaceLandmarkModel(int size)
    {
        face->loadFaceLandmarkModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initFaceInputBuffer(int width, int height, int channel)
    {
        face->initFaceInputBuffer(width, height, channel);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getFaceInputBufferAddress()
    {
        return face->faceInputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    float *getFaceOutputBufferAddress()
    {
        return face->faceOutputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getFaceTemporaryBufferAddress()
    {
        return face->faceTemporaryBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    int execFace(int width, int height, int max_face_num)
    {
        face->execFace(width, height, max_face_num);
        return 0;
    }
}