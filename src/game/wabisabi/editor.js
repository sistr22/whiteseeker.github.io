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

    var world_size = document.getElementById("world_size").value;
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
}