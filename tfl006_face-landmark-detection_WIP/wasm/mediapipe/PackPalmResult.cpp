#include "PackPalmResult.hpp"
#include <cmath>
#include <cstring>

static float
normalize_radians(float angle)
{
    return angle - 2 * M_PI * std::floor((angle - (-M_PI)) / (2 * M_PI));
}

static void
compute_rotation(palm_t &palm)
{
    float x0 = palm.keys[0].x; // Center of wrist.
    float y0 = palm.keys[0].y;
    float x1 = palm.keys[2].x; // MCP of middle finger.
    float y1 = palm.keys[2].y;

    float target_angle = M_PI * 0.5f;
    float rotation = target_angle - std::atan2(-(y1 - y0), x1 - x0);

    palm.rotation = normalize_radians(rotation);
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
compute_hand_rect(palm_t &palm)
{
    float width = palm.rect.btmright.x - palm.rect.topleft.x;
    float height = palm.rect.btmright.y - palm.rect.topleft.y;
    float palm_cx = palm.rect.topleft.x + width * 0.5f;
    float palm_cy = palm.rect.topleft.y + height * 0.5f;
    float hand_cx;
    float hand_cy;
    float rotation = palm.rotation;
    float shift_x = 0.0f;
    float shift_y = -0.5f;

    if (rotation == 0.0f)
    {
        hand_cx = palm_cx + (width * shift_x);
        hand_cy = palm_cy + (height * shift_y);
    }
    else
    {
        float dx = (width * shift_x) * std::cos(rotation) -
                   (height * shift_y) * std::sin(rotation);
        float dy = (width * shift_x) * std::sin(rotation) +
                   (height * shift_y) * std::cos(rotation);
        hand_cx = palm_cx + dx;
        hand_cy = palm_cy + dy;
    }

    float long_side = std::max(width, height);
    width = long_side;
    height = long_side;
    float hand_w = width * 2.6f;
    float hand_h = height * 2.6f;
    // float hand_w = width * 1.3f;
    // float hand_h = height * 1.3f;

    palm.hand_cx = hand_cx;
    palm.hand_cy = hand_cy;
    palm.hand_w = hand_w;
    palm.hand_h = hand_h;

    float dx = hand_w * 0.5f;
    float dy = hand_h * 0.5f;

    palm.hand_pos[0].x = -dx;
    palm.hand_pos[0].y = -dy;
    palm.hand_pos[1].x = +dx;
    palm.hand_pos[1].y = -dy;
    palm.hand_pos[2].x = +dx;
    palm.hand_pos[2].y = +dy;
    palm.hand_pos[3].x = -dx;
    palm.hand_pos[3].y = +dy;

    for (int i = 0; i < 4; i++)
    {
        rot_vec(palm.hand_pos[i], rotation);
        palm.hand_pos[i].x += hand_cx;
        palm.hand_pos[i].y += hand_cy;
    }
}

void pack_palm_result(palm_detection_result_t *palm_result, std::list<palm_t> &palm_list)
{
    int num_palms = 0;
    palm_result->num = 0;
    for (auto itr = palm_list.begin(); itr != palm_list.end(); itr++)
    {
        palm_t palm = *itr;

        compute_rotation(palm);
        compute_hand_rect(palm);

        memcpy(&palm_result->palms[num_palms], &palm, sizeof(palm));
        num_palms++;
        palm_result->num = num_palms;

        if (num_palms >= MAX_PALM_NUM)
            break;
    }
}