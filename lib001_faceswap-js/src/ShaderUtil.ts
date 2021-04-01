
export const compile_shader_text = (gl:WebGLRenderingContext, shader_type:number, text:string)=>{
    const shader = gl.createShader (shader_type)!;
    gl.shaderSource (shader, text);

    gl.compileShader (shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export const link_shaders = (gl:WebGLRenderingContext, vertShader:WebGLShader, fragShader:WebGLShader) => {
    const program = gl.createProgram()!;

    gl.attachShader (program, vertShader);
    gl.attachShader (program, fragShader);

    gl.linkProgram (program);
    if (!gl.getProgramParameter (program, gl.LINK_STATUS))
    {
        alert("Could not initialise shaders");
    }
    return program;
}

export const generate_shader = function (gl:WebGLRenderingContext, str_vs:string, str_fs:string)
{
    const vs = compile_shader_text (gl, gl.VERTEX_SHADER,   str_vs)!;
    const fs = compile_shader_text (gl, gl.FRAGMENT_SHADER, str_fs)!;
    const prog = link_shaders (gl, vs, fs);

    gl.deleteShader (vs);
    gl.deleteShader (fs);

    return prog;
}

