export const generateShader = function (gl: WebGLRenderingContext, vertexShaderStr: string, fragmentShaderStr: string) {
    const vertexShader = compileShaderText(gl, gl.VERTEX_SHADER, vertexShaderStr)!;
    const fragmentShader = compileShaderText(gl, gl.FRAGMENT_SHADER, fragmentShaderStr)!;
    const program = linkShaders(gl, vertexShader, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
};

const compileShaderText = (gl: WebGLRenderingContext, shaderType: number, text: string) => {
    const shader = gl.createShader(shaderType)!;
    gl.shaderSource(shader, text);

    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};

const linkShaders = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
    const program = gl.createProgram()!;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
    return program;
};
