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
  MouseMove(editor, delta_pos) {
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
}

class StateIdle extends State {
  Tick(editor, delta_ms) {
  }

  MouseDown(editor, pos) {
    var state = new StateSelecting();
    state.MouseDown(editor, pos);
    return state;
  }

  MouseMove(editor, delta_pos) {
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
    return null;
  }

  MouseUp(editor, pos) {
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

  MouseMove(editor, delta) {
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
    }
    return null;
  }

  KeyPress(editor, evt) {
    if(evt.key == "+") {
      if(this.selection.points.size == 1) {
        console.log("Add point");
        var key_value = this.selection.points.entries().next().value;
        key_value[1].AddPoint(key_value[0], vec2.fromValues(0.0, 0.15), vec2.fromValues(-0.1, 0.15), vec2.fromValues(0.1, 0.15));
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
  
  MouseMove(editor, delta_pos) {
    this.selection.points.forEach((key, elt) => {
      vec2.add(elt, elt, delta_pos);
    });
    this.selection.ctrl_points.forEach((key, elt) => {
      vec2.add(elt, elt, delta_pos);
    });
  }

  KeyUp(editor, evt) {
    if(evt.key == "t") {
      return new StateSelecting(this.selection);
    }
    return null;
  }

  KeyDown(editor, evt) {
  }

  KeyPress(editor, evt) {
  }
}
