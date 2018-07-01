Array.prototype.unique = function() {
  var a = this.concat();
  for(var i=0; i<a.length; ++i) {
      for(var j=i+1; j<a.length; ++j) {
          if(a[i] === a[j])
              a.splice(j--, 1);
      }
  }

  return a;
};

class Selection {
  constructor() {
    this.points = new Map();
    this.ctrl_points = new Map();
  }

  AddPoint(point, bezier_line) {
    this.points.set(point, bezier_line);
  }

  AddCtrlPoint(ctrl_point, bezier_line) {
    this.ctrl_points.set(ctrl_point, bezier_line);
  }

  Length() {
    return this.ctrl_points.size + this.points.size;
  }

  Clear() {
    this.ctrl_points.clear();
    this.points.clear();
  }
}

class State {
  Tick(editor, delta_ms) {
    console.log("Default state impl of Tick, should be overwriten");
    return null;
  }
  MouseDown(editor, pos) {
    console.log("Default state impl of MouseDown, should be overwriten");
    return null;
  }
  MouseUp(editor, pos) {
    console.log("Default state impl of MouseUp, should be overwriten");
    return null;
  }
  MouseMove(editor, data) {
    console.log("Default state impl of MouseMove, should be overwriten");
    return null;
  }
  KeyPress(editor, evt) {
    console.log("Default state impl of KeyPress, should be overwriten");
    return null;
  }
  KeyUp(editor, evt) {
    console.log("Default state impl of KeyUp, should be overwriten");
    return null;
  }
  KeyDown(editor, evt) {
    console.log("Default state impl of KeyDown, should be overwriten");
    return null;
  }
  UiEvent(editor, evt) {
    console.log("Default state impl of UiEvent, should be overwriten");
    return null;
  }
}

class StateIdle extends State {
  Tick(editor, delta_ms) {
  }
  MouseUp(editor, pos) {
    this.last_pos_mouse = pos;
  }
  MouseDown(editor, pos) {
    var state = new StateSelecting();
    state.MouseDown(editor, pos);
    return state;
  }
  MouseMove(editor, data) {
    this.last_pos_mouse = data.absolute;
  }
  KeyDown(editor, evt) {
    if(evt.ctrlKey && evt.which == 86 /*v*/ && editor.copy_slot != null) {
      console.log("Pasting a bezier line at: " + this.last_pos_mouse);
      var bezier_line = editor.copy_slot.Clone();
      var barycenter = bezier_line.Barycenter();
      var translate_vector = vec2.fromValues(0, 0);
      vec2.sub(translate_vector, this.last_pos_mouse, barycenter);
      bezier_line.Translate(translate_vector);
      editor.renderer.AddBezierLine(bezier_line);
      editor.bezier_lines.push(bezier_line);
    }
    return null;
  }

  KeyPress(editor, evt) {
    if(evt.key == "+") {
      var pt = vec2.fromValues(editor.renderer.canva.width/2, editor.renderer.canva.height/2);
      pt = editor.renderer.ToWorldCoordinate(pt);
      var pt_left = vec2.fromValues(pt[0]-0.1, pt[1]);
      var pt_right = vec2.fromValues(pt[0]+0.1, pt[1]);
      var line = new BezierLine([pt_left, pt_right], [vec2.clone(pt_left), vec2.fromValues(pt_left[0], pt_left[1]+0.2), vec2.fromValues(pt_right[0], pt_right[1]+0.2), vec2.clone(pt_right)]);
      editor.renderer.AddBezierLine(line);
      editor.bezier_lines.push(line);
    }
  }

  UiEvent(editor, evt) {
    if(evt == UiActions.PLAY)
      return new StatePlay(editor);
    return null;
  }
}

class StateSelecting extends State {

  constructor(selection) {
    super();
    if(selection)
      this.selection = selection;
    else
      this.selection = new Selection();
  }
  
  Tick(editor, delta_ms) {
  }

