const UiActions = Object.freeze({
  PLAY:   Symbol("play"),
  PAUSE:   Symbol("pause"),
  HIDE_DEBUG: Symbol("hide_debug"),
  SHOW_DEBUG: Symbol("show_debug"),
});

class BezierRenderer {
  constructor(bezier) {
    this.bezier = bezier;
  }

  Draw(gl, VP) {
    this.Retesselate(gl);
    this.DrawLines(gl, VP, this.bezier.color || [1.0, 1.0, 1.0, 1.0]);
    if(this.showBBox)
      this.DrawBBox(gl, VP);
  }

  DrawControlPoint() {
    let ctrl_points = this.bezier.GetControlPoints();
    if(ctrl_points.length == 0)
      return;
    let lines = [];
    this.DrawPoint(gl, VP, ctrl_points[0], ctrl_points[0].color ? ctrl_points[0].color : [0.0, 1.0, 1.0, 1.0]);
    for(var i = 1 ; i < ctrl_points.length ; i+=3){
      var cl = ctrl_points[i].color ? ctrl_points[i].color : [0.0, 0.0, 1.0, 1.0];
      this.DrawPoint(gl, VP, ctrl_points[i], cl);
      cl = ctrl_points[i+1].color ? ctrl_points[i+1].color : [0.0, 0.0, 1.0, 1.0];
      this.DrawPoint(gl, VP, ctrl_points[i+1], cl);
      cl = ctrl_points[i+2].color ? ctrl_points[i+2].color : [0.0, 1.0, 1.0, 1.0];
      this.DrawPoint(gl, VP, ctrl_points[i+2], cl);

      lines.push(ctrl_points[i-1][0], ctrl_points[i-1][1], ctrl_points[i][0], ctrl_points[i][1]);
      lines.push(ctrl_points[i+2][0], ctrl_points[i+2][1], ctrl_points[i+1][0], ctrl_points[i+1][1]);
    }
    this.DrawDebugLines(gl, VP, lines, [0.0, 0.0, 1.0, 1.0], gl.LINES);
  }

  DrawBBox(gl, VP) {
    let bbox = this.bezier.BBox();
    //console.log(bbox);
    let lines = [];
    lines.push(bbox[0].min, bbox[1].min); // bottom left
    lines.push(bbox[0].min, bbox[1].max); // bottom right
    lines.push(bbox[0].max, bbox[1].max); // top right
    lines.push(bbox[0].max, bbox[1].min); // top left
    lines.push(bbox[0].min, bbox[1].min); // bottom left
    this.DrawDebugLines(gl, VP, lines, [0.0, 0.0, 1.0, 1.0], gl.LINE_STRIP);
  }

  DrawPoint(gl, VP, pt, color) {
    gl.useProgram(BezierRenderer.program);
    // Set MVP
    var M = mat4.create();
    mat4.translate(M, M, [pt[0], pt[1], 0.0]);
    mat4.scale(M, M, [0.02, 0.02, 1.0]);
    var MVP = mat4.create();
    mat4.multiply(MVP, VP, M);
    gl.uniformMatrix4fv(BezierRenderer.program.uniformMVP, false, MVP);
    // Set color
    gl.uniform4fv(BezierRenderer.program.uniform_color, color);
    // Set vertex attrib
    gl.enableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, BezierRenderer.point_vertex_pos_buffer);
    gl.vertexAttribPointer(BezierRenderer.program.vertexPositionAttribute, BezierRenderer.point_vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, BezierRenderer.point_vertex_pos_buffer.numItems);

