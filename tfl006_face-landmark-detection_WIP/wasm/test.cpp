#include <iostream>
#include <memory>
#include "test.hpp"
#include <emscripten.h>

MemoryUtil *m = new MemoryUtil();

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    unsigned char *getInputImageBufferOffset()
    {
        return m->inputImageBuffer;
    }
}

MemoryUtil::MemoryUtil()
{
}

MemoryUtil::~MemoryUtil()
{
    delete this->inputImageBuffer;
    std::cout << "destroy memory util." << std::endl;
}

void MemoryUtil::init(int width, int height, int channel)
{
    this->inputImageBuffer = new unsigned char[width * height * channel];
}

unsigned char *MemoryUtil::getInputImageBufferAddress()
{
    return inputImageBuffer;
}
