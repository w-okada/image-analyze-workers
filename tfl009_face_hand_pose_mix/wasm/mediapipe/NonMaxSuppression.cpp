
#include "NonMaxSuppression.hpp"

static bool
compare(pose_t &v1, pose_t &v2)
{
    if (v1.score > v2.score)
        return true;
    else
        return false;
}

static float
calc_intersection_over_union(rect_t &rect0, rect_t &rect1)
{
    float sx0 = rect0.topleft.x;
    float sy0 = rect0.topleft.y;
    float ex0 = rect0.btmright.x;
    float ey0 = rect0.btmright.y;
    float sx1 = rect1.topleft.x;
    float sy1 = rect1.topleft.y;
    float ex1 = rect1.btmright.x;
    float ey1 = rect1.btmright.y;

    float xmin0 = std::min(sx0, ex0);
    float ymin0 = std::min(sy0, ey0);
    float xmax0 = std::max(sx0, ex0);
    float ymax0 = std::max(sy0, ey0);
    float xmin1 = std::min(sx1, ex1);
    float ymin1 = std::min(sy1, ey1);
    float xmax1 = std::max(sx1, ex1);
    float ymax1 = std::max(sy1, ey1);

    float area0 = (ymax0 - ymin0) * (xmax0 - xmin0);
    float area1 = (ymax1 - ymin1) * (xmax1 - xmin1);
    if (area0 <= 0 || area1 <= 0)
        return 0.0f;

    float intersect_xmin = std::max(xmin0, xmin1);
    float intersect_ymin = std::max(ymin0, ymin1);
    float intersect_xmax = std::min(xmax0, xmax1);
    float intersect_ymax = std::min(ymax0, ymax1);

    float intersect_area = std::max(intersect_ymax - intersect_ymin, 0.0f) *
                           std::max(intersect_xmax - intersect_xmin, 0.0f);

    return intersect_area / (area0 + area1 - intersect_area);
}

int non_max_suppression(std::list<pose_t> &pose_list, std::list<pose_t> &pose_sel_list, float iou_thresh, int max_pose_num)
{
    pose_list.sort(compare);

    for (auto itr = pose_list.begin(); itr != pose_list.end(); itr++)
    {
        pose_t pose_candidate = *itr;

        int ignore_candidate = false;
        for (auto itr_sel = pose_sel_list.rbegin(); itr_sel != pose_sel_list.rend(); itr_sel++)
        {
            pose_t pose_sel = *itr_sel;

            float iou = calc_intersection_over_union(pose_candidate.rect, pose_sel.rect);
            if (iou >= iou_thresh)
            {
                ignore_candidate = true;
                break;
            }
        }

        if (!ignore_candidate)
        {
            pose_sel_list.push_back(pose_candidate);
            if (pose_sel_list.size() >= max_pose_num)
                break;
        }
    }

    return 0;
}
