class BezierAnimation {
  constructor(start_time_ms, end_time_ms) {
    this.start_ms = start_time_ms || 0;
    this.end_ms = end_time_ms || 0.1;
    this.beziers = new Map();
  }

  GetStartTimeMs() {
    return this.start_ms;
  }
  SetStartTimeMs(start_time_ms) {
    this.start_ms = start_time_ms;
  }

  GetEndTimeMs() {
    return this.end_ms;
  }
  SetEndTimeMs(start_time_ms) {
    this.start_ms = start_time_ms;
  }

  AddBezier(bezier, start_time_ms, end_time_ms) {
    if (this.beziers.has(bezier)) {
      console.alert("Trying to animate a bezier curve already animated !");
      return;
    }
    this.start_ms = Math.min(this.start_ms, start_time_ms);
    this.end_ms = Math.max(this.end_ms, end_time_ms);
    this.beziers.set(bezier, new BezierAnimator(bezier, start_time_ms, end_time_ms));
  }

  GetBeziers(time_ms) {
    let result = [];
    this.beziers.forEach( (value, key, map) => {
      let tmp = value.Get(time_ms);
      if(tmp != null)
        result.push(tmp)
    });
    return result;
  }

}

class BezierAnimator {
  constructor(bezier, start_time_ms, end_time_ms) {
    this.bezier;
    this.start_ms = start_time_ms;
    this.end_time_ms = end_time_ms;
  }

  Get(time_ms) {
    if (time_ms < this.start_ms || time_ms > this.end_ms)
      return null;
    else
      return this.bezier;
  }
}