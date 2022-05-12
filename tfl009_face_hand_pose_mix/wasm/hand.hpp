#ifndef __HAND_HPP__
#define __HAND_HPP__

#include "const.hpp"

#ifdef __cplusplus
extern "C"
{
#endif

#define SYSTEM_MAX_PALM_NUM 20
#define HAND_JOINT_NUM 21
    typedef struct rect_t
    {
        fvec2 topleft;
        fvec2 btmright;
    } rect_t;

    typedef struct _palm_t
    {
        float score;
        rect_t rect;
        fvec2 keys[7];
        float rotation;

        float hand_cx;
        float hand_cy;
        float hand_w;
        float hand_h;
        fvec2 hand_pos[4];

        fvec3 landmark_keys[21];
        float landmark_score;
        float handedness;
    } palm_t;

    typedef struct _palm_detection_result_t
    {
        int num;
        palm_t palms[SYSTEM_MAX_PALM_NUM];
    } palm_detection_result_t;

    typedef struct _hand_landmark_result_t
    {
        float score;
        fvec3 joint[HAND_JOINT_NUM];
    } hand_landmark_result_t;

    typedef struct _pose3d_config_t
    {
        float score_thresh;
        float iou_thresh;
    } pose3d_config_t;

#ifdef __cplusplus
}
#endif

#endif /* __HAND_HPP__ */