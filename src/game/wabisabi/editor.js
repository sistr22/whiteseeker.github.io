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
    this.copy_slot = null;
    this.debug = true;
    this.player = new Player(renderer.gl);

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

    //var bezier_line_1 = new Bezier([[-0.2,0.0],[-0.2, 0.2],[0.2, -0.1],[0.2,0.0]]);
    //var bezier_line_2 = new Bezier([[0.2,0.0],[0.2, 0.1],[0.4, -0.1],[0.4,0.0]]);
    //this.bezier_line_2_renderer = new BezierRenderer(new MultiBezier(bezier_line_1, bezier_line_2));
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
      this.SaveLocally();
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
    if(this.debug) {
      this.renderer.drawDebug();
      //this.bezier_line_2_renderer.DrawDebug(this.renderer.gl, this.renderer.VP);
    } else {
      this.renderer.draw();
      //this.bezier_line_2_renderer.Draw(this.renderer.gl, this.renderer.VP);
    }
    this.renderer.DrawDebugLines(lines, [0.4, 0.4, 0.4, 1.0]);

    this.player.Draw(this.renderer.gl, this.renderer.VP, [0.4, 1.0, 0.0, 1.0]);
  }

  MouseDown(pos) {
    this.SetState(this.state.MouseDown(this, pos));
  }

  MouseUp(pos) {
    this.SetState(this.state.MouseUp(this, pos));
  }

  MouseMove(data) {
    this.SetState(this.state.MouseMove(this, data));
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
    if(evt == UiActions.SHOW_DEBUG) {
      this.debug = true;
    } else if(evt == UiActions.HIDE_DEBUG) {
      this.debug = false;
    } else
      this.SetState(this.state.UiEvent(this, evt));
  }

  Clear() {
    this.bezier_lines = [];
    this.renderer.Clear();
  }

  DownloadSave() {
    var buf = this.Save();
    console.log("Size save: " + buf.byteLength);
    var blob = new Blob([buf], {type: 'octet/stream'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, "level.bin");
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = "level.bin";        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
  }
  SaveLocally() {
    var buf = this.Save();
    // Open a transaction to the database
    var transaction = this.db.transaction("level", "readwrite");
    // Put the blob into the dabase
    var put = transaction.objectStore("level").put(buf, "current_level");
  }
  Save() {
    var builder = new flatbuffers.Builder(1024);

    var obstacles = [];
    for(var b = 0 ; b < this.bezier_lines.length ; b++) {;
      var bezier_line = this.bezier_lines[b];
      var points = [];
      var bezierPts = bezier_line.GetControlPoints();
      for(var pt = 0 ; pt < bezierPts.length ; pt++) {
        Wabisabi.Vec2.startVec2(builder);
        Wabisabi.Vec2.addX(builder, bezierPts[pt][0]);
        Wabisabi.Vec2.addY(builder, bezierPts[pt][1]);
        points.push(Wabisabi.Vec2.endVec2(builder));
      }
      var flat_pts = Wabisabi.Bezier.createPointsVector(builder, points);
      /*
      var control_points = [];
      for(var pt = 0 ; pt < bezier_line.control_points.length ; pt++) {
        Wabisabi.Vec2.startVec2(builder);
        Wabisabi.Vec2.addX(builder, bezier_line.control_points[pt][0]);
        Wabisabi.Vec2.addY(builder, bezier_line.control_points[pt][1]);
        control_points.push(Wabisabi.Vec2.endVec2(builder));
      }
      var flat_ctrl_pts = Wabisabi.Bezier.createControlPointsVector(builder, control_points);
      */
      Wabisabi.Bezier.startBezier(builder);
      Wabisabi.Bezier.addPoints(builder, flat_pts);
      //Wabisabi.Bezier.addControlPoints(builder, flat_ctrl_pts);
      obstacles.push(Wabisabi.Bezier.endBezier(builder));
    }
    
    var flat_obstacles = Wabisabi.Level.createObstaclesVector(builder, obstacles);

    Wabisabi.Level.startLevel(builder);
    Wabisabi.Level.addWorldSize(builder, document.getElementById("world_size").value);
    Wabisabi.Level.addObstacles(builder, flat_obstacles);
    var level = Wabisabi.Level.endLevel(builder);
    builder.finish(level);
    return builder.asUint8Array();
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
      console.log("buffer is a Uint8Array of length (in bytes): " + buffer.byteLength);
      console.log(buffer);
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
        /*var ctrl_points = [];
        for(var i = 0 ; i < obstacle.controlPointsLength() ; i++) {
          var pt = obstacle.controlPoints(i);
          ctrl_points.push(vec2.fromValues(pt.x(), pt.y()));
        }*/
        //var line = new BezierLine(points, ctrl_points);
        let beziers = [];
        if(points.length < 4)
          break;
        for(let p = 1 ; p < points.length ; p += 3) {
          beziers.push(new Bezier(points.slice(p-1, p+3)));
        }

        var line = new MultiBezier(...beziers);
        this.renderer.AddBezierLine(line);
        this.bezier_lines.push(line);
      }
    } else {
      console.log("buffer is not a Uint8Array");
    }
  }
}