#ifndef __MEDIAPIPE_NON_MAX_SUPPRESSION_HPP__
#define __MEDIAPIPE_NON_MAX_SUPPRESSION_HPP__

#include <list>
#include "../pose.hpp"

int non_max_suppression(std::list<pose_t> &pose_list, std::list<pose_t> &pose_sel_list, float iou_thresh, int max_pose_num);

#endif // __MEDIAPIPE_NON_MAX_SUPPRESSION_HPP__