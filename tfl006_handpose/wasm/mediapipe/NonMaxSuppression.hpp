#ifndef __MEDIAPIPE_NON_MAX_SUPPRESSION_HPP__
#define __MEDIAPIPE_NON_MAX_SUPPRESSION_HPP__

#include <list>
#include "../handpose.hpp"

int non_max_suppression(std::list<palm_t> &face_list, std::list<palm_t> &face_sel_list, float iou_thresh, int max_palm_num);

#endif // __MEDIAPIPE_NON_MAX_SUPPRESSION_HPP__