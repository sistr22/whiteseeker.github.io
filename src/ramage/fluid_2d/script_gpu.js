// 2D fluid solver based on Navier-Stokes equation and Jos Stam paper
// ==========================================
// RENDER DENSITY SHADERS
var render_density = {};
render_density.vs = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4(aVertexPosition, 0.0, 1.0);
  vTextureCoord = aTextureCoord;
}`;

render_density.fs = `
//precision mediump float;
precision highp float;
uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main(void) {
  float dens_val = clamp(texture2D(uSampler, vTextureCoord).r/0.1, 0.0, 1.0);
  gl_FragColor = vec4(dens_val, dens_val, dens_val, 1.0);
}`;
// ==========================================
// RTT INPUT SHADERS
var rtt_inputs = {};
rtt_inputs.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
void main(void) {
  gl_Position = vec4(((aVertexPosition*cellSize)+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;

rtt_inputs.fs = `
precision highp float;
uniform float val;
void main(void) {
  gl_FragColor = vec4(val, 0.0, 0.0, 1.0);
}`;
// ==========================================
// Add source program
var rtt_add_src = {};
rtt_add_src.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize+cellSize*0.5;
}`;

rtt_add_src.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D xSampler;
uniform sampler2D sSampler;
uniform float dt;
void main(void) {
  float dens = texture2D(xSampler, vTextureCoord).r + dt*texture2D(sSampler, vTextureCoord).r;
  gl_FragColor = vec4(dens, 0.0, 0.0, 1.0);
}`;
// ==========================================
// Diffuse program
var rtt_diffuse = {};
rtt_diffuse.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize+cellSize*0.5;
}`;

rtt_diffuse.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform float a;
uniform vec2 fCellSize;
uniform sampler2D prvSampler;
uniform sampler2D x0Sampler;
void main(void) {
  vec2 texel = vTextureCoord/fCellSize;
  float LC = texture2D(prvSampler, vTextureCoord+vec2(-fCellSize.x, 0.0)).r;
  float RC = texture2D(prvSampler, vTextureCoord+vec2(fCellSize.x, 0.0)).r;
  float BC = texture2D(prvSampler, vTextureCoord+vec2(0.0, -fCellSize.y)).r;
  float TC = texture2D(prvSampler, vTextureCoord+vec2(0.0, fCellSize.y)).r;
  float CC = texture2D(x0Sampler, vTextureCoord).r;
  float res = (CC + a*(LC+RC+BC+TC))/(1.0+4.0*a);
  gl_FragColor = vec4(res, 0.0, 0.0, 1.0);
}`;
// ==========================================
// Advect program
var rtt_advect = {};
rtt_advect.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize+cellSize*0.5;
}`;

rtt_advect.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform vec2 fCellSize;
uniform vec2 gridSize;
uniform vec2 dt0;
uniform sampler2D uSampler;
uniform sampler2D vSampler;
uniform sampler2D d0Sampler;
void main(void) {
  //var x = i-dt0x*u[this.idx(i, j)];
  //var y = j-dt0y*v[this.idx(i, j)];
  vec2 cellIndex = floor(vTextureCoord*gridSize);
  float u = texture2D(uSampler, vTextureCoord).r;
  float v = texture2D(vSampler, vTextureCoord).r;
  vec2 p = vec2(u, v);
  p = cellIndex - p*dt0;
  /*if (x < 0.5)
    x = 0.5;
  if (x>grid_width+0.5)
    x = grid_width+0.5;
  if (y < 0.5)
    y = 0.5;
  if (y>grid_height+0.5)
    y = grid_height+0.5;*/
  clamp(p, vec2(0.5, 0.5), gridSize+vec2(0.5, 0.5));

  /*float i0 = floor(p.x);
  float i1 = i0+1;
  float j0 = floor(p.y);
  float j1 = j0+1;*/
  vec2 p0 = floor(p);
  vec2 p1 = p+vec2(1.0, 1.0);

  /*var s1 = p.x-i0;
  var t1 = p.y-j0;
  var s0 = 1-s1;
  var t0 = 1-t1;*/
  vec2 s = p - p0;
  vec2 inv_s = vec2(1.0, 1.0) - s;

  //d[this.idx(i, j)] = s0*(t0*d0[this.idx(i0, j0)] + t1*d0[this.idx(i0, j1)])+
  //                    s1*(t0*d0[this.idx(i1, j0)] + t1*d0[this.idx(i1, j1)]);
  float BL = texture2D(d0Sampler, p0*fCellSize).r;
  float BR = texture2D(d0Sampler, vec2(p1.x, p0.y)*fCellSize).r;
  float TL = texture2D(d0Sampler, vec2(p0.x, p1.y)*fCellSize).r;
  float TR = texture2D(d0Sampler, p1*fCellSize).r;
  float term0 = inv_s.x * (inv_s.y*BL + s.y*TL);
  float term1 = s.x     * (inv_s.y*BR + s.y*TR);

  gl_FragColor = vec4(term0+term1, 0.0, 0.0, 1.0);
}`;
// ==========================================
// Project program 0
var rtt_project_0 = {};
rtt_project_0.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize+cellSize*0.5;
}`;

