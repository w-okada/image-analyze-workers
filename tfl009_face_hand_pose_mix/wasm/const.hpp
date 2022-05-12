#ifndef __TFLITE_CONST_H__
#define __TFLITE_CONST_H__
/**  HAND POSE  **/
const int PALM_DETECTOR_256 = 0;
const int PALM_DETECTOR_192 = 1;

/**  FACE  **/
const int DETECTOR_SHORT = 0;
const int DETECTOR_FULL = 1;
const int DETECTOR_FULL_SPARSE = 2;

const int LANDMARK_WITH_ATTENTION = 0;
const int LANDMARK = 1;

/** POSE **/
// None.

/**  COMMON  **/
#define CHECK_TFLITE_ERROR(x)                                  \
    if (!(x))                                                  \
    {                                                          \
        printf("[WASM] Error at %s:%d\n", __FILE__, __LINE__); \
    }

#ifdef __cplusplus
extern "C"
{
#endif
    typedef struct fvec2
    {
        float x, y;
    } fvec2;

    typedef struct fvec3
    {
        float x, y, z;
    } fvec3;
    typedef struct rect_t
    {
        fvec2 topleft;
        fvec2 btmright;
    } rect_t;
#ifdef __cplusplus
}
#endif

#endif // __TFLITE_CONST_H__