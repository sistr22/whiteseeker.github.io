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
  MouseWheel(editor, delta) {
    console.log("Default state impl of MouseWheel, should be overwriten");
    return null;
  }
  KeyPress(editor, evt) {
    console.log("Default state impl of KeyPress, should be overwriten");
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
    /*for (var line in editor.bezier_lines) {
      var squared_delta = 0.0004;
      for(var p = 0 ; p < line.points.length ; p++) {
        if(vec2.sqrDist(pt, line.points[p]) <= squared_delta) {
          return new StateSelecting();
        }

        for(var cp = 0 ; cp < 2 ; cp++) {
          if(line.control_points[2*p+cp][0] == 0 && line.control_points[2*p+cp][1] == 0)
            continue;
          var ctrl_p = vec2.create();
          vec2.add(ctrl_p, line.points[p], line.control_points[2*p+cp]);
          if(vec2.sqrDist(pt, ctrl_p) <= squared_delta) {
            return new StateSelecting();
            //return this.control_points[2*p+cp];
          }
        }
      }
    }*/
  }
}

class StateSelecting extends State {
  constructor() {
    super();
    this.selection = [];
  }
  
  Tick(editor, delta_ms) {
  }

  MouseDown(editor, pos) {
    return null;
  }

  MouseUp(editor, pos) {
    if(this.selection.length == 0) {
      return new StateIdle();
    }
    return null;
  }
}