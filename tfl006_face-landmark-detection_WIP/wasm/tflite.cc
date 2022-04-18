#include <SDL/SDL.h>
#include <cstdio>
#include <emscripten.h>
#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include <cmath>
#include <chrono>
#include "opencv2/opencv.hpp"
// #include "test.hpp"

namespace
{

}

using std::chrono::high_resolution_clock;

auto start_time = high_resolution_clock::now();
auto count = 0;

extern "C"
{
}