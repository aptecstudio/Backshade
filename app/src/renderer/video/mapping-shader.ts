/**
 * WebGL program of the videomapping: a surface is the unit square, bent by
 * its mesh and moved onto its corners with a perspective transform, showing
 * a part of a picture laid in the composition as the layers do (fill, fit or
 * stretch). Every vertex says where it is on the flat surface, for the
 * picture, and where the mesh takes it.
 */

const VERTEX = `#version 300 es
uniform mat3 corners;
in vec2 point;
in vec2 bent;
out vec2 surface;
void main() {
    surface = point;
    vec3 place = corners * vec3(bent, 1.0);
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
    /** Filled by the renderer: for every vertex, the point and where the mesh takes it */
    vertices: WebGLBuffer;
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
    const vertices = gl.createBuffer() as WebGLBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    for (const [name, offset] of [['point', 0], ['bent', 8]] as const) {
        const location = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 16, offset);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return {
        program,
        corners: gl.getUniformLocation(program, 'corners'),
        crop: gl.getUniformLocation(program, 'crop'),
        fit: gl.getUniformLocation(program, 'fit'),
        opacity: gl.getUniformLocation(program, 'opacity'),
        vertices
    };
}
