#include <SDL/SDL.h>
#include <cstdio>
#include <emscripten.h>
#include "tensorflow/lite/kernels/register.h"
#include "tensorflow/lite/model.h"
#include "mediapipe/util/tflite/operations/transpose_conv_bias.h"

#include <cmath>
#include "opencv2/opencv.hpp"
#include <chrono>

#define CHECK_TFLITE_ERROR(x)                                    \
    if (!(x))                                                    \
    {                                                            \
        printf("[WASM] Error at %s:%d\n", __FILE__, __LINE__);   \
        return 1;                                                \
    }


namespace{
    ///// Constants
    const float PI=3.14159265359;
    const int MAX_WIDTH   = 512;
    const int MAX_HEIGHT  = 512;
    const int MAX_PADDING = 9;
    const int MAX_WIDTH_WITH_PADDING  = MAX_WIDTH  + (MAX_PADDING * 2);
    const int MAX_HEIGHT_WITH_PADDING = MAX_HEIGHT + (MAX_PADDING * 2);

    ///// Buffer for model
    char modelBuffer[1024 * 1024 * 1];

    ///// Buffer for image processing
    unsigned char inputImageBuffer[4 * MAX_WIDTH * MAX_HEIGHT];                                       // Input image Buffer
    float         inputImageBuffer32F[3 * MAX_WIDTH * MAX_HEIGHT]; 
    unsigned char grayedInputImageBuffer[1 * MAX_WIDTH * MAX_HEIGHT];                                 // Grayscaled Image Buffer
    unsigned char paddedGrayedInputImageBuffer[1 * MAX_WIDTH_WITH_PADDING * MAX_HEIGHT_WITH_PADDING]; // Padded image Buffer

    unsigned char outputSegBuffer[1 * MAX_WIDTH * MAX_HEIGHT];                                        // softmaxed output from model
    unsigned char resizedSegBuffer[1 * MAX_WIDTH * MAX_HEIGHT];                                       // resized softmaxed output
    unsigned char paddedResizedSegBuffer[1 * MAX_WIDTH_WITH_PADDING * MAX_HEIGHT_WITH_PADDING];       // Padded image buffer

    unsigned char outputImageBuffer[4 * MAX_WIDTH * MAX_HEIGHT];                                      // final output buffer


    // ////// 拡大縮小用　インデックス変換キャッシュ
    // unsigned int inputImageWidth  = 0;
    // unsigned int inputImageHeight = 0;
    // unsigned int downSamplingIndex[MAX_WIDTH * MAX_HEIGHT];
    // unsigned int upSamplingIndex[MAX_WIDTH * MAX_HEIGHT];

    ///// その他バッファ
    float matrixmap[256];      // JointBilateralFilter向け

    ///// オプション
    int kernelSize = 1;
    int useSoftmax = 0;
    int usePadding = 0;
    float thresholdWithoutSoftmax = 0.1;

    const int INTER_NEAREST = 0;
    const int INTER_LINEAR = 1;
    const int INTER_AREA = 2;
    const int INTER_CUBIC  = 3;
    const int INTER_LANCZOS4 = 4;
    int interpolation = INTER_LINEAR;

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
    unsigned char *getGrayedImageBufferOffset(){
        return grayedInputImageBuffer;
    }

