#include "PackPoseResult.hpp"
#include <cmath>
#include <cstring>
#include <iostream>

static float
normalize_radians(float angle)
{
    return angle - 2 * M_PI * std::floor((angle - (-M_PI)) / (2 * M_PI));
}

static void
compute_rotation(pose_t &pose)
{
    float x0 = pose.keys[0].x; // left eye
    float y0 = pose.keys[0].y;
    float x1 = pose.keys[1].x; // right eye
    float y1 = pose.keys[1].y;

    float target_angle = M_PI * 0.5f;
    float rotation = target_angle - std::atan2(-(y1 - y0), x1 - x0);

    pose.rotation = normalize_radians(rotation);
}
static void
rot_vec(fvec2 &vec, float rotation)
{
    float sx = vec.x;
    float sy = vec.y;
    vec.x = sx * std::cos(rotation) - sy * std::sin(rotation);
    vec.y = sx * std::sin(rotation) + sy * std::cos(rotation);
}

static void
compute_pose_rect(pose_t &pose)
{
    float width = pose.rect.btmright.x - pose.rect.topleft.x;
    float height = pose.rect.btmright.y - pose.rect.topleft.y;
    float rect_cx = pose.rect.topleft.x + width * 0.5f;
    float rect_cy = pose.rect.topleft.y + height * 0.5f;
    float pose_cx;
    float pose_cy;
    float rotation = pose.rotation;
    float shift_x = 0.0f;
    float shift_y = -0.0f;

    if (rotation == 0.0f)
    {
        pose_cx = rect_cx + (width * shift_x);
        pose_cy = rect_cy + (height * shift_y);
    }
    else
    {
        float dx = (width * shift_x) * std::cos(rotation) -
                   (height * shift_y) * std::sin(rotation);
        float dy = (width * shift_x) * std::sin(rotation) +
                   (height * shift_y) * std::cos(rotation);
        pose_cx = rect_cx + dx;
        pose_cy = rect_cy + dy;
    }

    float long_side = std::max(width, height);
    width = long_side;
    height = long_side;
    float pose_w = width * 1.5f;
    float pose_h = height * 1.5f;

    pose.pose_cx = pose_cx;
    pose.pose_cy = pose_cy;
    pose.pose_w = pose_w;
    pose.pose_h = pose_h;

    float dx = pose_w * 0.5f;
    float dy = pose_h * 0.5f;

    pose.pose_pos[0].x = -dx;
    pose.pose_pos[0].y = -dy;
    pose.pose_pos[1].x = +dx;
    pose.pose_pos[1].y = -dy;
    pose.pose_pos[2].x = +dx;
    pose.pose_pos[2].y = +dy;
    pose.pose_pos[3].x = -dx;
    pose.pose_pos[3].y = +dy;

    for (int i = 0; i < 4; i++)
    {
        rot_vec(pose.pose_pos[i], rotation);
        pose.pose_pos[i].x += pose_cx;
        pose.pose_pos[i].y += pose_cy;
    }
}

void pack_pose_result(pose_detection_result_t *pose_result, std::list<pose_t> &pose_list, int max_pose_num)
{
    int num_poses = 0;
    pose_result->num = 0;
    for (auto itr = pose_list.begin(); itr != pose_list.end(); itr++)
    {
        pose_t pose = *itr;

        compute_rotation(pose);
        compute_pose_rect(pose);

        memcpy(&pose_result->poses[num_poses], &pose, sizeof(pose));
        num_poses++;
        pose_result->num = num_poses;

        if (num_poses >= max_pose_num)
            break;
    }
}