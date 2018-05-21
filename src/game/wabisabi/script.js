class BezierLine {
  constructor(p0, p0_cp, p1, p1_cp) { // cp stand for control point
    this.points = [p0, p1];
    this.control_points = [vec2.fromValues(0.0, 0.0), p0_cp, p1_cp, vec2.fromValues(0.0, 0.0)];
    this.subdivisions = 200;

    this.M = mat4.create();
  }

  AddPoint(index, point, control_point_left, control_point_right) {
    this.points.splice(index, 0, point);
    this.control_points.splice(index*2, 0, control_point_left);
    this.control_points.splice(index*2+1, 0, control_point_right);
  }

  static InitGl(gl) {
    // Create our buffers
    BezierLine.point_vertex_pos_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, BezierLine.point_vertex_pos_buffer);
    var vertices = [
      0.5, 0.5,
      -0.5, 0.5,
      0.5, -0.5,
      -0.5, -0.5,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    BezierLine.point_vertex_pos_buffer.itemSize = 2;
    BezierLine.point_vertex_pos_buffer.numItems = 4;

    BezierLine.ReloadShader(gl);
  }

  static ReloadShader(gl) {
    if (BezierLine.program)
      gl.deleteProgram(BezierLine.program);
    var fragmentShader = BezierLine.getShader(gl, "shader-fs");
    var vertexShader = BezierLine.getShader(gl, "shader-vs");
    BezierLine.program = gl.createProgram();
    gl.attachShader(BezierLine.program, vertexShader);
    gl.attachShader(BezierLine.program, fragmentShader);
    gl.linkProgram(BezierLine.program);
    BezierLine.program.vertexPositionAttribute = gl.getAttribLocation(BezierLine.program, "aVertexPosition");
    BezierLine.program.uniformMVP = gl.getUniformLocation(BezierLine.program, "MVP");
    BezierLine.program.uniform_color = gl.getUniformLocation(BezierLine.program, "color");
    if (!gl.getProgramParameter(BezierLine.program, gl.LINK_STATUS)) {
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

  SetSubdivision(count) {
    this.subdivisions = count;
  }

  Draw(gl, VP) {
    var lines = [];
    for(var i = 0 ; i < this.control_points.length ; i++){
      if(this.control_points[i][0] == 0 && this.control_points[i][1] == 0)
        continue;
      var ctrl_p = vec2.create();
      vec2.add(ctrl_p, this.points[Math.floor(i/2)], this.control_points[i]);
      this.DrawPoint(gl, VP, ctrl_p, [0.0, 0.0, 1.0, 1.0]);
      lines.push(this.points[Math.floor(i/2)][0], this.points[Math.floor(i/2)][1]);
      lines.push(ctrl_p[0], ctrl_p[1]);
    }
    this.DrawDebugLines(gl, VP, lines, [0.0, 0.0, 1.0, 1.0]);

    this.Retesselate(gl);
    /*for(var i = 0 ; i < this.tesselation_points.length ; i++) {
      this.DrawPoint(gl, VP, this.tesselation_points[i], [0.2, 0.2, 0.2, 1.0]);
    }*/

    for(var i = 0 ; i < this.points.length ; i++){
      var cl = this.points[i].color ? this.points[i].color : [0.0, 1.0, 1.0, 1.0];
      this.DrawPoint(gl, VP, this.points[i], cl);
    }

    this.DrawLines(gl, VP, [1.0, 1.0, 1.0, 1.0]);
  }

  DrawPoint(gl, VP, pt, color) {
    gl.useProgram(BezierLine.program);
    // Set MVP
    var M = mat4.create();
    mat4.translate(M, M, [pt[0], pt[1], 0.0]);
    mat4.scale(M, M, [0.02, 0.02, 1.0]);
    var MVP = mat4.create();
    mat4.multiply(MVP, VP, M);
    gl.uniformMatrix4fv(BezierLine.program.uniformMVP, false, MVP);
    // Set color
    gl.uniform4fv(BezierLine.program.uniform_color, color);
    // Set vertex attrib
    gl.enableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, BezierLine.point_vertex_pos_buffer);
    gl.vertexAttribPointer(BezierLine.program.vertexPositionAttribute, BezierLine.point_vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, BezierLine.point_vertex_pos_buffer.numItems);

    gl.disableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
  }

  DrawDebugLines(gl, VP, lines, color) {
    if(!this.debug_line_vertex_pos_buffer) {
      // Create the buffer
      this.debug_line_vertex_pos_buffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.debug_line_vertex_pos_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    this.debug_line_vertex_pos_buffer.itemSize = 2;
    this.debug_line_vertex_pos_buffer.numItems = lines.length/2;

    gl.useProgram(BezierLine.program);

    // Set MVP
    var M = mat4.create();
    var MVP = mat4.create();
    mat4.multiply(MVP, VP, M);
    gl.uniformMatrix4fv(BezierLine.program.uniformMVP, false, MVP);
    // Set color
    gl.uniform4fv(BezierLine.program.uniform_color, color);
    // Set vertex attrib
    gl.enableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.debug_line_vertex_pos_buffer);
    gl.vertexAttribPointer(BezierLine.program.vertexPositionAttribute, this.debug_line_vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.LINES, 0, this.debug_line_vertex_pos_buffer.numItems);

    gl.disableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
  }

  DrawLines(gl, VP, color) {
    gl.useProgram(BezierLine.program);
    // Set MVP
    var M = mat4.create();
    var MVP = mat4.create();
    mat4.multiply(MVP, VP, M);
    gl.uniformMatrix4fv(BezierLine.program.uniformMVP, false, MVP);
    // Set color
    gl.uniform4fv(BezierLine.program.uniform_color, color);
    // Set vertex attrib
    gl.enableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.line_vertex_pos_buffer);
    gl.vertexAttribPointer(BezierLine.program.vertexPositionAttribute, this.line_vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.line_vertex_pos_buffer.numItems);

    gl.disableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
  }

  Retesselate(gl) {
    this.tesselation_points = [];
    this.perpendicular_vectors = [];
    for(var p = 0 ; p < this.points.length-1 ; p++) {
      for (var i = 0 ; i < this.subdivisions ; i++) { 
        var t = i / (this.subdivisions - 1);
        var p0 = this.points[p];
        var p1 = this.points[p+1];
        var cp0 = this.control_points[2*p+1];
        var cp1 = this.control_points[2*(p+1)];
        
        this.tesselation_points.push(this.BezierAt(t, p0, p1, cp0, cp1));
        this.perpendicular_vectors.push(this.BezierPerpAt(t, p0, p1, cp0, cp1));
      }
    }
    this.GenerateStrip(gl);
  }

  BezierAt(t, pt0, pt1, cpt0, cpt1) {
    var nt = 1.0 - t;
  
    var tmp0 = vec2.create();
    vec2.add(tmp0, pt0, cpt0);
    var tmp1 = vec2.create();
    vec2.add(tmp1, pt1, cpt1);

    var pts = [pt0
                , tmp0
                , tmp1
                , pt1];
    var scalars = [nt*nt*nt, 3.0*nt*nt*t, 3.0*nt*t*t, t*t*t];
    var res = pts.reduce(function(prev, curr, i) {
      var tmp = vec2.create();
      vec2.scale(tmp, curr, scalars[i])
      vec2.add(prev, prev, tmp);
      return prev;
    }, vec2.create());
	
		return res;
  }

  BezierPerpAt(t, pt0, pt1, cpt0, cpt1) {
    var nt = 1.0 - t;

    var tmp0 = vec2.create();
    vec2.add(tmp0, pt0, cpt0);
    var tmp1 = vec2.create();
    vec2.add(tmp1, pt1, cpt1);
    var pts = [pt0
                , tmp0
                , tmp1
                , pt1];
    
		var scalars = [-3.0*nt*nt, 3.0*(1.0 - 4.0*t + 3.0*t*t), 3.0*(2.0*t - 3.0*t*t), 3.0*t*t];
		var value = pts.reduce(function(prev, curr, i) {
      var tmp = vec2.create();
      vec2.scale(tmp, curr, scalars[i]);
      vec2.add(prev, prev, tmp);
			return prev;
		}, vec2.create());
  
    vec2.normalize(value, value);
    return vec2.fromValues(-value[1], value[0]);
  }

  GenerateStrip(gl) {
    var vertices = [];
    var thickness = 0.005;
    for(var i = 0 ; i < this.tesselation_points.length ; i++) {
      var pt_neg = vec2.create();
      var vec_to_add = vec2.create();
      vec2.scale(vec_to_add, this.perpendicular_vectors[i], thickness);
      vec2.negate(vec_to_add, vec_to_add);
      vec2.add(pt_neg, this.tesselation_points[i], vec_to_add);
      vertices.push(pt_neg[0]);
      vertices.push(pt_neg[1]);

      var pt_pos = vec2.create();
      vec2.scale(vec_to_add, this.perpendicular_vectors[i], thickness);
      vec2.add(pt_pos, this.tesselation_points[i], vec_to_add);
      vertices.push(pt_pos[0]);
      vertices.push(pt_pos[1]);
    }

    if(!this.line_vertex_pos_buffer) {
      // Create the buffer
      this.line_vertex_pos_buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.line_vertex_pos_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      this.line_vertex_pos_buffer.itemSize = 2;
      this.line_vertex_pos_buffer.numItems = vertices.length/2;
    } else {
      // Update the buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.line_vertex_pos_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      this.line_vertex_pos_buffer.itemSize = 2;
      this.line_vertex_pos_buffer.numItems = vertices.length/2;
    }
  }

  Collide(pt) {
    var squared_delta = 0.0004;
    for(var p = 0 ; p < this.points.length ; p++) {
      if(vec2.sqrDist(pt, this.points[p]) <= squared_delta)
        return this.points[p];

      for(var cp = 0 ; cp < 2 ; cp++) {
        if(this.control_points[2*p+cp][0] == 0 && this.control_points[2*p+cp][1] == 0)
          continue;
        var ctrl_p = vec2.create();
        vec2.add(ctrl_p, this.points[p], this.control_points[2*p+cp]);
        if(vec2.sqrDist(pt, ctrl_p) <= squared_delta)
          return this.control_points[2*p+cp];
      }
    }
    return null;
  }

  MouseDown(pos) {
    var new_selection = this.Collide(pos);

    if(new_selection && new_selection != this.selected) {
      new_selection.color = [1.0,1.0,0.0,1.0];
      if(this.selected)
        this.selected.color = this.selected.default_color;
      this.selected = new_selection;
    }
    if(!new_selection) {
      if(this.selected)
        this.selected.color = null;
      this.selected = null;
    }

    if(this.selected) {
      this.mouse_down = true;
      return this;
    } else
      return null;
  }
  MouseMove(delta_pos) {
    if(this.selected && this.mouse_down)
      vec2.add(this.selected, this.selected, delta_pos);
    return this;
  }
  MouseUp(pos) {
    this.mouse_down = false;
    return this;
  }
}