  MouseDown(editor, pos) {
    this.start_point = pos;
    var click_on_selection = false;
    // If pointer down on a selected element => translate
    this.selection.points.forEach((key, elt) => {
      if(vec2.sqrDist(elt, pos) < 0.0002) {
        click_on_selection = true;
      }
    });
    if(!click_on_selection) {
      this.selection.ctrl_points.forEach((key, elt) => {
        if(vec2.sqrDist(elt, pos) < 0.0002) {
          click_on_selection = true;
        }
      });
    }
    if(click_on_selection)
      return new StateTranslating(this.selection);
    return null;
  }

  MouseUp(editor, pos) {
    var something_added = false;
    if(vec2.sqrDist(this.start_point, pos) < 0.0002) {
      something_added = this.ClickSelect(editor, pos);
    } else {
      something_added = this.RectangleSelect(editor, pos);
    }

    if(!something_added) {
      this.selection.points.forEach((key, elt) => {
        elt.color = null;
      });
      this.selection.ctrl_points.forEach((key, elt) => {
        elt.color = null;
      });
      this.selection.Clear();
    }

    if(this.selection.Length() == 0)
      return new StateIdle();
    console.log("selected item count: " + this.selection.Length());
    return null;
  }

  ClickSelect(editor, pos) {
    var something_added = false;
    for (var l = 0 ; l < editor.bezier_lines.length ; l++) {
      var line = editor.bezier_lines[l];
      if(!line)
        continue;
      for(var p = 0 ; p < line.points.length ; p++) {
        if(vec2.sqrDist(line.points[p], pos) < 0.0002) {
          line.points[p].color = [1.0,1.0,0.0,1.0];
          this.selection.AddPoint(line.points[p], line);
          something_added = true;
        }

        for(var cp = 0 ; cp < 2 ; cp++) {
          var pt = line.control_points[2*p+cp];
          if(vec2.sqrDist(pt, pos) < 0.0002) {
            pt.color = [1.0,1.0,1.0,1.0];
            this.selection.AddCtrlPoint(pt, line);
            something_added = true;
          }
        }
      }
    }
    return something_added;
  }

  RectangleSelect(editor, pos) {
    var bottom_left_pt = vec2.create();
    bottom_left_pt[0] = Math.min(this.start_point[0], pos[0]);
    bottom_left_pt[1] = Math.min(this.start_point[1], pos[1]);

    var top_right_pt = vec2.create();
    top_right_pt[0] = Math.max(this.start_point[0], pos[0]);
    top_right_pt[1] = Math.max(this.start_point[1], pos[1]);

    var something_added = false;
    for (var l = 0 ; l < editor.bezier_lines.length ; l++) {
      var line = editor.bezier_lines[l];
      if(!line)
        continue;
      for(var p = 0 ; p < line.points.length ; p++) {
        if(line.points[p][0] >= bottom_left_pt[0] && line.points[p][0] <= top_right_pt[0] &&
          line.points[p][1] >= bottom_left_pt[1] && line.points[p][1] <= top_right_pt[1]) {
          line.points[p].color = [1.0,1.0,0.0,1.0];
          this.selection.AddPoint(line.points[p], line);
          something_added = true;
        }

        for(var cp = 0 ; cp < 2 ; cp++) {
          var pt = line.control_points[2*p+cp];
          if(pt[0] >= bottom_left_pt[0] && pt[0] <= top_right_pt[0] &&
            pt[1] >= bottom_left_pt[1] && pt[1] <= top_right_pt[1]) {
            pt.color = [1.0,1.0,1.0,1.0];
            this.selection.AddCtrlPoint(pt, line);
            something_added = true;
          }
        }
      }
    }
    return something_added;
  }

  MouseMove(editor, data) {
  }

