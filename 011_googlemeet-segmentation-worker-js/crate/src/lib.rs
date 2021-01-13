extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

use std::{sync::Mutex};
use once_cell::sync::Lazy;
use std::f32::consts::PI;

static mut range_p:u32 = 0;

#[wasm_bindgen]
extern "C"{
    #[wasm_bindgen(js_namespace = console)]
    fn log(a: &str);
}

#[wasm_bindgen]
pub fn shared_memory() -> JsValue {
    wasm_bindgen::memory()
}
#[derive(Debug)]
pub struct JointBilateralFilter2 {
    src_image    : Vec<f32>,
    seg_image    : Vec<f32>,
    out_image    : Vec<f32>,

    matrix: Vec<f32>,

    range: u32
}

static GLOBAL_DATA: Lazy<Mutex<JointBilateralFilter2>> = Lazy::new(|| {
    let instance = JointBilateralFilter2 {
        src_image:     vec![0.0; 1024 * 1024 * 1], // w, h , ch 
        seg_image:     vec![0.0; 1024 * 1024 * 1],
        out_image:     vec![0.0; 1024 * 1024 * 1],

        matrix:        vec![0.0; 256],
        range:         0
    };
    Mutex::new(instance)
});

static SRC_IMAGE: Lazy<Mutex<Vec<f32>>> = Lazy::new(|| {
    Mutex::new(vec![0.0; 1024 * 1024 * 1])
});
static SEG_IMAGE: Lazy<Mutex<Vec<f32>>> = Lazy::new(|| {
    Mutex::new(vec![0.0; 1024 * 1024 * 1])
});
static OUT_IMAGE: Lazy<Mutex<Vec<f32>>> = Lazy::new(|| {
    Mutex::new(vec![0.0; 1024 * 1024 * 1])
});
static MATRIX: Lazy<Mutex<Vec<f32>>> = Lazy::new(|| {
    Mutex::new(vec![0.0; 256])
});
static RANGE: Lazy<Mutex<u32>> = Lazy::new(|| {
    Mutex::new(0)
});


#[wasm_bindgen]
pub fn get_config() -> Vec<u32> {
    let mut src_image = SRC_IMAGE.lock().unwrap();
    let mut seg_image = SEG_IMAGE.lock().unwrap();
    let mut out_image = OUT_IMAGE.lock().unwrap();
    let mut _range    = RANGE.lock().unwrap();
    let mut _matrix   = MATRIX.lock().unwrap();

    let src_image_ptr = src_image.as_ptr() as u32;
    let seg_image_ptr = seg_image.as_ptr() as u32;
    let out_image_ptr = out_image.as_ptr() as u32;

    // let jbf = GLOBAL_DATA.lock().unwrap();
    // let src_image_ptr = jbf.src_image.as_ptr() as u32;
    // let seg_image_ptr = jbf.seg_image.as_ptr() as u32;
    // let out_image_ptr = jbf.out_image.as_ptr() as u32;
    

    let s = format!("CONFIG, {:?} !!", [src_image_ptr, seg_image_ptr, out_image_ptr]);
    log(&s);    
    vec![src_image_ptr, seg_image_ptr, out_image_ptr,]
}

#[wasm_bindgen]
pub fn do_filter(w:u32, h:u32, sp:u32, range:u32){
    // let mut jbf = GLOBAL_DATA.lock().unwrap();
    let src_image_p  = SRC_IMAGE.lock().unwrap();
    let src_image:&[f32] = &src_image_p[..];
    let seg_image_p  = SEG_IMAGE.lock().unwrap();
    let seg_image:&[f32] = &seg_image_p[..];
    let mut out_image_p  = OUT_IMAGE.lock().unwrap();
    let out_image:&mut [f32] = &mut out_image_p[..];

    let mut matrix_p      = MATRIX.lock().unwrap();
    let matrix:&mut [f32]    = &mut matrix_p[..];
    // let mut range_p      = *RANGE.lock().unwrap();



    // let s = format!("Hello, {:?} !!", v2);
    // log(&s);
    // let src_image_ptr = jbf.src_image.as_ptr() as u32;
    // let seg_image_ptr = jbf.seg_image.as_ptr() as u32;
    // let out_image_ptr = jbf.out_image.as_ptr() as u32;
    // let s = format!("FILTER, {:?} !!", [src_image_ptr, seg_image_ptr, out_image_ptr]);
    // log(&s);    
    // let src_image:&[f32] = &mut (jbf.src_image[..]);

    // let src_image = &mut jbf.src_image[..];
    // let seg_image = jbf.seg_image;
    // let mut out_image = jbf.out_image;

    unsafe{
        if range_p != range {
            let gaussian_range   = 1.0 / (2.0*PI* (range as f32*range as f32)).sqrt() ;
            for i in 0..256u32{
                matrix[i as usize] = (-1.0*((i as f32*i as f32*gaussian_range) as f32)).exp();
            }
            range_p = range
        }
    }


    let p_width = sp+w+sp;
    for i in sp .. sp+h{
        for j in sp .. sp+w{
            let center_position = ( (p_width) * i + j ) as usize;
            let center_val = src_image[center_position];
            let mut norm = 0.0f32;
            let mut sum  = 0.0f32;
            for ki in 0 .. sp*2+1{
                for kj in 0 .. sp*2+1{
                    let kernel_position = ((i - sp + ki)*(p_width) + (j - sp + kj))  as usize;
                    let index = ((src_image[kernel_position] - center_val).abs().floor()) as usize;
                    let val   = matrix[index];
                    norm += val;
                    sum  += seg_image[kernel_position] * val;
                }
            }
            out_image[ ((i-sp)*w + (j-sp)) as usize] = sum/norm;
        }
    }    
}



#[wasm_bindgen(start)]
pub fn initialize() {
    set_panic_hook();
}

pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}