class Renderer {
  constructor() {
    this.canva = document.getElementById("canva");
    try {
      this.gl = this.canva.getContext("webgl2");
      this.gl.viewportWidth = this.canva.width;
      this.gl.viewportHeight = this.canva.height;
    } catch (e) {
      alert("WebGL error!");
    }
    this.bezier_lines = [];
    var bezier_line = new BezierLine(vec2.fromValues(-0.1, -0.05), vec2.fromValues(0.2, 0), vec2.fromValues(0.25, 0), vec2.fromValues(0, -0.25));
    bezier_line.AddPoint(1, vec2.fromValues(0.0, 0.15), vec2.fromValues(-0.1, -0.10),vec2.fromValues(0.1, 0.10))
    this.bezier_lines.push(bezier_line);
    
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

    BezierLine.InitGl(gl);

    this.startTime = Date.now() / 1000.0;
    this.isDrawing = false;
  }

  MouseMove(delta) {
    if(!this.selection)
      return;
    vec2.div(delta, delta, vec2.fromValues(this.canva.width, this.canva.height));
    delta[1] *= -1;
    this.selection = this.selection.MouseMove(delta);
  }

  MouseUp(pt) {
    if(!this.selection)
      return;
    vec2.div(pt, pt, vec2.fromValues(this.canva.width, this.canva.height));
    vec2.sub(pt, pt, [0.5, 0.5]);
    this.selection = this.selection.MouseUp(pt);
  }

