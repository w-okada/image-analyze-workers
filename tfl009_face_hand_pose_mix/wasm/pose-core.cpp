#include <iostream>
#include <memory>
#include "pose-core.hpp"
#include <emscripten.h>

namespace
{
}

PoseCore *pose = new PoseCore();

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int initPoseDetectorModelBuffer(int size)
    {
        pose->initPoseDetectorModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getPoseDetectorModelBufferAddress()
    {
        return pose->poseDetectorModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadPoseDetectorModel(int size)
    {
        pose->loadPoseDetectorModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initPoseLandmarkModelBuffer(int size)
    {
        pose->initPoseLandmarkModelBuffer(size);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    char *getPoseLandmarkModelBufferAddress()
    {
        return pose->poseLandmarkModelBuffer;
    }
    EMSCRIPTEN_KEEPALIVE
    int loadPoseLandmarkModel(int size)
    {
        pose->loadPoseLandmarkModel(size);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int initPoseInputBuffer(int width, int height, int channel)
    {
        pose->initPoseInputBuffer(width, height, channel);
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getPoseInputBufferAddress()
    {
        return pose->poseInputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    float *getPoseOutputBufferAddress()
    {
        return pose->poseOutputBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getPoseTemporaryBufferAddress()
    {
        return pose->poseTemporaryBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    int execPose(int width, int height, int max_pose_num, int resizedFactor, float cropExtention)
    {
        pose->execPose(width, height, max_pose_num, resizedFactor, cropExtention);
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int set_pose_calculate_mode(int mode)
    {
        pose->set_pose_calculate_mode(mode);
        return 0;
    }
}