    EMSCRIPTEN_KEEPALIVE
    int setSmoothingR(int r){
        int smoothingR = r;
        float gaussianRange = 1 / std::sqrt(2 * PI * smoothingR * smoothingR);
        for(int i = 0; i < 256 ; i++){
            matrixmap[i] = std::exp(i * i * -1 * gaussianRange);
        }
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int setKernelSize(int s){
        kernelSize = s;
        return 0;
    }


    EMSCRIPTEN_KEEPALIVE
    int setUseSoftmax(int enable){
        useSoftmax = enable;
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    int setUsePadding(int enable){
        usePadding = enable;
        return 0;
    }
    EMSCRIPTEN_KEEPALIVE
    int setThresholdWithoutSoftmax(float val){
        thresholdWithoutSoftmax = val;
        return 0;
    }

    EMSCRIPTEN_KEEPALIVE
    int setInterpolation(int mode){
        switch(mode){
            case INTER_NEAREST:
                interpolation = cv::INTER_NEAREST;
                break;
            case INTER_LINEAR:
                interpolation = cv::INTER_LINEAR;
                break;
            case INTER_AREA:
                interpolation = cv::INTER_AREA;
                break;
            case INTER_CUBIC:
                interpolation = cv::INTER_CUBIC;
                break;
            case INTER_LANCZOS4:
                interpolation = cv::INTER_LANCZOS4;
                break;
            default:
                interpolation = cv::INTER_LINEAR;;
        }
        return 0;
    }


    EMSCRIPTEN_KEEPALIVE
    int exec(int width, int height){
        int tensorWidth  = interpreter->input_tensor(0)->dims->data[2];
        int tensorHeight = interpreter->input_tensor(0)->dims->data[1];
        int output_ch     = interpreter->output_tensor(0)->dims->data[3];
        // printf("[WASM] TensorSize (%d, %d, %d)\n", tensorWidth, tensorHeight, output_ch);
        // printf("[WASM] SCALE (%f, %f)\n", scaleW, scaleH);


        // (1) Resize
        float *input = interpreter->typed_input_tensor<float>(0);
        cv::Mat inputImage(height, width, CV_8UC4, inputImageBuffer);
        cv::Mat inputImageRGB(height, width, CV_8UC3);
        int fromTo[] = {0,0, 1,1, 2,2};
        cv::mixChannels(&inputImage, 1, &inputImageRGB, 1, fromTo, 3);
        cv::Mat inputImage32F(height, width, CV_32FC3, inputImageBuffer32F);
        cv::Mat resizedInput(tensorHeight, tensorWidth, CV_32FC3, input);
        inputImageRGB.convertTo(inputImage32F, CV_32FC3);
        inputImage32F = inputImage32F / 255.0;
        cv::resize(inputImage32F, resizedInput, resizedInput.size(), 0, 0, interpolation);

        // (2) Infer
        CHECK_TFLITE_ERROR(interpreter->Invoke() == kTfLiteOk);

        // (3) Generate segmentation
        float *output = interpreter->typed_output_tensor<float>(0);
        unsigned char *segBuffer = &outputSegBuffer[0];
        if(output_ch ==2) {
            if(useSoftmax == 1){
                cv::Mat outputMat(tensorHeight, tensorWidth, CV_32FC2, output);
                cv::Mat channels[2]; // 0:background, 1:person
                cv::split(outputMat, channels);

                cv::Mat shiftMat, personShift, backgroundShift, expPersonShift, expBackgroundShift, sumMat, softmaxMat;
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);
                cv::max(channels[0], channels[1], shiftMat);
                cv::subtract(channels[0], shiftMat, backgroundShift);
                cv::subtract(channels[1], shiftMat, personShift);
                cv::exp(backgroundShift, expBackgroundShift);
                cv::exp(personShift, expPersonShift);
                cv::add(expBackgroundShift, expPersonShift, sumMat);
                cv::divide(expPersonShift, sumMat, softmaxMat);
                softmaxMat.convertTo(segBufferMat, CV_8U, 255, 0);
            }else{
                cv::Mat outputMat(tensorHeight, tensorWidth, CV_32FC2, output);
                cv::Mat channels[2];
                cv::split(outputMat, channels);
                cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);
                channels[1].convertTo(segBufferMat, CV_8U, 255, 0);
            }
        }else{
            cv::Mat outputMat(tensorHeight, tensorWidth, CV_32FC1, output);
            cv::Mat segBufferMat(tensorHeight, tensorWidth, CV_8UC1, segBuffer);
            outputMat.convertTo(segBufferMat, CV_8U, 255, 0);
        }


        // (4) Resize segmantation 
        //// kernelSize <= 0: return without JBF
        //// kenerlSize >0  : goto JBF
        if(kernelSize <= 0){ // Without JBF
            unsigned char *outputImageBuf = &outputImageBuffer[0];
            cv::Mat grayMat(tensorHeight, tensorWidth, CV_8UC1, outputSegBuffer);
            cv::Mat resizedGrayMat(height, width, CV_8UC1);
            cv::resize(grayMat, resizedGrayMat, resizedGrayMat.size(), 0, 0, interpolation);
            cv::Mat mat255(height, width, CV_8UC1, 255);
            cv::Mat channels[] = {mat255, mat255, mat255, resizedGrayMat};
            cv::Mat outMat(height, width, CV_8UC4, outputImageBuf);
            cv::merge(channels, 4, outMat);
            return 0;                    // fin
        }else{ // With JBF
            unsigned char *resizedSegBuf = &resizedSegBuffer[0];
            cv::Mat grayMat(tensorHeight, tensorWidth, CV_8UC1, outputSegBuffer);
            cv::Mat outMat(height, width, CV_8UC1, resizedSegBuf);
            cv::resize(grayMat, outMat, outMat.size(), 0, 0, interpolation);
        }

        // (5) Grayscale input image
        cv::Mat grayImage(height, width, CV_8UC1, grayedInputImageBuffer);
        cv::cvtColor(inputImage, grayImage, cv::COLOR_RGB2GRAY);

        // (6) padding
        int paddedWidth = width + (kernelSize * 2);
        if(usePadding == 1){
            ////// Input Image
            ///////// イメージの上下部分をパディング
            for(int x = kernelSize; x < kernelSize + width; x++){ // 列番号を特定
                //// TOP 部分のパディング
                for(int y = 0; y < kernelSize; y++){
                    int distance = kernelSize - y;
                    int copyFrom = (distance - 1) % height;
                    paddedGrayedInputImageBuffer[ paddedWidth * y + x] = grayedInputImageBuffer[width * copyFrom + (x-kernelSize)];
                }
                //// Image 部分
                for(int y = kernelSize; y < (kernelSize + height); y++){
                    paddedGrayedInputImageBuffer[ paddedWidth * y + x] = grayedInputImageBuffer[width * (y-kernelSize) + (x-kernelSize)];
                }
                //// Bottom 部分のパディング
                for(int y = kernelSize + height; y < kernelSize + height + kernelSize; y++){
                    int distance = y - (kernelSize + height);
                    int copyFrom = (height - (distance % height)) - 1;
                    paddedGrayedInputImageBuffer[ paddedWidth * y + x] = grayedInputImageBuffer[width * copyFrom + (x-kernelSize)];
                }
            }
            /////// イメージの左右部分をパディング
            for (int y = 0; y < kernelSize + height + kernelSize; y++){
                ///// Left部分のパディング
                for(int x = 0; x < kernelSize; x++){
                    int distance = kernelSize - x;
                    int copyFrom = (distance - 1) % width;
                    paddedGrayedInputImageBuffer[ paddedWidth * y + x] = grayedInputImageBuffer[width * (y-kernelSize) + copyFrom];
                }
                ///// Right部分のパディング
                for(int x = kernelSize + width; x < kernelSize + width + kernelSize; x++){
                    int distance = x - (kernelSize + width);
                    int copyFrom = (distance % width) - 1;
                    paddedGrayedInputImageBuffer[ paddedWidth * y + x] = grayedInputImageBuffer[width * (y-kernelSize) + copyFrom];
                }
            }

            ////// Segmentation
            ///////// イメージの上下部分をパディング
            for(int x = kernelSize; x < kernelSize + width; x++){ // 列番号を特定
                //// TOP 部分のパディング
                for(int y = 0; y < kernelSize; y++){
                    int distance = kernelSize - y;
                    int copyFrom = (distance - 1) % height;
                    paddedResizedSegBuffer[ paddedWidth * y + x] = resizedSegBuffer[width * copyFrom + (x-kernelSize)];
                }
                //// Image 部分
                for(int y = kernelSize; y < (kernelSize + height); y++){
                    paddedResizedSegBuffer[ paddedWidth * y + x] = resizedSegBuffer[width * (y-kernelSize) + (x-kernelSize)];
                }
                //// Bottom 部分のパディング
                for(int y = kernelSize + height; y < kernelSize + height + kernelSize; y++){
                    int distance = y - (kernelSize + height);
                    int copyFrom = (height - (distance % height)) - 1;
                    paddedResizedSegBuffer[ paddedWidth * y + x] = resizedSegBuffer[width * copyFrom + (x-kernelSize)];
                }
            }
            /////// イメージの左右部分をパディング
            for (int y = 0; y < kernelSize + height + kernelSize; y++){
                ///// Left部分のパディング
                for(int x = 0; x < kernelSize; x++){
                    int distance = kernelSize - x;
                    int copyFrom = (distance - 1) % width;
                    paddedResizedSegBuffer[ paddedWidth * y + x] = resizedSegBuffer[width * (y-kernelSize) + copyFrom];
                }
                ///// Right部分のパディング
                for(int x = kernelSize + width; x < kernelSize + width + kernelSize; x++){
                    int distance = x - (kernelSize + width);
                    int copyFrom = (distance % width) - 1;
                    paddedResizedSegBuffer[ paddedWidth * y + x] = resizedSegBuffer[width * (y-kernelSize) + copyFrom];
                }
            }
        }else{ 
            ////// Input Image
            for(int x = kernelSize; x < kernelSize + width; x++){ // 列番号を特定
                //// Image 部分
                for(int y = kernelSize; y < (kernelSize + height); y++){
                    paddedGrayedInputImageBuffer[ paddedWidth * y + x] = grayedInputImageBuffer[width * (y-kernelSize) + (x-kernelSize)];
                }
            }
            ////// Segmentation
            for(int x = kernelSize; x < kernelSize + width; x++){ // 列番号を特定
                //// Image 部分
                for(int y = kernelSize; y < (kernelSize + height); y++){
                    paddedResizedSegBuffer[ paddedWidth * y + x] = resizedSegBuffer[width * (y-kernelSize) + (x-kernelSize)];
                }
            }
        }

        // (7) Simple Joint Bilateral Filter # Tobe fixed
        unsigned char grayOutputImageBuffer[width * height];
        unsigned char* grayOutputImageBuf = &grayOutputImageBuffer[0];
        for(int y = kernelSize; y < kernelSize + height; y++){
            for(int x = kernelSize; x < kernelSize + width; x++){
                int centerVal = paddedGrayedInputImageBuffer[(paddedWidth * y) + x];
                int norm = 0;
                int sum  = 0;
                for(int ky = 0; ky < kernelSize*2+1; ky++){
                    for(int kx = 0; kx < kernelSize*2+1; kx++){
                        int positionX = x - kernelSize + kx;
                        int positionY = y - kernelSize + ky;
                        int index = std::abs(paddedGrayedInputImageBuffer[paddedWidth * positionY + positionX] - centerVal);
                        int val = matrixmap[index];
                        norm += val;
                        sum += paddedResizedSegBuffer[paddedWidth * positionY + positionX] * val;
                    }
                }
                int pixelValue = sum / norm;
                *grayOutputImageBuf = pixelValue;
                grayOutputImageBuf++;
            }
        }
        cv::Mat grayOutputMat(height, width, CV_8UC1, grayOutputImageBuffer);
        cv::Mat mat255(height, width, CV_8UC1, 255);
        cv::Mat channels[] = {mat255, mat255, mat255, grayOutputMat};
        cv::Mat outMat(height, width, CV_8UC4, outputImageBuffer);
        cv::merge(channels, 4, outMat);

        return 0;
    }




    
    EMSCRIPTEN_KEEPALIVE
    int loadModel(int bufferSize)
    {
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
        resolver.AddCustom("Convolution2DTransposeBias", mediapipe::tflite_operations::RegisterConvolution2DTransposeBias());
        tflite::InterpreterBuilder builder(*model, resolver);
        builder(&interpreter);
        CHECK_TFLITE_ERROR(interpreter != nullptr);

        // Allocate tensor buffers.
        CHECK_TFLITE_ERROR(interpreter->AllocateTensors() == kTfLiteOk);

        // smoothingR = 3 as a default
        int smoothingR = 3;
        float gaussianRange = 1 / std::sqrt(2 * PI * smoothingR * smoothingR);
        for(int i = 0; i < 256 ; i++){
            matrixmap[i] = std::exp(i * i * -1 * gaussianRange);
        }
        return 0;
    }
}