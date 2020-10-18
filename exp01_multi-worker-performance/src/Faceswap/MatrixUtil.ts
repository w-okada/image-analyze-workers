
export const matrix_identity = (m:any[]) => {
    m[ 0] = 1.0; m[ 4] = 0.0; m[ 8] = 0.0; m[12] = 0.0;
    m[ 1] = 0.0; m[ 5] = 1.0; m[ 9] = 0.0; m[13] = 0.0;
    m[ 2] = 0.0; m[ 6] = 0.0; m[10] = 1.0; m[14] = 0.0;
    m[ 3] = 0.0; m[ 7] = 0.0; m[11] = 0.0; m[15] = 1.0;
}

export const matrix_mult = (m:any[], m1:number[], m2:any[]) => {
    let fm0, fm1, fm2, fm3;
    let fpm00, fpm01, fpm02, fpm03;
    let fpm10, fpm11, fpm12, fpm13;
    let fpm20, fpm21, fpm22, fpm23;
    let fpm30, fpm31, fpm32, fpm33;
    let x, y, z, w;

    /* load pMb */
    fpm00 = m2[0];
    fpm01 = m2[4];
    fpm02 = m2[8];
    fpm03 = m2[12];

    fpm10 = m2[1];
    fpm11 = m2[5];
    fpm12 = m2[9];
    fpm13 = m2[13];

    fpm20 = m2[2];
    fpm21 = m2[6];
    fpm22 = m2[10];
    fpm23 = m2[14];

    fpm30 = m2[3];
    fpm31 = m2[7];
    fpm32 = m2[11];
    fpm33 = m2[15];

    /*  process 0-line of "m1" */
    fm0 = m1[0];
    fm1 = m1[4];
    fm2 = m1[8];
    fm3 = m1[12];

    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    fm0 = m1[1];
    fm1 = m1[5];
    fm2 = m1[9];
    fm3 = m1[13];

    m[0] = x;
    m[4] = y;
    m[8] = z;
    m[12] = w;

    /* *************************** */
    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    fm0 = m1[2];
    fm1 = m1[6];
    fm2 = m1[10];
    fm3 = m1[14];

    m[1] = x;
    m[5] = y;
    m[9] = z;
    m[13] = w;

    /* *************************** */
    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    fm0 = m1[3];
    fm1 = m1[7];
    fm2 = m1[11];
    fm3 = m1[15];

    m[2] = x;
    m[6] = y;
    m[10] = z;
    m[14] = w;

    /* *************************** */
    x = fm0 * fpm00;
    y = fm0 * fpm01;
    z = fm0 * fpm02;
    w = fm0 * fpm03;

    x += fm1 * fpm10;
    y += fm1 * fpm11;
    z += fm1 * fpm12;
    w += fm1 * fpm13;

    x += fm2 * fpm20;
    y += fm2 * fpm21;
    z += fm2 * fpm22;
    w += fm2 * fpm23;

    x += fm3 * fpm30;
    y += fm3 * fpm31;
    z += fm3 * fpm32;
    w += fm3 * fpm33;

    m[3] = x;
    m[7] = y;
    m[11] = z;
    m[15] = w;
}
