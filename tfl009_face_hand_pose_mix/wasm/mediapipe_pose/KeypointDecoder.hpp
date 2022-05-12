#ifndef __MEDIAPIPE_POSE_KEYPOINT_DECORDER_HPP__
#define __MEDIAPIPE_POSE_KEYPOINT_DECORDER_HPP__

#include <vector>
#include <list>
#include "../pose.hpp"
#include "Anchor.hpp"

int decode_keypoints(std::list<pose_t> &pose_list, float score_thresh, float *points_ptr, float *score_ptr, std::vector<Anchor> *anchors);

#endif // __MEDIAPIPE_POSE_KEYPOINT_DECORDER_HPP__