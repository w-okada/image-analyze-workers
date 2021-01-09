extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

// use web_sys::console;

// #[wasm_bindgen]
// pub fn add(a:u32, b:u32) -> u32 {
//     console::log_3(&"JSJSJSJSJ 1st:{}  2nd:{}".into(), &JsValue::from_f64(a as f64), &JsValue::from_f64(b as f64));
//     a+b
// }

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