rtt_project_0.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform vec2 fCellSize;
uniform vec2 h;
uniform sampler2D uSampler;
uniform sampler2D vSampler;
void main(void) {
  // div[this.idx(i, j)] = -0.5*hx*(u[this.idx(i+1, j)]-u[this.idx(i-1, j)]+v[this.idx(i, j+1)]-v[this.idx(i, j-1)]);
  float val = -0.5*h.x*(
    texture2D(uSampler, vTextureCoord+fCellSize*vec2(1.0, 0.0)).r -
    texture2D(uSampler, vTextureCoord+fCellSize*vec2(-1.0, 0.0)).r +
    texture2D(vSampler, vTextureCoord+fCellSize*vec2(0.0, 1.0)).r -
    texture2D(vSampler, vTextureCoord+fCellSize*vec2(0.0, -1.0)).r);
  gl_FragColor = vec4(val, 0.0, 0.0, 1.0);
}`;
// ==========================================
// Project program 1
var rtt_project_1 = {};
rtt_project_1.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize+cellSize*0.5;
}`;

rtt_project_1.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform vec2 fCellSize;
uniform sampler2D pSampler;
uniform sampler2D divSampler;
void main(void) {
  // p[this.idx(i, j)] = (div[this.idx(i, j)] + p[this.idx(i-1, j)]+p[this.idx(i+1, j)]+p[this.idx(i, j-1)]+p[this.idx(i, j+1)])/4;
  float LC = texture2D(pSampler, vTextureCoord+vec2(-fCellSize.x, 0.0)).r;
  float RC = texture2D(pSampler, vTextureCoord+vec2(fCellSize.x, 0.0)).r;
  float BC = texture2D(pSampler, vTextureCoord+vec2(0.0, -fCellSize.y)).r;
  float TC = texture2D(pSampler, vTextureCoord+vec2(0.0, fCellSize.y)).r;
  float CC = texture2D(divSampler, vTextureCoord).r;
  float val = (CC+LC+RC+BC+TC)/4.0;
  gl_FragColor = vec4(val, 0.0, 0.0, 1.0);
}`;
// ==========================================
// Project program 2
var rtt_project_2 = {};
rtt_project_2.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize+cellSize*0.5;
}`;

rtt_project_2.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform vec2 fCellSize;
uniform float h;
uniform sampler2D pSampler;
uniform sampler2D iSampler;
uniform vec2 diff;
void main(void) {
  // u[this.idx(i, j)] -= 0.5*(p[this.idx(i+1, j)] - p[this.idx(i-1, j)])/h;
  float A = texture2D(pSampler, vTextureCoord+fCellSize*diff).r;
  float B = texture2D(pSampler, vTextureCoord-fCellSize*diff).r;
  float CC = texture2D(iSampler, vTextureCoord).r;
  float val = CC - 0.5*(A-B)/h;
  gl_FragColor = vec4(val, 0.0, 0.0, 1.0);
}`;
// ==========================================
// Set bound 0
var rtt_set_bound_0 = {};
rtt_set_bound_0.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize;
}`;