  MouseDown(pt) {
    vec2.div(pt, pt, vec2.fromValues(this.canva.width, this.canva.height));
    vec2.sub(pt, pt, [0.5, 0.5]);
    console.log("MouseDown: [" + pt[0] + ", " + pt[1] + "]");

    for (var i = 0; i < this.bezier_lines.length; i++) {
      this.selection = this.bezier_lines[i].MouseDown(pt);
      if(this.selection)
        break;
    }
  }

  startDrawing() {
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.draw();
    }
  }

  ReloadShader() {
    BezierLine.ReloadShader(this.gl);
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
    window.setTimeout(function (rend) { return function () { rend.draw(); }; }(this), 1000 / 60);
  }
}

var data_channel = [];
var renderer = new Renderer();
renderer.Init();

var refreshShaderButton = document.getElementById("refresh_shader");
refreshShaderButton.onclick = (function(rd) { return function(){rd.ReloadShader();};}(renderer));

function mouseMove(evt) {
  // Set the 0,0 to bottom left:
  var pt = vec2.fromValues(evt.movementX, evt.movementY);
  renderer.MouseMove(pt);
}

function mouseUp(evt) {
  //if(evt.button != 0)
  //  return;
  // Set the 0,0 to bottom left:
  var pt = vec2.fromValues(evt.offsetX, 512-evt.offsetY);
  console.log("mouseUp: [" + pt[0] + ", " + pt[1] + "]");
  renderer.MouseUp(pt);
}

function mouseDown(evt) {
  if(evt.button != 0)
    return;
  // Set the 0,0 to bottom left:
  var pt = vec2.fromValues(evt.offsetX, 512-evt.offsetY);
  //console.log("mouseDown: [" + pt[0] + ", " + pt[1] + "]");
  renderer.MouseDown(pt);
}

renderer.startDrawing();