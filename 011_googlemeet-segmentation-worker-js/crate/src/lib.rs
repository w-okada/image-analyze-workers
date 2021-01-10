extern crate wasm_bindgen;
use std::sync::{Once,};
use wasm_bindgen::prelude::*;
use rand::Rng;
use chrono::{DateTime, Local};
use std::convert::TryFrom;

#[derive(Clone)]
pub struct JointBilateralFilter2 {
    w: u32,
    h: u32,
    sp: u32,
    range: u32,
    //https://github.com/rustwasm/wasm-bindgen/issues/1848#issuecomment-549855068
    src_image: Vec<f64>,
    seg_image: Vec<f64>,
    pad_src_image: Vec<f64>,
    pad_seg_image: Vec<f64>,
    out_image: Vec<f64>,
}


pub fn get_JointBilateralFilter() -> Box<JointBilateralFilter2>{
    static mut INSTANCE: Option<Box<JointBilateralFilter2>> = None;
    static once: Once = Once::new();
    unsafe{
        once.call_once(||{
            let instance = JointBilateralFilter2 {
                w:1,h:2,sp:3,range:1,
                src_image:     vec![0.0; 1024 * 1024 * 4 * 4],
                seg_image:     vec![0.0; 1024 * 1024 * 1 * 4],
                pad_src_image: vec![0.0; 1024 * 1024 * 1 * 4],
                pad_seg_image: vec![0.0; 1024 * 1024 * 1 * 4],
                out_image:     vec![0.0; 1024 * 1024 * 1 * 4],

            };
            INSTANCE = Some(Box::new(instance));
        });


        INSTANCE.clone().unwrap()
    }

}


#[wasm_bindgen]
pub fn get_config() -> Vec<u32> {
    let jbf = get_JointBilateralFilter();
    vec![jbf.w, jbf.h, jbf.range]
}


#[wasm_bindgen(start)]
pub fn initialize() {
    set_panic_hook();
}


#[wasm_bindgen]
pub struct JointBilateralFilter {
    w: u32,
    h: u32,
    sp: u32,
    range: u32,

}


#[wasm_bindgen]
impl JointBilateralFilter{
    #[wasm_bindgen(constructor)]
    pub fn new(w:u32, h:u32, sp:u32, range:u32) -> JointBilateralFilter{
        JointBilateralFilter {w, h, sp, range}
    }

    #[wasm_bindgen]
    pub fn get_config(self) -> Vec<u32> {
        vec![self.w, self.h]
        // vec![1,2]
    }
    
}


#[wasm_bindgen]
pub fn add(a:u32, b:u32) -> u32 {
    a+b
}


#[wasm_bindgen]
pub fn sum1(a:Vec<u32>) -> u32 {
//    a.iter().fold(0, |sum, b| sum + b)
    10
}


#[wasm_bindgen]
pub fn sum2(a:u32) -> Vec<u32> {
//    a.iter().fold(0, |sum, b| sum + b)
    vec![1,2,3]
}


#[wasm_bindgen]
pub fn greeting() -> String{
    "Hello World!!".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn it_works() {
        assert_eq!(greeting(), "hello".to_string());
    }
}



pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}