rtt_set_bound_0.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform vec2 fCellSize;
uniform sampler2D iSampler;
void main(void) {
  vec2 delta = vec2(0.0, 0.0);
  float val = 0.0;

  vec2 XY = vTextureCoord;
  if(XY.x == 0.0) {
    delta.x += fCellSize.x;
  } else if(XY.x >= 1.0-fCellSize.x) {
    delta.x -= fCellSize.x;
  }

  if(XY.y == 0.0) {
    delta.y += fCellSize.y;
  } else if(XY.y >= 1.0-fCellSize.y) {
    delta.y -= fCellSize.y;
  }

  gl_FragColor = texture2D(iSampler, vTextureCoord+delta);
}`;
// ==========================================
// Set bound 1
var rtt_set_bound_1 = {};
rtt_set_bound_1.vs = `
attribute vec2 aVertexPosition;
uniform vec2 cellSize;
varying vec2 vTextureCoord;
void main(void) {
  gl_Position = vec4((aVertexPosition*cellSize+cellSize*0.5-0.5)*2.0, 0.0, 1.0);
  vTextureCoord = aVertexPosition*cellSize;
}`;

rtt_set_bound_1.fs = `
precision highp float;
varying vec2 vTextureCoord;
uniform vec2 fCellSize;
uniform sampler2D iSampler;
void main(void) {
  gl_FragColor = texture2D(iSampler, vTextureCoord);
}`;
// ==========================================


function throwOnGLError(err, funcName, args) {
  throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
};

const GAUSS_ITERATIONS = 20;

class GpuSolver {
  constructor(grid_width, grid_height, diff, visc, canvas) {
    this.canvas = canvas;
    this.gl = WebGLDebugUtils.makeDebugContext(this.canvas.getContext("webgl2"), throwOnGLError);
    var gl = this.gl;
    console.log("WebGL version: " + gl.getParameter(gl.VERSION));
    console.log("GLSL version: " + gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    console.log("Vendor: " + gl.getParameter(gl.VENDOR));
    if(gl.getExtension("EXT_color_buffer_float"))
      console.log("EXT_color_buffer_float true");
    else
      console.log("EXT_color_buffer_float FALSE");
    this.grid_width = grid_width;
    this.grid_height = grid_height;
    this.width = grid_width+2;
    this.height = grid_height+2;
    this.array_size = this.width*this.height;
    this.exposed_size = grid_width*grid_height;

    this.initShaders(gl);

    this.insideGridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.insideGridBuffer);
    var vertices = [
      grid_width+1,  grid_height+1,
      1,  grid_height+1,
      grid_width+1, 1,
      1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    this.outerGridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.outerGridBuffer);
    var vertices = [
      this.width-1,  this.height-1,
      0,  this.height-1,
      0, 0,
      this.width-1, 0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    this.squarePosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.squarePosBuffer);
    var vertices = [
       1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
      -1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    this.squareUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.squareUVBuffer);
    var textureCoords = [
      1, 1,
      0, 1,
      1, 0,
      0, 0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);

    this.array_zeroes = new Float32Array(this.array_size*4);
    for (var i = 0 ; i < this.array_size ; i++)
      this.array_zeroes[i] = 0;

    this.dens = this.createTexture(gl);
    this.dens_prev = this.createTexture(gl);
    this.u = this.createTexture(gl);
    this.u_prev = this.createTexture(gl);
    this.v = this.createTexture(gl);
    this.v_prev = this.createTexture(gl);
    this.tmp_texture = this.createTexture(gl);

    this.initFrameBuffers(gl);
    this.step_count = 0;

    this.diff = diff;
    this.visc = visc;
    this.counter = 0;
  }

  createTexture(gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.array_zeroes);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  initFrameBuffers(gl) {
    // Create and bind the framebuffer
    this.dens.fb = this.createFrameBuffer(gl, this.dens);
    this.dens_prev.fb = this.createFrameBuffer(gl, this.dens_prev);
    this.tmp_texture.fb = this.createFrameBuffer(gl, this.tmp_texture);
    this.u.fb = this.createFrameBuffer(gl, this.u);
    this.u_prev.fb = this.createFrameBuffer(gl, this.u_prev);
    this.v.fb = this.createFrameBuffer(gl, this.v);
    this.v_prev.fb = this.createFrameBuffer(gl, this.v_prev);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  createFrameBuffer(gl, fb_texture) {
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // attach the texture as the first color attachment
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fb_texture, 0);
    //gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    switch (status) {
      case gl.FRAMEBUFFER_COMPLETE:
        break;
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
        break;
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
        break;
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        throw("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
        break;
      case gl.FRAMEBUFFER_UNSUPPORTED:
        throw("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
        break;
      default:
        throw("Incomplete framebuffer: " + status);
    }
    return fb;
  }

  initShaders(gl) {
    // Program to render the final density
    this.renderDensityProgram = this.compileProgram(gl, render_density.vs, render_density.fs);
    this.renderDensityProgram.vertexPositionAttribute = gl.getAttribLocation(this.renderDensityProgram , "aVertexPosition");
    this.renderDensityProgram.textureCoordAttribute   = gl.getAttribLocation(this.renderDensityProgram , "aTextureCoord");
    this.renderDensityProgram.samplerUniform          = gl.getUniformLocation(this.renderDensityProgram, "uSampler");
    // Program to initialise user input
    this.rttInputsProgram = this.compileProgram(gl, rtt_inputs.vs, rtt_inputs.fs);
    this.rttInputsProgram.vertexPositionAttribute = gl.getAttribLocation(this.rttInputsProgram , "aVertexPosition");
    this.rttInputsProgram.cellSizeUniform         = gl.getUniformLocation(this.rttInputsProgram, "cellSize");
    this.rttInputsProgram.valUniform              = gl.getUniformLocation(this.rttInputsProgram, "val");
    // Program to add sources
    this.rttAddSrcProgram = this.compileProgram(gl, rtt_add_src.vs, rtt_add_src.fs);
    this.rttAddSrcProgram.vertexPositionAttribute = gl.getAttribLocation(this.rttAddSrcProgram , "aVertexPosition");
    this.rttAddSrcProgram.cellSizeUniform         = gl.getUniformLocation(this.rttAddSrcProgram, "cellSize");
    this.rttAddSrcProgram.xSamplerUniform         = gl.getUniformLocation(this.rttAddSrcProgram, "xSampler");
    this.rttAddSrcProgram.sSamplerUniform         = gl.getUniformLocation(this.rttAddSrcProgram, "sSampler");
    this.rttAddSrcProgram.dtUniform               = gl.getUniformLocation(this.rttAddSrcProgram, "dt");
    // Diffuse program
    this.rttDiffuseProgram = this.compileProgram(gl, rtt_diffuse.vs, rtt_diffuse.fs);
    this.rttDiffuseProgram.vertexPositionAttribute = gl.getAttribLocation(this.rttDiffuseProgram , "aVertexPosition");
    this.rttDiffuseProgram.cellSizeUniform         = gl.getUniformLocation(this.rttDiffuseProgram, "cellSize");
    this.rttDiffuseProgram.fCellSizeUniform        = gl.getUniformLocation(this.rttDiffuseProgram, "fCellSize");
    this.rttDiffuseProgram.aUniform                = gl.getUniformLocation(this.rttDiffuseProgram, "a");
    this.rttDiffuseProgram.prvStepSamplerUniform   = gl.getUniformLocation(this.rttDiffuseProgram, "prvSampler");
    this.rttDiffuseProgram.x0SamplerUniform        = gl.getUniformLocation(this.rttDiffuseProgram, "x0Sampler");
    // Advect program
    this.rttAdvectProgram = this.compileProgram(gl, rtt_advect.vs, rtt_advect.fs);
    this.rttAdvectProgram.vertexPositionAttribute = gl.getAttribLocation(this.rttAdvectProgram , "aVertexPosition");
    this.rttAdvectProgram.cellSizeUniform         = gl.getUniformLocation(this.rttAdvectProgram, "cellSize");
    this.rttAdvectProgram.fCellSizeUniform        = gl.getUniformLocation(this.rttAdvectProgram, "fCellSize");
    this.rttAdvectProgram.gridSizeUniform         = gl.getUniformLocation(this.rttAdvectProgram, "gridSize");
    this.rttAdvectProgram.uSamplerUniform         = gl.getUniformLocation(this.rttAdvectProgram, "uSampler");
    this.rttAdvectProgram.vSamplerUniform         = gl.getUniformLocation(this.rttAdvectProgram, "vSampler");
    this.rttAdvectProgram.d0SamplerUniform        = gl.getUniformLocation(this.rttAdvectProgram, "d0Sampler");
    this.rttAdvectProgram.dt0Uniform              = gl.getUniformLocation(this.rttAdvectProgram, "dt0");
    // Project program 0
    this.rttProject0Program = this.compileProgram(gl, rtt_project_0.vs, rtt_project_0.fs);
    this.rttProject0Program.vertexPositionAttribute = gl.getAttribLocation(this.rttProject0Program , "aVertexPosition");
    this.rttProject0Program.cellSizeUniform         = gl.getUniformLocation(this.rttProject0Program, "cellSize");
    this.rttProject0Program.fCellSizeUniform        = gl.getUniformLocation(this.rttProject0Program, "fCellSize");
    this.rttProject0Program.hUniform                = gl.getUniformLocation(this.rttProject0Program, "h");
    this.rttProject0Program.uSamplerUniform         = gl.getUniformLocation(this.rttProject0Program, "uSampler");
    this.rttProject0Program.vSamplerUniform         = gl.getUniformLocation(this.rttProject0Program, "vSampler");
    // Project program 1
    this.rttProject1Program = this.compileProgram(gl, rtt_project_1.vs, rtt_project_1.fs);
    this.rttProject1Program.vertexPositionAttribute = gl.getAttribLocation(this.rttProject1Program , "aVertexPosition");
    this.rttProject1Program.cellSizeUniform         = gl.getUniformLocation(this.rttProject1Program, "cellSize");
    this.rttProject1Program.fCellSizeUniform        = gl.getUniformLocation(this.rttProject1Program, "fCellSize");
    this.rttProject1Program.divSamplerUniform       = gl.getUniformLocation(this.rttProject1Program, "divSampler");
    this.rttProject1Program.pSamplerUniform         = gl.getUniformLocation(this.rttProject1Program, "pSampler");
    // Project program 2
    this.rttProject2Program = this.compileProgram(gl, rtt_project_2.vs, rtt_project_2.fs);
    this.rttProject2Program.vertexPositionAttribute = gl.getAttribLocation(this.rttProject2Program , "aVertexPosition");
    this.rttProject2Program.cellSizeUniform         = gl.getUniformLocation(this.rttProject2Program, "cellSize");
    this.rttProject2Program.fCellSizeUniform        = gl.getUniformLocation(this.rttProject2Program, "fCellSize");
    this.rttProject2Program.diffUniform             = gl.getUniformLocation(this.rttProject2Program, "diff");
    this.rttProject2Program.hUniform                = gl.getUniformLocation(this.rttProject2Program, "h");
    this.rttProject2Program.pSamplerUniform         = gl.getUniformLocation(this.rttProject2Program, "pSampler");
    this.rttProject2Program.iSamplerUniform         = gl.getUniformLocation(this.rttProject2Program, "iSampler");
    // Set bound 0
    this.rttBound0Program = this.compileProgram(gl, rtt_set_bound_0.vs, rtt_set_bound_0.fs);
    this.rttBound0Program.vertexPositionAttribute = gl.getAttribLocation(this.rttBound0Program , "aVertexPosition");
    this.rttBound0Program.cellSizeUniform         = gl.getUniformLocation(this.rttBound0Program, "cellSize");
    this.rttBound0Program.fCellSizeUniform        = gl.getUniformLocation(this.rttBound0Program, "fCellSize");
    this.rttBound0Program.iSamplerUniform         = gl.getUniformLocation(this.rttBound0Program, "iSampler");
    // Set bound 1
    this.rttBound1Program = this.compileProgram(gl, rtt_set_bound_1.vs, rtt_set_bound_1.fs);
    this.rttBound1Program.vertexPositionAttribute = gl.getAttribLocation(this.rttBound1Program , "aVertexPosition");
    this.rttBound1Program.cellSizeUniform         = gl.getUniformLocation(this.rttBound1Program, "cellSize");
    this.rttBound1Program.fCellSizeUniform        = gl.getUniformLocation(this.rttBound1Program, "fCellSize");
    this.rttBound1Program.iSamplerUniform         = gl.getUniformLocation(this.rttBound1Program, "iSampler");
  }

  compileProgram(gl, vs_code, fs_code) {
    var program = gl.createProgram();
    var vertexShader;
    if(vs_code) {
      vertexShader = this.compileShader(gl, vs_code, gl.VERTEX_SHADER);
      gl.attachShader(program, vertexShader);
    }
    var fragmentShader;
    if(fs_code){
      fragmentShader = this.compileShader(gl, fs_code, gl.FRAGMENT_SHADER);
      gl.attachShader(program, fragmentShader);
    } 
    gl.linkProgram(program);
    if(vertexShader)
      gl.deleteShader(vertexShader);
    if(fragmentShader)
      gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      alert("Shader error !");
    return program;
  }

  compileShader(gl, shader_code, shader_type) {
    var shader = gl.createShader(shader_type);
    gl.shaderSource(shader, shader_code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      console.log("Error:\n" + gl.getShaderInfoLog(shader));
      console.log("Error compiling:\n" + shader_code);
      return null;
    }
    return shader;
  }

  draw(gl) {

    gl.viewport(0, 0, this.width, this.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.renderDensityProgram);

    gl.enableVertexAttribArray(this.renderDensityProgram.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.squarePosBuffer);
    gl.vertexAttribPointer(this.renderDensityProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(this.renderDensityProgram.textureCoordAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.squareUVBuffer);
    gl.vertexAttribPointer(this.renderDensityProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dens);
    gl.uniform1i(this.renderDensityProgram.samplerUniform, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disableVertexAttribArray(this.renderDensityProgram.textureCoordAttribute);
    gl.disableVertexAttribArray(this.renderDensityProgram.vertexPositionAttribute);
  }

  step(dt) {
    this.step_count++;
    var gl = this.gl;
    gl.viewport(0, 0, this.width, this.height);
    // Reset arrays to 0
    gl.bindTexture(gl.TEXTURE_2D, this.dens_prev);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.array_zeroes);
    gl.bindTexture(gl.TEXTURE_2D, this.u_prev);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.array_zeroes);
    gl.bindTexture(gl.TEXTURE_2D, this.v_prev);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.array_zeroes);
    gl.bindTexture(gl.TEXTURE_2D, this.tmp_texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.array_zeroes);

    this.getInputs(gl, dt);

    this.vel_step(gl, dt)
    this.dens_step(gl, dt);
    // Draw density
    this.draw(gl);
  }

  getInputs(gl, dt) {
    // Get input from ui
    if(this.counter<100) {
      var pointPosBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuffer);
      var vertices = [
         50,  50,
      ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.dens_prev.fb);
      gl.useProgram(this.rttInputsProgram);
      gl.uniform1f(this.rttInputsProgram.valUniform, 9.0);
      gl.uniform2f(this.rttInputsProgram.cellSizeUniform, 1.0/this.width, 1.0/this.height);
      // Give points positions
      gl.enableVertexAttribArray(this.rttInputsProgram.vertexPositionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuffer);
      gl.vertexAttribPointer(this.rttInputsProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
      // Draw points
      gl.drawArrays(gl.POINTS, 0, vertices.length/2);



      gl.bindFramebuffer(gl.FRAMEBUFFER, this.u_prev.fb);
      gl.uniform1f(this.rttInputsProgram.valUniform, 12.0);
      // Draw points
      gl.drawArrays(gl.POINTS, 0, vertices.length/2);



      gl.bindFramebuffer(gl.FRAMEBUFFER, this.v_prev.fb);
      gl.uniform1f(this.rttInputsProgram.valUniform, 4.0);
      // Draw points
      gl.drawArrays(gl.POINTS, 0, vertices.length/2);



      // Cleanup
      gl.disableVertexAttribArray(this.rttInputsProgram.vertexPositionAttribute);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteBuffer(pointPosBuffer);
/*
      pointPosBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuffer);
      var vertices = [
         30,  70,
         30,  30,
         70,  70,
         70,  30,
      ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      gl.enableVertexAttribArray(this.rttInputsProgram.vertexPositionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointPosBuffer);
      gl.vertexAttribPointer(this.rttInputsProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);



      gl.bindFramebuffer(gl.FRAMEBUFFER, this.u_prev.fb);
      gl.uniform1f(this.rttInputsProgram.valUniform, 0.02*dt);
      // Draw points
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length/2);



      gl.bindFramebuffer(gl.FRAMEBUFFER, this.v_prev.fb);
      gl.uniform1f(this.rttInputsProgram.valUniform, 0.04*dt);
      // Draw points
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length/2);
*/
      this.counter++;
    }
  }

  vel_step(gl, dt) {
    this.add_source(gl, this.u, this.u_prev, dt);
    var tmp = this.u;
    this.u = this.tmp_texture;
    this.tmp_texture = tmp;
    this.add_source(gl, this.v, this.v_prev, dt);
    tmp = this.v;
    this.v = this.tmp_texture;
    this.tmp_texture = tmp;

    // swap u & u_prev
    tmp = this.u;
    this.u = this.u_prev;
    this.u_prev = tmp;

    this.diffuse(gl, this.u, this.u_prev, 1, this.visc, dt);

    // swap v & v_prev
    tmp = this.v;
    this.v = this.v_prev;
    this.v_prev = tmp;

    this.diffuse(gl, this.v, this.v_prev, 2, this.visc, dt);

    this.project(gl);
    
    // swap u & u_prev
    var tmp = this.u;
    this.u = this.u_prev;
    this.u_prev = tmp;
    // swap v & v_prev
    tmp = this.v;
    this.v = this.v_prev;
    this.v_prev = tmp;

    this.advect(gl, 1, this.u, this.u_prev, this.u_prev, this.v_prev, dt);
    this.advect(gl, 2, this.v, this.v_prev, this.u_prev, this.v_prev, dt);
    this.project(gl);
  }

  dens_step(gl, dt) {
    this.add_source(gl, this.dens, this.dens_prev, dt);
    var tmp = this.dens;
    this.dens = this.tmp_texture;
    this.tmp_texture = tmp;

    // swap
    tmp = this.dens;
    this.dens = this.dens_prev;
    this.dens_prev = tmp;

    this.diffuse(gl, this.dens, this.dens_prev, 0, this.diff, dt);

    // swap
    var tmp = this.dens;
    this.dens = this.dens_prev;
    this.dens_prev = tmp;

    this.advect(gl, 0, this.dens, this.dens_prev, this.u, this.v, dt);
  }

  project(gl) {
    /*
    var hx = 1.0/this.grid_width;
    var hy = 1.0/this.grid_height;

    for (var i = 1 ; i <= this.grid_width ; i++) {
      for (var j = 0 ; j <= this.grid_height ; j++) {
        div[this.idx(i, j)] = -0.5*hx*(u[this.idx(i+1, j)]-u[this.idx(i-1, j)]+v[this.idx(i, j+1)]-v[this.idx(i, j-1)]);
      }
    }
    */
    var p = this.u_prev;
    var div = this.v_prev;

    gl.useProgram(this.rttProject0Program);
    gl.uniform2f(this.rttProject0Program.cellSizeUniform, 1.0/this.width, 1.0/this.height);
    gl.uniform2f(this.rttProject0Program.fCellSizeUniform, 1.0/this.width, 1.0/this.height);
    gl.uniform2f(this.rttProject0Program.hUniform, 1.0/this.grid_width, 1.0/this.grid_height);

    gl.uniform1i(this.rttProject0Program.uSamplerUniform, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.u);
    gl.uniform1i(this.rttProject0Program.vSamplerUniform, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.v);

    // Render the inside grid from [1,1] to [this.grid_width+1, this.grid_height+1]
    gl.enableVertexAttribArray(this.rttProject0Program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.insideGridBuffer);
    gl.vertexAttribPointer(this.rttProject0Program.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, div.fb);

    // Draw points
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disableVertexAttribArray(this.rttProject0Program.vertexPositionAttribute);

    this.set_bnd(gl, 0, div);
    this.set_bnd(gl, 0, p);

    /*
    for (var i = 1 ; i <= this.grid_width ; i++) {
      for (var j = 0 ; j <= this.grid_height ; j++) {
        p[this.idx(i, j)] = 0;
      }
    }
    */
    gl.bindTexture(gl.TEXTURE_2D, p);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.array_zeroes);
    gl.bindTexture(gl.TEXTURE_2D, this.tmp_texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.width, this.height, 0, gl.RED, gl.FLOAT, this.array_zeroes);


    /*
    for (var k = 0 ; k < 20 ; k++) {
      for (var i = 1 ; i <= this.grid_width ; i++) {
        for (var j = 1 ; j <= this.grid_height ; j++) {
          p[this.idx(i, j)] = (div[this.idx(i, j)] + p[this.idx(i-1, j)]+p[this.idx(i+1, j)]+p[this.idx(i, j-1)]+p[this.idx(i, j+1)])/4;
        }
      }
      this.set_bnd(0, p);
    }
    */
    var pingpong = [this.tmp_texture, p];
    for(var k = 0 ; k < GAUSS_ITERATIONS ; k++) {
      gl.useProgram(this.rttProject1Program);
      gl.uniform2f(this.rttProject1Program.cellSizeUniform, 1.0/this.width, 1.0/this.height);
      gl.uniform2f(this.rttProject1Program.fCellSizeUniform, 1.0/this.width, 1.0/this.height);

      gl.uniform1i(this.rttProject1Program.divSamplerUniform, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, div);

      gl.uniform1i(this.rttProject1Program.pSamplerUniform, 1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, pingpong[(k+1)%2]);

      // Render the inside grid from [1,1] to [this.grid_width+1, this.grid_height+1]
      gl.enableVertexAttribArray(this.rttProject1Program.vertexPositionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.insideGridBuffer);
      gl.vertexAttribPointer(this.rttProject1Program.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, pingpong[k%2].fb);

      // Draw points
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.disableVertexAttribArray(this.rttProject1Program.vertexPositionAttribute);

      this.set_bnd(gl, 0, p);
    }

    /*
    for (var i = 1 ; i <= this.grid_width ; i++) {
      for (var j = 0 ; j <= this.grid_height ; j++) {
        u[this.idx(i, j)] -= 0.5*(p[this.idx(i+1, j)] - p[this.idx(i-1, j)])/hx;
        v[this.idx(i, j)] -= 0.5*(p[this.idx(i, j+1)] - p[this.idx(i, j-1)])/hy;
      }
    }
    */
    gl.useProgram(this.rttProject2Program);
    gl.uniform2f(this.rttProject2Program.cellSizeUniform, 1.0/this.width, 1.0/this.height);
    gl.uniform2f(this.rttProject2Program.fCellSizeUniform, 1.0/this.width, 1.0/this.height);

    gl.uniform1i(this.rttProject2Program.pSamplerUniform, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, p);

    // Render the inside grid from [1,1] to [this.grid_width+1, this.grid_height+1]
    gl.enableVertexAttribArray(this.rttProject2Program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.insideGridBuffer);
    gl.vertexAttribPointer(this.rttProject2Program.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tmp_texture.fb);
    gl.uniform2f(this.rttProject2Program.diffUniform, 1.0, 0.0);
    gl.uniform1i(this.rttProject2Program.iSamplerUniform, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.u);
    gl.uniform1f(this.rttProject2Program.hUniform, 1.0/this.grid_width);
    // Draw points
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    var tmp = this.tmp_texture
    this.tmp_texture = this.u;
    this.u = tmp;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tmp_texture.fb);
    gl.uniform2f(this.rttProject2Program.diffUniform, 0.0, 1.0);
    gl.uniform1i(this.rttProject2Program.iSamplerUniform, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.v);
    gl.uniform1f(this.rttProject2Program.hUniform, 1.0/this.grid_height);
    // Draw points
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    tmp = this.tmp_texture
    this.tmp_texture = this.v;
    this.v = tmp;

    gl.disableVertexAttribArray(this.rttProject2Program.vertexPositionAttribute);

    this.set_bnd(gl, 1, this.u);
    this.set_bnd(gl, 2, this.v);
  }

  add_source(gl, x, s, dt) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tmp_texture.fb);
    gl.useProgram(this.rttAddSrcProgram);
    gl.uniform1i(this.rttAddSrcProgram.sSamplerUniform, 0);
    gl.uniform1i(this.rttAddSrcProgram.xSamplerUniform, 1);
    gl.uniform2f(this.rttAddSrcProgram.cellSizeUniform, 1.0/this.width, 1.0/this.height);
    // Render the inside grid from [1,1] to [this.grid_width+1, this.grid_height+1]
    gl.enableVertexAttribArray(this.rttAddSrcProgram.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.insideGridBuffer);
    gl.vertexAttribPointer(this.rttAddSrcProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(this.rttAddSrcProgram.dtUniform, dt);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, s);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, x);
    // Draw points
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // Cleanup
    gl.disableVertexAttribArray(this.rttAddSrcProgram.vertexPositionAttribute);
  }

  diffuse(gl, x, x0, b, diff, dt) {
    var a = dt*diff*this.exposed_size;

    var pingpong = [this.tmp_texture, x];
    var k;
    for(k = 0 ; k < GAUSS_ITERATIONS ; k++) {

      gl.useProgram(this.rttDiffuseProgram);
      gl.uniform2f(this.rttDiffuseProgram.cellSizeUniform, 1.0/this.width, 1.0/this.height);
      gl.uniform2f(this.rttDiffuseProgram.fCellSizeUniform, 1.0/this.width, 1.0/this.height);
      gl.uniform1f(this.rttDiffuseProgram.aUniform, a);

      gl.uniform1i(this.rttDiffuseProgram.x0SamplerUniform, 0);
      gl.uniform1i(this.rttDiffuseProgram.prvStepSamplerUniform, 1);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, x0);

      // Render the inside grid from [1,1] to [this.grid_width+1, this.grid_height+1]
      gl.enableVertexAttribArray(this.rttDiffuseProgram.vertexPositionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.insideGridBuffer);
      gl.vertexAttribPointer(this.rttDiffuseProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, pingpong[k%2].fb);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, pingpong[(k+1)%2]);

      // Draw points
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      this.set_bnd(gl, b, x);
    }
    // Cleanup
    gl.disableVertexAttribArray(this.rttDiffuseProgram.vertexPositionAttribute);
    if(k%2 != 0)
      alert("Number of diffuse passes must be even !");
  }

  advect(gl, b, d, d0, u, v, dt) {
    gl.useProgram(this.rttAdvectProgram);
    gl.uniform2f(this.rttAdvectProgram.cellSizeUniform, 1.0/this.width, 1.0/this.height);
    gl.uniform2f(this.rttAdvectProgram.fCellSizeUniform, 1.0/this.width, 1.0/this.height);
    gl.uniform2f(this.rttAdvectProgram.gridSizeUniform, this.width, this.height);
    gl.uniform2f(this.rttAdvectProgram.dt0Uniform, dt*this.grid_width, dt*this.grid_height);

    gl.uniform1i(this.rttAdvectProgram.uSamplerUniform, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, u);

    gl.uniform1i(this.rttAdvectProgram.vSamplerUniform, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, v);

    gl.uniform1i(this.rttAdvectProgram.d0SamplerUniform, 2);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, d0);

    // Render the inside grid from [1,1] to [this.grid_width+1, this.grid_height+1]
    gl.enableVertexAttribArray(this.rttAdvectProgram.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.insideGridBuffer);
    gl.vertexAttribPointer(this.rttAdvectProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, d.fb);

    // Draw points
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disableVertexAttribArray(this.rttAdvectProgram.vertexPositionAttribute);

    this.set_bnd(gl, b, d);
  }

  set_bnd(gl, b, ar) {

    var programs = [this.rttBound0Program, this.rttBound1Program];
    var pingpong = [this.tmp_texture, ar];
    for (var k = 0 ; k < 2 ; k++) {
      var prg = programs[k];
      gl.useProgram(prg);
      gl.uniform2f(prg.cellSizeUniform, 1.0/this.width, 1.0/this.height);
      gl.uniform2f(prg.fCellSizeUniform, 1.0/this.width, 1.0/this.height);
      gl.uniform2f(prg.gridSizeUniform, this.width, this.height);

      gl.uniform1i(prg.iSamplerUniform, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pingpong[(k+1)%2]);

      // Render the inside grid from [1,1] to [this.grid_width+1, this.grid_height+1]
      gl.enableVertexAttribArray(prg.vertexPositionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.outerGridBuffer);
      gl.vertexAttribPointer(prg.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, pingpong[k%2].fb);

      // Draw points
      gl.drawArrays(gl.LINE_LOOP, 0, 4);

      gl.disableVertexAttribArray(prg.vertexPositionAttribute);
    }

    /*var grid_height = this.grid_height;
    var grid_width = this.grid_width;
    for(var x=1 ; x<=grid_width ; x++) {
      ar[this.idx(x, 0)] = b==2 ? -ar[this.idx(x, 1)] : ar[this.idx(x, 1)];
      ar[this.idx(x, grid_height+1)] = b==2 ? -ar[this.idx(x, grid_height)] : ar[this.idx(x, grid_height)];
    }
    for(var y=1 ; y<=grid_height ; y++) {
      ar[this.idx(0, y)] = b==1 ? -ar[this.idx(1, y)] : ar[this.idx(1, y)];
      ar[this.idx(grid_width+1, y)] = b==1 ? -ar[this.idx(grid_width, y)] : ar[this.idx(grid_width, y)];
    }
    ar[this.idx(0, 0)]                        = 0.5 * (ar[this.idx(1, 0)]+ar[this.idx(0, 1)]);
    ar[this.idx(0, grid_height+1)]            = 0.5 * (ar[this.idx(1, grid_height+1)] + ar[this.idx(0, grid_height)]);
    ar[this.idx(grid_width+1, 0)]             = 0.5 * (ar[this.idx(grid_width, 0)] + ar[this.idx(grid_width+1, 1)]);
    ar[this.idx(grid_width+1, grid_height+1)] = 0.5 * (ar[this.idx(grid_width, grid_height+1)] + ar[this.idx(grid_width+1, grid_height)]);
  */
  }
}