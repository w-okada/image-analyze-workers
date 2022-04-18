#ifndef __MEDIAPIPE_KEYPOINT_DECORDER_HPP__
#define __MEDIAPIPE_KEYPOINT_DECORDER_HPP__

#include <vector>
#include <list>
#include "../handpose.hpp"
#include "Anchor.hpp"

int decode_keypoints(std::list<palm_t> &palm_list, float score_thresh, float *points_ptr, float *score_ptr, std::vector<Anchor> *anchors, int type);

#endif // __MEDIAPIPE_KEYPOINT_DECORDER_HPP__