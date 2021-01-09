extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn initialize() {
    set_panic_hook();
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
