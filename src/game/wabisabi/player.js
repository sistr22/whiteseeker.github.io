class Player {
    constructor(gl) {
        this.radius = 0.020;
        this.subdivisions = 90; // circle has 90 point on it's outline, 1 every 4 degree.
        this.pos = vec2.fromValues(0,0);
        this.Retesselate(gl);
    }

    Retesselate(gl) {
        this.vertices = [];
        // Push circle's center in [0,0]
        this.vertices.push(0);
        this.vertices.push(0);
        for(var i = 0 ; i <= this.subdivisions ; i++) {
            var angle = i*Math.PI*2/this.subdivisions;
            this.vertices.push(Math.cos(angle)*this.radius);
            this.vertices.push(Math.sin(angle)*this.radius);
        }

        if(!this.vertex_pos_buffer) {
          // Create the buffer
          this.vertex_pos_buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_pos_buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
          this.vertex_pos_buffer.itemSize = 2;
          this.vertex_pos_buffer.numItems = this.vertices.length/2;
        } else {
          // Update the buffer
          gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_pos_buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
          this.vertex_pos_buffer.itemSize = 2;
          this.vertex_pos_buffer.numItems = this.vertices.length/2;
        }
    }

    SetPosition(vec2Pos) {
      this.pos = vec2Pos;
    }
    GetPosition() {
      return this.pos;
    }

    Draw(gl, VP, color) {
      gl.useProgram(BezierLine.program);
      // Set MVP
      var M = mat4.create();
      mat4.translate(M, M, vec3.fromValues(this.pos[0], this.pos[1], 0.0));
      var MVP = mat4.create();
      mat4.multiply(MVP, VP, M);
      gl.uniformMatrix4fv(BezierLine.program.uniformMVP, false, MVP);
      // Set color
      gl.uniform4fv(BezierLine.program.uniform_color, color);
      // Set vertex attrib
      gl.enableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_pos_buffer);
      gl.vertexAttribPointer(BezierLine.program.vertexPositionAttribute, this.vertex_pos_buffer.itemSize, gl.FLOAT, false, 0, 0);
      
      gl.drawArrays(gl.TRIANGLE_FAN, 0, this.vertex_pos_buffer.numItems);

      gl.disableVertexAttribArray(BezierLine.program.vertexPositionAttribute);
    }
}