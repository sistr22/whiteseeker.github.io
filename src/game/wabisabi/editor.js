// IndexedDB
window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
    IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
    dbVersion = 1;


class Editor {
  constructor(renderer) {
    this.state = new StateIdle();
    this.bezier_lines = [];
    this.renderer = renderer;
    this.track_length_ms = 5000;

    var request = indexedDB.open("saveFiles", dbVersion);
    this.db = null;
    var thiz = this;
    request.onsuccess = function (event) {
      console.log("Success creating/accessing IndexedDB database");
      thiz.db = event.target.result;
      thiz.db.onerror = function (event) {
          console.log("Error creating/accessing IndexedDB database");
      };
      thiz.LoadLocal();
    };
    request.onupgradeneeded = function(event) { 
      console.log("upgrade needed IndexedDB database");
      // Save the IDBDatabase interface 
      thiz.db = event.target.result;
      // Create an objectStore for this database
      var objectStore = thiz.db.createObjectStore("level");
    };
  }

  RemoveBezierLine(bezier_line) {
    var index = this.bezier_lines.indexOf(bezier_line);
    if(index == -1)
      return;
    this.bezier_lines.splice(index, 1);
    this.renderer.RemoveBezierLine(bezier_line);
  }

  SetState(new_state) {
    if (new_state != null) {
      this.Save();
      console.log("New state: " + new_state.constructor.name);
      this.state = new_state;
    }
  }

  Tick(delta_ms) {
    this.SetState(this.state.Tick(this, delta_ms));
    var lines = [];
    var percent = audio_controls.currentTime/audio_controls.duration;
    if(percent > 1.0)
      percent = 1.0;
    var world_size = document.getElementById("world_size").value;
    lines.push(-0.5, world_size*percent);
    lines.push(0.5, world_size*percent);
    this.renderer.draw();
    this.renderer.DrawDebugLines(lines, [0.4, 0.4, 0.4, 1.0]);
  }

  MouseDown(pos) {
    this.SetState(this.state.MouseDown(this, pos));
  }

  MouseUp(pos) {
    this.SetState(this.state.MouseUp(this, pos));
  }

  MouseMove(delta_pos) {
    this.SetState(this.state.MouseMove(this, delta_pos));
  }

  MouseWheel(delta) {
    var world_size = Number(document.getElementById("world_size").value);
    var camera_y = this.renderer.GetCameraCenter()[1] + delta/100.0;
    if(camera_y < 0)
      camera_y = 0;
    if(camera_y > world_size)
      camera_y = world_size;
    var camera_center = [0.0, camera_y];
    this.renderer.SetCameraCenter(camera_center);

    // Update the slider
    var pos_slider = camera_y/world_size;
    document.getElementById("slider_world").value = pos_slider;
  }

  KeyPress(evt) {
    this.SetState(this.state.KeyPress(this, evt));
  }

  KeyUp(evt) {
    this.SetState(this.state.KeyUp(this, evt));
  }

  KeyDown(evt) {
    this.SetState(this.state.KeyDown(this, evt));
  }

  UiEvent(evt) {
    this.SetState(this.state.UiEvent(this, evt));
  }

  Save() {
    var builder = new flatbuffers.Builder(1024);

    var obstacles = [];
    for(var b = 0 ; b < this.bezier_lines.length ; b++) {;
      var bezier_line = this.bezier_lines[b];
      var points = [];
      for(var pt = 0 ; pt < bezier_line.points.length ; pt++) {
        Wabisabi.Vec2.startVec2(builder);
        Wabisabi.Vec2.addX(builder, bezier_line.points[pt][0]);
        Wabisabi.Vec2.addY(builder, bezier_line.points[pt][1]);
        points.push(Wabisabi.Vec2.endVec2(builder));
      }
      var flat_pts = Wabisabi.Bezier.createPointsVector(builder, points);

      var control_points = [];
      for(var pt = 0 ; pt < bezier_line.control_points.length ; pt++) {
        Wabisabi.Vec2.startVec2(builder);
        Wabisabi.Vec2.addX(builder, bezier_line.control_points[pt][0]);
        Wabisabi.Vec2.addY(builder, bezier_line.control_points[pt][1]);
        control_points.push(Wabisabi.Vec2.endVec2(builder));
      }
      var flat_ctrl_pts = Wabisabi.Bezier.createControlPointsVector(builder, control_points);

      Wabisabi.Bezier.startBezier(builder);
      Wabisabi.Bezier.addPoints(builder, flat_pts);
      Wabisabi.Bezier.addControlPoints(builder, flat_ctrl_pts);
      obstacles.push(Wabisabi.Bezier.endBezier(builder));
    }
    
    var flat_obstacles = Wabisabi.Level.createObstaclesVector(builder, obstacles);

    Wabisabi.Level.startLevel(builder);
    Wabisabi.Level.addWorldSize(builder, document.getElementById("world_size").value);
    Wabisabi.Level.addObstacles(builder, flat_obstacles);
    var level = Wabisabi.Level.endLevel(builder);
    builder.finish(level);
    var buf = builder.asUint8Array();

    // Open a transaction to the database
    var transaction = this.db.transaction("level", "readwrite");
    // Put the blob into the dabase
    var put = transaction.objectStore("level").put(buf, "current_level");
  }
  
  LoadLocal() {
    var thiz = this;
    var transaction = this.db.transaction("level", "readwrite");
    // Retrieve the file that was just stored
    transaction.objectStore("level").get("current_level").onsuccess = function (event) {
      var buf = event.target.result;
      thiz.Load(buf);
    };
  }
  
  Load(buffer) {
    if(buffer != null && buffer instanceof Uint8Array) {
      console.log("buffer is a Uint8Array");
      var buf = new flatbuffers.ByteBuffer(buffer);
      var level = Wabisabi.Level.getRootAsLevel(buf);
      console.log("loaded world size: " + level.worldSize());
      document.getElementById("world_size").value = level.worldSize();
      console.log("Nb obstacles: " + level.obstaclesLength());
      // Load each bezier curves
      for(var j = 0 ; j < level.obstaclesLength() ; j++) {
        console.log("Load bezier curve: " + j);
        var obstacle = level.obstacles(j);
        var points = [];
        for(var i = 0 ; i < obstacle.pointsLength() ; i++) {
          var pt = obstacle.points(i);
          points.push(vec2.fromValues(pt.x(), pt.y()));
        }
        var ctrl_points = [];
        for(var i = 0 ; i < obstacle.controlPointsLength() ; i++) {
          var pt = obstacle.controlPoints(i);
          ctrl_points.push(vec2.fromValues(pt.x(), pt.y()));
        }
        var line = new BezierLine(points, ctrl_points);
        this.renderer.AddBezierLine(line);
        this.bezier_lines.push(line);
      }
    } else {
      console.log("buffer is not a Uint8Array");
    }
  }
}