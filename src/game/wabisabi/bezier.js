class Bezier {
  constructor(pts) {
    this.points = pts
    this._t1 = 0;
    this._t2 = 1;
    this._lut = [];
    this._normals = [];
    this.Update();
  }
  Update() {
    // one-time compute derivative coordinates
    this.dpoints = [];
    for(var p=this.points, d=p.length, c=d-1; d>1; d--, c--) {
      var list = [];
      for(var j=0, dpt; j<c; j++) {
        dpt = vec2.fromValues(
          c * (p[j+1][0] - p[j][0]),
          c * (p[j+1][1] - p[j][1]));
        list.push(dpt);
      }
      this.dpoints.push(list);
      p = list;
    };
    this.computedirection();
  }
  computedirection() {
    var points = this.points;
    var angle = utils.angle(points[0], points[3], points[1]);
    this.clockwise = angle > 0;
  }
  GetLUT(steps) {
    steps = steps || 100;
    if (this._lut.length === steps) { return this._lut; }
    this._lut = [];
    for(var t=0; t<=steps; t++) {
      this._lut.push(this.Compute(t/steps));
    }
    return this._lut;
  }
  GetNormals(steps) {
    steps = steps || 100;
    if (this._normals.length === steps) { return this._normals; }
    this._normals = [];
    for(var t=0; t<=steps; t++) {
      this._normals.push(this.__normal(t/steps));
    }
    return this._normals;
  }
  __normal(t) {
    var d = this.Derivative(t);
    var q = Math.sqrt(d[0]*d[0] + d[1]*d[1])
    return vec2.fromValues(-d[1]/q, d[0]/q);
  }
  Derivative(t) {
    // TODO: Test which method is the quickest
    /*var nt = 1.0 - t;
    var scalars = [-3.0*nt*nt, 3.0*(1.0 - 4.0*t + 3.0*t*t), 3.0*(2.0*t - 3.0*t*t), 3.0*t*t];
    var value = this.points.reduce(function(prev, curr, i) {
      var tmp = vec2.create();
      vec2.scale(tmp, curr, scalars[i]);
      vec2.add(prev, prev, tmp);
      return prev;
    }, vec2.create());
    return value;*/
    var mt = 1-t,
        a,b,c=0,
        p = this.dpoints[0];
    a = mt*mt; b = mt*t*2; c = t*t;
    var ret = vec2.fromValues(
      a*p[0][0] + b*p[1][0] + c*p[2][0],
      a*p[0][1] + b*p[1][1] + c*p[2][1]);
    return ret;
  }
  Compute(t) {
    // shortcuts
    if(t===0) { return this.points[0]; }
    if(t===1) { return this.points[3]; }
    var p = this.points;
    var mt = 1-t;
    var mt2 = mt*mt,
        t2 = t*t,
        a,b,c,d = 0;
    a = mt2*mt;
    b = mt2*t*3;
    c = mt*t2*3;
    d = t*t2;
    var ret = vec2.fromValues(
      a*p[0][0] + b*p[1][0] + c*p[2][0] + d*p[3][0],
      a*p[0][1] + b*p[1][1] + c*p[2][1] + d*p[3][1]);
    return ret;
  }
}

class MultiBezier {
  constructor(...curves) {
    this.beziers = [];
    for(var i = 0 ; i < curves.length ; i++) {
      this.beziers.push(curves[i]);
    }
  }

  GetLUT(steps) {
    var result = [];
    for(var i = 0 ; i < this.beziers.length ; i++) {
      result = result.concat(this.beziers[i].GetLUT(steps));
    }
    return result;
  }

  GetNormals(steps) {
    var result = [];
    for(var i = 0 ; i < this.beziers.length ; i++) {
      result = result.concat(this.beziers[i].GetNormals(steps));
    }
    return result;
  }
}