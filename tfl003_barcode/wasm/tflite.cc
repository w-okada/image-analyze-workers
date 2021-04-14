#include <SDL/SDL.h>
#include <cstdio>
#include <emscripten.h>
#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "opencv2/opencv.hpp"
#include <cmath>
#include <chrono>

#include "tensorflow/lite/interpreter.h"
#include "tensorflow/lite/optional_debug_tools.h"

#define CHECK_TFLITE_ERROR(x)                                    \
    if (!(x))                                                    \
    {                                                            \
        printf("[WASM] Error at %s:%d\n", __FILE__, __LINE__);   \
        return 1;                                                \
    }


namespace{
    const int MAX_WIDTH   = 512;
    const int MAX_HEIGHT  = 512;
    char modelBuffer[1024*1024*256]; 
    
    ///// Buffer for image processing
    unsigned char inputImageBuffer[3 * MAX_WIDTH * MAX_HEIGHT]; 
    unsigned char resizedImageBuffer[3 * MAX_WIDTH * MAX_HEIGHT]; 

    long long resizedOutputImageBuffer[1 * MAX_WIDTH * MAX_HEIGHT];
    unsigned char outputImageBuffer[1 * MAX_WIDTH * MAX_HEIGHT];
}

using std::chrono::high_resolution_clock;
std::unique_ptr<tflite::Interpreter> interpreter;

auto start_time = high_resolution_clock::now();
auto count = 0;

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    char *getModelBufferMemoryOffset(){
        return modelBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getInputImageBufferOffset(){
        return inputImageBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    unsigned char *getOutputImageBufferOffset(){
        return outputImageBuffer;
    }


    EMSCRIPTEN_KEEPALIVE
    float *getInputMemoryOffset(){
        return interpreter->typed_input_tensor<float>(0);
    }

    EMSCRIPTEN_KEEPALIVE
    float *getOutputMemoryOffset(){
        return interpreter->typed_output_tensor<float>(0);
    }



    EMSCRIPTEN_KEEPALIVE
    int exec(int width, int height){
        int tensorWidth  = interpreter->input_tensor(0)->dims->data[2];
        int tensorHeight = interpreter->input_tensor(0)->dims->data[1];
        printf("[WASM] TensorSize (%d, %d)\n", tensorWidth, tensorHeight);
        // printf("[WASM] SCALE (%f, %f)\n", scaleW, scaleH);


        //// Resize
        cv::Mat inputImage(height, width, CV_8UC3, (unsigned char*)inputImageBuffer);
        cv::Mat resizedImage(tensorHeight, tensorWidth, CV_8UC3, (unsigned char*)resizedImageBuffer);
        cv::resize(inputImage, resizedImage, resizedImage.size(), 0, 0, cv::INTER_LINEAR);
        printf("[WASM] resized\n");

        //// input
        printf("[WASM] resized1111\n");
        unsigned char *input = interpreter->typed_input_tensor<unsigned char>(0);
        printf("[WASM] resized222\n");
        for(int i = 0; i < tensorHeight * tensorWidth; i++){
            input[i * 3 + 0] = resizedImageBuffer[i * 3 + 0];
            input[i * 3 + 1] = resizedImageBuffer[i * 3 + 1];
            input[i * 3 + 2] = resizedImageBuffer[i * 3 + 2];
            // if(i%10000 == 0){
            //     printf("[WASM] resized3 %d\n", resizedImageBuffer[i]);
            // }
        }
        // printf("[WASM] input\n" );

        // infer
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);
        // printf("[WASM] invoke1\n");

        // output
        long long *output = interpreter->typed_output_tensor<long long>(0);
        // printf("[WASM] invoke2 %c %c %c\n", output[0], output[1] ,output[297*297*3-1]);
        cv::Mat outputImage64FC3(297, 297, CV_64FC1, output);
        cv::Mat resizedOutputImage64FC3(height, width, CV_64FC1, resizedOutputImageBuffer);
        cv::resize(outputImage64FC3, resizedOutputImage64FC3, resizedOutputImage64FC3.size(), 0, 0, cv::INTER_LINEAR);



        // printf("[WASM] invoke3\n");
        // cv::Mat outputImage8FC1(height, width, CV_8UC1, outputImageBuffer);        
        // resizedOutputImage64FC3.convertTo(outputImage8FC1, CV_8UC1);
        // outputImage8FC1 = outputImage8FC1 * 255;
        long long num = 0;
        int count0 = 0;
        int count1 = 0;
        // for(int i = 0; i<297*297; i++){
        for(int i = 0; i<width*height; i++){
        // for(int i = 0; i<30; i++){
            // // if(outputImageBuffer[i] != 0){
            // //     printf("[WASM] %d\n", outputImageBuffer[i]);
            // // }
            // if(output[i] != 0){
            //     count1++;
            // }else{
            //     count0++;
            // }
            outputImageBuffer[i] = resizedOutputImageBuffer[i] * 255;
            if(resizedOutputImageBuffer[i] != 0){
                num = resizedOutputImageBuffer[i];
                count1++;
            }else{
                count0++;
            }

        }
        printf("[WASM] count: %d %d     %lld\n", count0, count1, num);
        // printf("[WASM] invoke4\n");
        printf("[WASM] resized2\n");

        return 0;
    }
    
    EMSCRIPTEN_KEEPALIVE
    int loadModel(int bufferSize){
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] - TFLite Model Loader for meet segmentation            -\n");
        printf("[WASM] - Bug report:                                          -\n");
        printf("[WASM] -   https://github.com/w-okada/image-analyze-workers   -\n");
        printf("[WASM] --------------------------------------------------------\n");
        printf("[WASM] \n");
        printf("[WASM] Loading model of sizeaa: %d\n", bufferSize);

        // Load model
        std::unique_ptr<tflite::FlatBufferModel> model = tflite::FlatBufferModel::BuildFromBuffer(modelBuffer, bufferSize);
        CHECK_TFLITE_ERROR(model != nullptr);

        tflite::ops::builtin::BuiltinOpResolver resolver;
        tflite::InterpreterBuilder builder(*model, resolver);
        builder(&interpreter);

        CHECK_TFLITE_ERROR(interpreter != nullptr);
        CHECK_TFLITE_ERROR(interpreter->AllocateTensors() == kTfLiteOk);
        // tflite::PrintInterpreterState(interpreter.get());

        int input_height  = interpreter->input_tensor(0)->dims->data[1];
        int input_width   = interpreter->input_tensor(0)->dims->data[2];
        int input_ch      = interpreter->input_tensor(0)->dims->data[3];
        int output_height = interpreter->output_tensor(0)->dims->data[1];
        int output_width  = interpreter->output_tensor(0)->dims->data[2];
        int output_ch     = interpreter->output_tensor(0)->dims->data[3];
        printf("[WASM] input(%d, %d, %d), output(%d, %d, %d)\n", input_height, input_width, input_ch, output_height, output_width, output_ch);
        unsigned char *input_ptr = interpreter->typed_input_tensor<unsigned char>(0);
        long long *output_ptr = interpreter->typed_output_tensor<long long>(0);
        printf("[WASM] ptr(%p, %p)\n", input_ptr, output_ptr);
        // CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);
        // printf("[WASM] invoke pre1\n" );
        return 0;
    }
}