    gl.disableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
  }

  DrawLines(gl, VP, color) {
    gl.useProgram(BezierRenderer.program);
    // Set MVP
    var M = mat4.create();
    var MVP = mat4.create();
    mat4.multiply(MVP, VP, M);
    gl.uniformMatrix4fv(BezierRenderer.program.uniformMVP, false, MVP);
    // Set color
    gl.uniform4fv(BezierRenderer.program.uniform_color, color);
    // Set vertex attrib
    gl.enableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.line_vertex_pos_buffer);
    gl.vertexAttribPointer(BezierRenderer.program.vertexPositionAttribute, this.line_vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.line_vertex_pos_buffer.numItems);

    gl.disableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
  }
  DrawDebugLines(gl, VP, lines, color, primitive) {
      // Create debig buffer if necessary
    if(!this.debug_line_vertex_pos_buffer)
      this.debug_line_vertex_pos_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.debug_line_vertex_pos_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    this.debug_line_vertex_pos_buffer.itemSize = 2;
    this.debug_line_vertex_pos_buffer.numItems = lines.length/2;

    gl.useProgram(BezierRenderer.program);

    // Set MVP
    var M = mat4.create();
    var MVP = mat4.create();
    mat4.multiply(MVP, VP, M);
    gl.uniformMatrix4fv(BezierRenderer.program.uniformMVP, false, MVP);
    // Set color
    gl.uniform4fv(BezierRenderer.program.uniform_color, color);
    // Set vertex attrib
    gl.enableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.debug_line_vertex_pos_buffer);
    gl.vertexAttribPointer(BezierRenderer.program.vertexPositionAttribute, this.debug_line_vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(primitive, 0, this.debug_line_vertex_pos_buffer.numItems);

    gl.disableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
  }

  Retesselate(gl) {
    var tesselation_points = this.bezier.GetLUT();
    var normals = this.bezier.GetNormals();
    var vertices = [];
    var thickness = 0.005;
    for(var i = 0 ; i < tesselation_points.length ; i++) {
      var pt_neg = vec2.create();
      var vec_to_add = vec2.create();
      vec2.scale(vec_to_add, normals[i], thickness);
      vec2.negate(vec_to_add, vec_to_add);
      vec2.add(pt_neg, tesselation_points[i], vec_to_add);
      vertices.push(pt_neg[0]);
      vertices.push(pt_neg[1]);

      var pt_pos = vec2.create();
      vec2.scale(vec_to_add, normals[i], thickness);
      vec2.add(pt_pos, tesselation_points[i], vec_to_add);
      vertices.push(pt_pos[0]);
      vertices.push(pt_pos[1]);
    }

    // Create the buffer if necessary
    if(!this.line_vertex_pos_buffer)
      this.line_vertex_pos_buffer = gl.createBuffer();
    // Load the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.line_vertex_pos_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    this.line_vertex_pos_buffer.itemSize = 2;
    this.line_vertex_pos_buffer.numItems = vertices.length/2;
  }

  static InitGl(gl) {
    // Create our buffers
    BezierRenderer.point_vertex_pos_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, BezierRenderer.point_vertex_pos_buffer);
    var vertices = [
      0.5, 0.5,
      -0.5, 0.5,
      0.5, -0.5,
      -0.5, -0.5,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    BezierRenderer.point_vertex_pos_buffer.itemSize = 2;
    BezierRenderer.point_vertex_pos_buffer.numItems = 4;
    BezierRenderer.ReloadShader(gl);
  }

  static ReloadShader(gl) {
    if (BezierRenderer.program)
      gl.deleteProgram(BezierRenderer.program);
    var fragmentShader = BezierRenderer.getShader(gl, "shader-fs");
    var vertexShader = BezierRenderer.getShader(gl, "shader-vs");
    BezierRenderer.program = gl.createProgram();
    gl.attachShader(BezierRenderer.program, vertexShader);
    gl.attachShader(BezierRenderer.program, fragmentShader);
    gl.linkProgram(BezierRenderer.program);
    BezierRenderer.program.vertexPositionAttribute = gl.getAttribLocation(BezierRenderer.program, "aVertexPosition");
    BezierRenderer.program.uniformMVP = gl.getUniformLocation(BezierRenderer.program, "MVP");
    BezierRenderer.program.uniform_color = gl.getUniformLocation(BezierRenderer.program, "color");
    if (!gl.getProgramParameter(BezierRenderer.program, gl.LINK_STATUS)) {
      alert("Shader error !");
    }
  }

  static getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
      console.log("element id: " + id + " not found in the page");
      return null;
    }

    var shader;
    if (id.endsWith("fs")) {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (id.endsWith("vs")) {
      shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      return null;
    }

    gl.shaderSource(shader, shaderScript.value);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }
}

class Renderer {
  constructor(canva) {
    console.log(canva);
    this.canva = canva;
    this.gl = this.canva.getContext("webgl2");
    this.gl.viewportWidth = this.canva.width;
    this.gl.viewportHeight = this.canva.height;
    console.log("Viewport width in px = " + this.gl.viewportWidth);
    this.camera_center = vec2.fromValues(0, 0);
    this.bezier_lines = [];
  }

  Clear() {
    this.bezier_lines = [];
  }

  AddBezierLine(line) {
    let br = new BezierRenderer(line)
    this.bezier_lines.push(br);
    return br;
  }

