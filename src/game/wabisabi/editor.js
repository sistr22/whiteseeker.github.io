class Editor {
  constructor(renderer) {
    this.state = new StateIdle();
    this.bezier_lines = [];
    this.renderer = renderer;

    // Init
    var line = new BezierLine(vec2.fromValues(-0.1, -0.05), vec2.fromValues(0.2, 0), vec2.fromValues(0.25, 0), vec2.fromValues(0, -0.25));
    line.AddPointAtIndex(1, vec2.fromValues(0.0, 0.15), vec2.fromValues(-0.1, 0.15), vec2.fromValues(0.1, 0.15));
    this.bezier_lines.push(line);
    this.renderer.AddBezierLine(line);
  }

  SetState(new_state) {
    if (new_state != null) {
      console.log("New state: " + new_state.constructor.name);
      this.state = new_state;
    }
  }

  Tick(delta_ms) {
    this.SetState(this.state.Tick(this, delta_ms));
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
    this.SetState(this.state.MouseWheel(this, delta));
  }

  KeyPress(evt) {
    this.SetState(this.state.KeyPress(this, evt));
  }
}