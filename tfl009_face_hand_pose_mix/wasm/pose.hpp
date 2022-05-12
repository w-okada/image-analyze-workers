#ifndef __TFLITE_POSE_H__
#define __TFLITE_POSE_H__

#ifdef __cplusplus
extern "C"
{
#endif

#define SYSTEM_MAX_POSE_NUM 20

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

    typedef struct _pose_t
    {
        float score;
        rect_t rect;
        fvec2 keys[4];
        float rotation;

        float pose_cx;
        float pose_cy;
        float pose_w;
        float pose_h;
        fvec2 pose_pos[4];

        fvec3 landmark_keys[39];
        fvec3 landmark3d_keys[39];
        float visibility[39];
        float presence[39];
        float landmark_score;
    } pose_t;

    typedef struct _pose_detection_result_t
    {
        int num;
        pose_t poses[SYSTEM_MAX_POSE_NUM];
    } pose_detection_result_t;

#ifdef __cplusplus
}
#endif

#endif /* __TFLITE_POSE_H__ */