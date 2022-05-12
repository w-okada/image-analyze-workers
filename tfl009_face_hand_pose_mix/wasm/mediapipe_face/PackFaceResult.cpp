#include "PackFaceResult.hpp"
#include <cmath>
#include <cstring>
#include <iostream>

static float
normalize_radians(float angle)
{
    return angle - 2 * M_PI * std::floor((angle - (-M_PI)) / (2 * M_PI));
}

static void
compute_rotation(face_t &face)
{
    float x0 = face.keys[0].x; // left eye
    float y0 = face.keys[0].y;
    float x1 = face.keys[1].x; // right eye
    float y1 = face.keys[1].y;

    float target_angle = M_PI * 0.5f;
    float rotation = target_angle - std::atan2(-(y1 - y0), x1 - x0);

    face.rotation = normalize_radians(rotation);
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
compute_face_rect(face_t &face)
{
    float width = face.rect.btmright.x - face.rect.topleft.x;
    float height = face.rect.btmright.y - face.rect.topleft.y;
    float rect_cx = face.rect.topleft.x + width * 0.5f;
    float rect_cy = face.rect.topleft.y + height * 0.5f;
    float face_cx;
    float face_cy;
    float rotation = face.rotation;
    float shift_x = 0.0f;
    float shift_y = -0.0f;

    if (rotation == 0.0f)
    {
        face_cx = rect_cx + (width * shift_x);
        face_cy = rect_cy + (height * shift_y);
    }
    else
    {
        float dx = (width * shift_x) * std::cos(rotation) -
                   (height * shift_y) * std::sin(rotation);
        float dy = (width * shift_x) * std::sin(rotation) +
                   (height * shift_y) * std::cos(rotation);
        face_cx = rect_cx + dx;
        face_cy = rect_cy + dy;
    }

    float long_side = std::max(width, height);
    width = long_side;
    height = long_side;
    float face_w = width * 1.5f;
    float face_h = height * 1.5f;

    face.face_cx = face_cx;
    face.face_cy = face_cy;
    face.face_w = face_w;
    face.face_h = face_h;

    float dx = face_w * 0.5f;
    float dy = face_h * 0.5f;

    face.face_pos[0].x = -dx;
    face.face_pos[0].y = -dy;
    face.face_pos[1].x = +dx;
    face.face_pos[1].y = -dy;
    face.face_pos[2].x = +dx;
    face.face_pos[2].y = +dy;
    face.face_pos[3].x = -dx;
    face.face_pos[3].y = +dy;

    for (int i = 0; i < 4; i++)
    {
        rot_vec(face.face_pos[i], rotation);
        face.face_pos[i].x += face_cx;
        face.face_pos[i].y += face_cy;
    }
}

void pack_face_result(face_detection_result_t *face_result, std::list<face_t> &face_list, int max_face_num)
{
    int num_faces = 0;
    face_result->num = 0;
    for (auto itr = face_list.begin(); itr != face_list.end(); itr++)
    {
        face_t face = *itr;

        compute_rotation(face);
        compute_face_rect(face);

        memcpy(&face_result->faces[num_faces], &face, sizeof(face));
        num_faces++;
        face_result->num = num_faces;

        if (num_faces >= max_face_num)
            break;
    }
}