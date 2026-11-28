/**
 * WebGL program of the videomapping: a surface is the unit square moved onto
 * its corners with a perspective transform, showing a part of a picture laid
 * in the composition as the layers do (fill, fit or stretch).
 */

const VERTEX = `#version 300 es
uniform mat3 corners;
in vec2 point;
out vec2 surface;
void main() {
    surface = point;
    vec3 place = corners * vec3(point, 1.0);
    // The weight of the perspective keeps the picture straight inside the shape
    gl_Position = vec4(place.x * 2.0 - place.z, place.z - place.y * 2.0, 0.0, place.z);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D picture;
uniform vec4 crop;
uniform vec2 fit;
uniform float opacity;
in vec2 surface;
out vec4 color;
void main() {
    vec2 composition = crop.xy + surface * crop.zw;
    vec2 at = (composition - 0.5) * fit + 0.5;
    if (at.x < 0.0 || at.x > 1.0 || at.y < 0.0 || at.y > 1.0) {
        discard;
    }
    vec4 pixel = texture(picture, at);
    color = vec4(pixel.rgb, pixel.a * opacity);
}
`;

export interface MappingProgram {
    program: WebGLProgram;
    corners: WebGLUniformLocation | null;
    crop: WebGLUniformLocation | null;
    fit: WebGLUniformLocation | null;
    opacity: WebGLUniformLocation | null;
}

function shader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const result = gl.createShader(type) as WebGLShader;
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(result) ?? 'Shader not compiled');
    }
    return result;
}

export function createMappingProgram(gl: WebGL2RenderingContext): MappingProgram {
    const program = gl.createProgram() as WebGLProgram;
    gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'Program not linked');
    }
    gl.useProgram(program);
    // The unit square as two triangles
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    const point = gl.getAttribLocation(program, 'point');
    gl.enableVertexAttribArray(point);
    gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return {
        program,
        corners: gl.getUniformLocation(program, 'corners'),
        crop: gl.getUniformLocation(program, 'crop'),
        fit: gl.getUniformLocation(program, 'fit'),
        opacity: gl.getUniformLocation(program, 'opacity')
    };
}
