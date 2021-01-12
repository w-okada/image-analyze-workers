extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

use std::{sync::Mutex};
use once_cell::sync::Lazy;
use std::f64::consts::PI;

#[wasm_bindgen]
extern "C"{
    #[wasm_bindgen(js_namespace = console)]
    fn log(a: &str);
}

#[wasm_bindgen]
pub fn shared_memory() -> JsValue {
    wasm_bindgen::memory()
}

pub struct JointBilateralFilter2 {
    src_image    : Vec<f64>,
    seg_image    : Vec<f64>,
    out_image    : Vec<f64>,

    matrix: Vec<f64>,

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

#[wasm_bindgen]
pub fn get_config() -> Vec<u32> {
    let jbf = GLOBAL_DATA.lock().unwrap();
    let src_image_ptr = jbf.src_image.as_ptr() as u32;
    let seg_image_ptr = jbf.seg_image.as_ptr() as u32;
    let out_image_ptr = jbf.out_image.as_ptr() as u32;

    vec![src_image_ptr, seg_image_ptr, out_image_ptr,]

}

#[wasm_bindgen]
pub fn do_filter(w:u32, h:u32, sp:u32, range:u32){
    let mut jbf = GLOBAL_DATA.lock().unwrap();

    if range != jbf.range {
        let gaussian_range   = 1.0 / (2.0*PI* (range as f64*range as f64)).sqrt() ;

        for i in 0..256u32{
            jbf.matrix[i as usize] = (-1.0*((i as f64*i as f64*gaussian_range) as f64)).exp();
            //jbf.matrix[i as usize] = (-1.0*((i as f64*i as f64*range as f64) as f64)).exp();
        }
        jbf.range = range
    }

    for i in sp .. sp+h{
        for j in sp .. sp+w{
            let center_position = ( (sp+w+sp) * i + j ) as usize;
            let center_val = jbf.src_image[center_position];
            let mut norm = 0.0f64;
            let mut sum  = 0.0f64;
            for ki in 0 .. sp*2+1{
                for kj in 0 .. sp*2+1{
                    let kernel_position = ((i - sp + ki)*(sp+w+sp) + (j - sp + kj))  as usize;
                    let index = ((jbf.src_image[kernel_position] - center_val).abs().floor()) as usize;
                    let val   = jbf.matrix[index];
                    norm += val;
                    sum  += jbf.seg_image[kernel_position] * val;
                }
            }
            jbf.out_image[ ((i-sp)*w + (j-sp)) as usize] = sum/norm;
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






