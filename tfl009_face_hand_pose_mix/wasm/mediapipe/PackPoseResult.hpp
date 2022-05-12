#ifndef __MEDIAPIPE_PACK_POSE_RESULT_HPP__
#define __MEDIAPIPE_PACK_POSE_RESULT_HPP__

#include <list>
#include "../pose.hpp"

void pack_pose_result(pose_detection_result_t *pose_result, std::list<pose_t> &pose_list, int max_pose_num);

#endif //__MEDIAPIPE_PACK_POSE_RESULT_HPP__