  KeyDown(editor, evt) {
    if(evt.key == "t") {
      return new StateTranslating(this.selection);
    } else if(evt.which == 8 /*backspace*/) {
      this.Delete(editor);
      this.selection.points.forEach((key, elt) => {
        elt.color = null;
      });
      this.selection.ctrl_points.forEach((key, elt) => {
        elt.color = null;
      });
      return new StateIdle();
    } else if(evt.ctrlKey && evt.which == 67 /*c*/) {
      if(this.selection.points.size == 1) {
        console.log("Copying the bezier line");
        var key_value = this.selection.points.entries().next().value;
        editor.copy_slot = key_value[1].Clone();
      }
    }
    return null;
  }

  KeyPress(editor, evt) {
    if(evt.key == "+") {
      if(this.selection.points.size == 1) {
        console.log("Add point");
        var key_value = this.selection.points.entries().next().value;
        var y = key_value[0][1];
        key_value[1].AddPoint(key_value[0], vec2.fromValues(0.0, y), vec2.fromValues(-0.1, y), vec2.fromValues(0.1, y));
      }
    }
  }

  Delete(editor) {
    console.log("Deleting selection");
    this.selection.points.forEach((key, elt) => {
      console.log(key);
      key.DeletePoint(elt);
      if(key.points.length == 0)
        editor.RemoveBezierLine(key);
    });
  }
}

class StateTranslating extends State {
  constructor(selection) {
    super();
    this.selection = selection;
  }

  Tick(editor, delta_ms) {
  }

  MouseUp(editor, pos) {
    return new StateSelecting(this.selection);
  }
  
  MouseMove(editor, data) {
    this.selection.points.forEach((key, elt) => {
      vec2.add(elt, elt, data.delta);
    });
    this.selection.ctrl_points.forEach((key, elt) => {
      vec2.add(elt, elt, data.delta);
    });
  }

  KeyUp(editor, evt) {
    if(evt.key == "t")
      return new StateSelecting(this.selection);
    return null;
  }

  KeyDown(editor, evt) {
  }

  KeyPress(editor, evt) {
  }
}

class StatePlay extends State {
  constructor(editor) {
    super();
    this.previousDebugState = editor.debug?true:false;
    editor.debug = false;
  }
  Tick(editor, delta_ms) {
    var percent = audio_controls.currentTime/audio_controls.duration;
    var world_size = document.getElementById("world_size").value;
    var camera_center = editor.renderer.GetCameraCenter();
    camera_center[1] = world_size*percent;
    renderer.SetCameraCenter(camera_center);
    // Update the slider
    document.getElementById("slider_world").value = percent;
    // Move the player
    var direction = 0;
    if(this.goRight == true)
      direction += 1.0;
    if(this.goLeft == true)
      direction -= 1.0;
    var player_pos = editor.player.GetPosition();
    player_pos[0] += direction * delta_ms/1000.0;
    player_pos[1] = camera_center[1];
    editor.player.SetPosition(player_pos);
    console.log("direction: " + direction);
    if(audio_controls.currentTime >= audio_controls.duration) {
      editor.debug = this.previousDebugState;
      return new StateIdle();
    }
    return null;
  }
  MouseDown(editor, pos) {
    return null;
  }
  MouseUp(editor, pos) {
    return null;
  }
  MouseMove(editor, data) {
    return null;
  }
  KeyPress(editor, evt) {
    return null;
  }
  KeyUp(editor, evt) {
    if(evt.which == 37 /*left arrow*/) {
      this.goLeft = false;
    } else if(evt.which == 39 /*right arrow*/) {
      this.goRight = false;
    }
    return null;
  }
  KeyDown(editor, evt) {
    if(evt.which == 37 /*left arrow*/) {
      this.goLeft = true;
    } else if(evt.which == 39 /*right arrow*/) {
      this.goRight = true;
    }
    return null;
  }
  UiEvent(editor, evt) {
    if(evt == UiActions.PAUSE) {
      editor.debug = this.previousDebugState?true:false;
      return new StateIdle();
    }
    return null;
  }
}