  RemoveBezierLine(bezier_line) {
    var index = -1;
    for(var i = 0 ; i < this.bezier_lines.length ; i++) {
      if(this.bezier_lines[i].bezier == bezier_line) {
        index = i;
        break;
      }
    }
    if(index == -1)
      return;
    this.bezier_lines.splice(index, 1);
  }

  Init() {
    var gl = this.gl;

    // Projection matrix
    this.P = mat4.create();
    //mat4.perspective(this.P, glMatrix.toRadian(45.0), 1.0, 0.1, 100.0);
    mat4.ortho(this.P, -0.5, 0.5, -0.5, 0.5, 0.1, 100.0);
    // View matrix
    this.V = mat4.create();
    mat4.lookAt(this.V,
      [0, 0, 3], // Camera pos
      [0, 0, 0], // looks at
      [0, 1, 0]);  // Head
    this.VP = mat4.create();
    mat4.multiply(this.VP, this.P, this.V);

    gl.clearColor(0.05, 0.05, 0.3, 1.0);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    BezierRenderer.InitGl(gl);
    this.startTime = Date.now() / 1000.0;
  }

  SetCameraCenter(pos) {
    this.camera_center = pos;
    this.V = mat4.create();
    mat4.lookAt(this.V,
      [pos[0], pos[1], 3], // Camera pos
      [pos[0], pos[1], 0], // looks at
      [0, 1, 0]);  // Head
    mat4.multiply(this.VP, this.P, this.V);
  }

  GetCameraCenter() {
    return this.camera_center;
  }

  ToWorldCoordinate(pos) {
    var input = vec3.fromValues(pos[0], pos[1], 0.0);
    var viewport = vec4.fromValues(0.0, 0.0, this.gl.viewportWidth, this.gl.viewportHeight);
    var res = vec3.unproject(input, this.V, this.P, viewport);
    return vec2.fromValues(res[0], res[1]);
  }

  ReloadShader() {
    BezierRenderer.ReloadShader(this.gl);
  }

  updateTexture(imgdata) {
    console.log("Renderer.updateTexture");
    var gl = this.gl;

    if (this.tex)
      gl.deleteTexture(this.tex);
    this.tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgdata);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  draw() {
    var gl = this.gl;
    var now = Date.now() / 1000.0 - this.startTime;
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (var i = 0; i < this.bezier_lines.length; i++) {
      this.bezier_lines[i].Draw(gl, this.VP);
    }
  }

  DrawDebugLines(lines, color) {
    var gl = this.gl;
    var VP = this.VP;
    if(!this.debug_line_vertex_pos_buffer) {
      // Create the buffer
      this.debug_line_vertex_pos_buffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.debug_line_vertex_pos_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    this.debug_line_vertex_pos_buffer.itemSize = 2;
    this.debug_line_vertex_pos_buffer.numItems = lines.length/2;

    gl.useProgram(BezierRenderer.program);

    // Set MVP
    var M = mat4.create();
    var MVP = mat4.create();
    mat4.multiply(MVP, VP, M);
    gl.uniformMatrix4fv(BezierRenderer.program.uniformMVP, false, MVP);
    // Set color
    gl.uniform4fv(BezierRenderer.program.uniform_color, color);
    // Set vertex attrib
    gl.enableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.debug_line_vertex_pos_buffer);
    gl.vertexAttribPointer(BezierRenderer.program.vertexPositionAttribute, this.debug_line_vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.LINES, 0, this.debug_line_vertex_pos_buffer.numItems);

    gl.disableVertexAttribArray(BezierRenderer.program.vertexPositionAttribute);
  }
}

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

var canva = null;
var renderer = null;
var last_time = -1;
var editor = null;
var audio_controls = null;

document.addEventListener('DOMContentLoaded', function() {
  canva = document.getElementById("canva"); 
  audio_controls = document.getElementById("audio-track-controls"); 
  renderer = new Renderer(canva);
  renderer.Init();
  editor = new Editor(renderer);

  var refreshShaderButton = document.getElementById("refresh_shader");
  refreshShaderButton.onclick = (function(rd) { return function(){rd.ReloadShader();};}(renderer));

  // Start the main loop
  last_time = Date.now();
  mainLoop();
}, false);

function mouseMove(evt) {
  var pt = vec2.fromValues(evt.offsetX, 512-evt.offsetY);
  var data = {
    delta: vec2.fromValues(evt.movementX, evt.movementY),
    absolute: renderer.ToWorldCoordinate(pt)
  };
  vec2.div(data.delta, data.delta, vec2.fromValues(canva.width, canva.height));
  data.delta[1] *= -1;
  editor.MouseMove(data);
}

