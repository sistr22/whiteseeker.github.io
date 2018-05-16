class BezierLine {
  constructor(p0, p0_cp, p1, p1_cp) { // cp stand for control point
    this.points = [p0, p1];
    this.control_points = [p0_cp, p1_cp];
    this.subdivisions = 20;

    this.M = mat4.create();
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

    // Create our shader
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
    var ctrl_p0 = vec2.create();
    vec2.add(ctrl_p0, this.points[0], this.control_points[0]);
    this.DrawPoint(gl, VP, ctrl_p0, [0.0, 0.0, 1.0, 1.0]);
    var ctrl_p1 = vec2.create();
    vec2.add(ctrl_p1, this.points[1], this.control_points[1]);
    this.DrawPoint(gl, VP, ctrl_p1, [0.0, 0.0, 1.0, 1.0]);

    this.Retesselate(gl);
    for(var i = 0 ; i < this.tesselation_points.length ; i++) {
      this.DrawPoint(gl, VP, this.tesselation_points[i], [0.2, 0.2, 0.2, 1.0]);
    }
    for(var i = 0 ; i < this.perpendicular_vectors.length ; i++) {
      this.DrawPoint(gl, VP, this.perpendicular_vectors[i], [0.8, 0.0, 0.0, 1.0]);
    }

    this.DrawPoint(gl, VP, this.points[0], [0.0, 1.0, 1.0, 1.0]);
    this.DrawPoint(gl, VP, this.points[1], [0.0, 1.0, 1.0, 1.0]);

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
		for (var i = 0 ; i < this.subdivisions ; i++) { 
			var t = i / (this.subdivisions - 1);
			this.tesselation_points.push(this.BezierAt(t));
			this.perpendicular_vectors.push(this.BezierPerpAt(t));
    }
    this.GenerateStrip(gl);
  }

  BezierAt(t) {
    var nt = 1.0 - t;
  
    var tmp0 = vec2.create();
    vec2.add(tmp0, this.points[0], this.control_points[0]);
    var tmp1 = vec2.create();
    vec2.add(tmp1, this.points[1], this.control_points[1]);

    var pts = [this.points[0]
                , tmp0
                , tmp1
                , this.points[1]];
    var scalars = [nt*nt*nt, 3.0*nt*nt*t, 3.0*nt*t*t, t*t*t];
    var res = pts.reduce(function(prev, curr, i) {
      var tmp = vec2.create();
      vec2.scale(tmp, curr, scalars[i])
      vec2.add(prev, prev, tmp);
      return prev;
    }, vec2.create());
	
		return res;
  }

  BezierPerpAt(t) {
    var nt = 1.0 - t;

    var tmp0 = vec2.create();
    vec2.add(tmp0, this.points[0], this.control_points[0]);
    var tmp1 = vec2.create();
    vec2.add(tmp1, this.points[1], this.control_points[1]);
    var pts = [this.points[0]
                , tmp0
                , tmp1
                , this.points[1]];
    
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
    for(var p = 0 ; p < 2 ; p++) {
      if(vec2.sqrDist(pt, this.points[p]) <= squared_delta)
        return this.points[p];
      var ctrl_p = vec2.create();
      vec2.add(ctrl_p, this.points[p], this.control_points[p]);
      if(vec2.sqrDist(pt, ctrl_p) <= squared_delta)
        return this.control_points[p];
    }
    return null;
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
    this.bezier_lines.push(new BezierLine(vec2.fromValues(-0.1, -0.05), vec2.fromValues(0, 0.25), vec2.fromValues(0.25, 0), vec2.fromValues(0, -0.25)));
    this.selected_point = null;
  }

  Init() {
    var gl = this.gl;
    /*
    var imgData = new ImageData(512, 512);
    for (var x = 0; x < 512; x++) {
    for (var y = 0; y < 512; y++) {
    for (var chan = 0 ; chan < 4 ; chan++) {
    if (chan != 3) {
    imgData.data[4*(x + y*512)+chan] = 10;
    } else {
    imgData.data[4*(x + y*512)+chan] = 255;
    }
    }
    }
    }
    this.updateTexture(imgData);*/

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
    if(!this.selected_point)
      return;
    vec2.div(delta, delta, vec2.fromValues(this.canva.width, this.canva.height));
    delta[1] *= -1;
    this.selected_point[0] += delta[0];
    this.selected_point[1] += delta[1];
  }

  MouseUp(pt) {
    this.selected_point = null;
  }

  MouseDown(pt) {
    vec2.div(pt, pt, vec2.fromValues(this.canva.width, this.canva.height));
    vec2.sub(pt, pt, [0.5, 0.5]);
    console.log("MouseDown: [" + pt[0] + ", " + pt[1] + "]");

    for (var i = 0; i < this.bezier_lines.length; i++) {
      this.selected_point = this.bezier_lines[i].Collide(pt);
      if(this.selected_point)
        break;
    }
  }

  startDrawing() {
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.draw();
    }
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

    /*gl.uniformMatrix4fv(this.shaderProgram.uniformMVP, false, this.MVP);

    gl.uniform1f(this.shaderProgram.uniformTime, now);

    gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
    gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.squareVertexTextureCoordBuffer);
    gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.squareVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.shaderProgram.samplerUniform, 0);


    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);

    gl.disableVertexAttribArray(this.shaderProgram.textureCoordAttribute);
    gl.disableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);*/

    window.setTimeout(function (rend) { return function () { rend.draw(); }; }(this), 1000 / 60);
  }
}

var data_channel = [];
var renderer = new Renderer();
renderer.Init();

function mouseMove(evt) {
  // Set the 0,0 to bottom left:
  var pt = vec2.fromValues(evt.movementX, evt.movementY);
  renderer.MouseMove(pt);
}

function mouseUp(evt) {
  if(evt.button != 0)
    return;
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