extern crate wasm_bindgen;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a:u32, b:u32) -> u32 {
    a+b
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