function mouseUp(evt) {
  var pt = vec2.fromValues(evt.offsetX, 512-evt.offsetY);
  pt = renderer.ToWorldCoordinate(pt);
  editor.MouseUp(pt);
}

function mouseDown(evt) {
  if(evt.button != 0)
    return;
  // Set the 0,0 to bottom left:
  var pt = vec2.fromValues(evt.offsetX, 512-evt.offsetY);
  // convert from screenspace to world coordinate
  pt = renderer.ToWorldCoordinate(pt);
  editor.MouseDown(pt);
}

function mouseWheel(evt) {
  editor.MouseWheel(-evt.deltaY);
  // Prevent the default behavior
  if (!event) event = window.event;
  event.returnValue = false;
  if (event.preventDefault)event.preventDefault();
  return false;
}

function keyPress(evt) {
  editor.KeyPress(evt);
}

function onSliderChange(value) {
  console.log("position in %: " + value);
  var world_size = document.getElementById("world_size").value;
  console.log("Size world: " + world_size);
  camera_y = world_size*value;
  var camera_center = [0.0, camera_y];
  console.log("Camera position should be: " + camera_center);
  renderer.SetCameraCenter(camera_center);
}

function playClicked() {
  console.log("Play button clicked");
  editor.UiEvent(UiActions.PLAY);
}

function pauseClicked() {
  console.log("Pause button clicked");
  editor.UiEvent(UiActions.PAUSE);
}

function trackDurationChanged() {
  editor.track_length_ms = audio_controls.duration * 1000.0;
}

function onTrackSelected(evt) {
  console.log("Track selected");
  var target = evt.currentTarget;
  var file = target.files[0];
  var reader = new FileReader();
  
  if (target.files && file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      audio_controls.setAttribute('src', e.target.result);
    }
    reader.readAsDataURL(file);
  }
}

function trackSeeked() {
  console.log("Track seeked");
  var percent = audio_controls.currentTime/audio_controls.duration;
  document.getElementById("slider_world").value = percent;
  onSliderChange(percent);
}

function debugDrawToggled(checkbox) {
  editor.UiEvent(checkbox.checked?UiActions.SHOW_DEBUG:UiActions.HIDE_DEBUG);
}

function dropHandler(ev) {
  console.log('File(s) dropped');
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        console.log('... file[' + i + '].name = ' + file.name);
        this.DroppedFile(file);
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      var file = ev.dataTransfer.files[i];
      console.log('... file[' + i + '].name = ' + file.name);
      this.DroppedFile(file);
    }
  } 
  
  // Pass event to removeDragData for cleanup
  removeDragData(ev)
}

function DroppedFile(file) {
  if(file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2) == "bin") {
    console.log("Dropped .bin file of size: " + file.size);
    editor.Clear();
    var read = new FileReader();
    read.onloadend = function(){
      console.log("Content size in bytes: " + read.result.byteLength);
      editor.Load(new Uint8Array(read.result));
    }
    read.readAsArrayBuffer(file);
  }
}

function removeDragData(ev) {
  console.log('Removing drag data')
  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to remove the drag data
    ev.dataTransfer.items.clear();
  } else {
    // Use DataTransfer interface to remove the drag data
    ev.dataTransfer.clearData();
  }
}

function dragOverHandler(ev) {
  console.log('File(s) in drop zone'); 
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

function mainLoop() {
  var now = Date.now();
  var delta_ms = now - last_time;
  last_time = now;
  editor.Tick(delta_ms);
  window.setTimeout(function (rend) { return function () { mainLoop(); }; }(this), 1000 / 60);
}

vec3.unproject = function (vec, view, proj, viewport) {

  var dest = vec3.create();//output
  var m = mat4.create();//view * proj
  var im = mat4.create();//inverse view proj
  var v = vec4.create();//vector
  var tv = vec4.create();//transformed vector
  
  //apply viewport transform
  v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
  v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
  v[2] = vec[2];
  v[3] = 1.0;
  
  //build and invert viewproj matrix
  mat4.multiply(m,proj,view);
  if(!mat4.invert(im,m)) { return null; }
  
  vec4.transformMat4(tv,v,im);
  if(v[3] === 0.0) { return null; }
  
  dest[0] = tv[0] / tv[3];
  dest[1] = tv[1] / tv[3];
  dest[2] = tv[2] / tv[3];
  
  return dest;
};