class Bezier {
  constructor(pts) {
    this.points = pts
    this._t1 = 0;
    this._t2 = 1;
    this._lut = [];
    this._normals = [];
    this.Update();
  }
  Clone() {
    var pts = [];
    for(var i = 0 ; i < this.points.length ; i++) {
      pts.push(vec2.clone(this.points[i]));
    }
    var result = new Bezier(pts);
    return result;
  }
  GetControlPoints() {
    return this.points;
  }
  Get(t) {
    return this.Compute(t);
  }
  Barycenter() {
    var barycenter = vec2.fromValues(0, 0);
    vec2.add(barycenter, barycenter, this.points[0]);
    vec2.add(barycenter, barycenter, this.points[3]);
    vec2.div(barycenter, barycenter, vec2.fromValues(2, 2));
    return barycenter;
  }
  Translate(val) {
    for(var i = 0 ; i < this.points.length ; i++)
      vec2.add(this.points[i], this.points[i], val);
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
  __extrema() {
    var dims = [0, 1],
        result={},
        roots=[],
        p, mfn;
    dims.forEach(function(dim) {
      mfn = function(v) { return v[dim]; };
      p = this.dpoints[0].map(mfn);
      result[dim] = utils.droots(p);
      if(this.order === 3) {
        p = this.dpoints[1].map(mfn);
        result[dim] = result[dim].concat(utils.droots(p));
      }
      result[dim] = result[dim].filter(function(t) { return (t>=0 && t<=1); });
      roots = roots.concat(result[dim].sort());
    }.bind(this));
    roots = roots.sort().filter(function(v,idx) { return (roots.indexOf(v) === idx); });
    result.values = roots;
    return result;
  }
  BBox() {
    let extrema = this.__extrema(), result = {};
    let dims = [0, 1];
    dims.forEach(function(d) {
      result[d] = utils.getminmax(this, d, extrema[d]);
    }.bind(this));
    return result;
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
    this.Update();
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
    for(var i = 0 ; i < curves.length ; i++)
      this.beziers.push(curves[i]);
    for(var i = 1 ; i < this.beziers.length ; i++)
      this.beziers[i].points[0] = this.beziers[i-1].points[3];
  }

  AddPoint(previous_point, point, control_point_left, control_point_right) {
    let i = 0, j = 0, found = false;
    for(i = 0 ; i < this.beziers.length ; i++) {
      for(j = 0 ; j < 4 ; j++) {
        if(this.beziers[i].points[j] == previous_point) {
          found = true;
          console.log("point found i,j = " + i + "," + j);
          break;
        }
      }
      if(found)
        break;
    }

    if(!found) {
      console.log("Couldn't find the point, strange !");
      return;
    }
    if(j % 3 != 0) {
      console.log("You need to select a point on the path, not a control point");
      return;
    }

    if(i == this.beziers.length-1 && j == 3) {
      // Edge case: Add a point at the end of the curve
      let bezier = new Bezier([this.beziers[i].points[j], control_point_left, control_point_right, point]);
      this.beziers.push(bezier);
    } else if(i == 0 && j == 0) {
      // Edge case add after very first node
      let bezier1 = new Bezier([
        this.beziers[0].points[0],
        this.beziers[0].points[1],
        control_point_left,
        point]);
      let bezier2 = new Bezier([
        point,
        control_point_right,
        this.beziers[0].points[2],
        this.beziers[0].points[3]]);
      this.beziers.splice(0, 1, bezier1, bezier2);
    }else {
      console.log("i = " + i + " j = " + j + " this.beziers.length = " + this.beziers.length);
      if(j != 3) {
        // As the first point of a bezier curve is the same as the
        // last point of the previous bezier curve and vice versa, j should always be 3
        console.log("WOW, j is not 3 ? wtf !! Makes no sense !");
        return;
      }
      let tmp =this.beziers[i+1].points[3]
      let bezier1 = new Bezier([
        this.beziers[i+1].points[0],
        this.beziers[i+1].points[1],
        control_point_left,
        point]);
      let bezier2 = new Bezier([
        point,
        control_point_right,
        this.beziers[i+1].points[2],
        tmp]);
      this.beziers.splice(i+1, 1, bezier1, bezier2);
    }


  }

  DeletePoint(point) {
    var i = 0, j = 0, found = false;
    for(i = 0 ; i < this.beziers.length ; i++) {
      for(j = 0 ; j < 4 ; j++) {
        if(this.beziers[i].points[j] == point) {
          found = true;
          break;
        }
      }
      if(found)
        break;
    }

    if(found) {
      if(this.beziers.length == 1 && (j == 0 || j == 3)) {
        this.beziers = [];
      } else {
        if(i == 0 && j == 0) {
          // edge cases: removing the first point
          this.beziers = this.beziers.splice(1);
        } else if(i == this.beziers.length-1 && j == 3) {
          // edge cases: removing the last point
          this.beziers = this.beziers.splice(this.beziers.length-1);
        } else {
          // General cases
          if(j == 3) {
            // Create the new bezier that will replace the 2 existing one
            let newBezier = new Bezier([
              this.beziers[i].points[0],
              this.beziers[i].points[1],
              this.beziers[i+1].points[2],
              this.beziers[i+1].points[3]]);
            this.beziers.splice(i, 2, newBezier);
          } else {
            console.log("Can't delete ! j == " + j);
          }
        }
      }
    }
  }

  Clone() {
    var cloned_bezier = [];
    for(var i = 0 ; i < this.beziers.length ; i++) {
      cloned_bezier.push(this.beziers[i].Clone());
    }
    return new MultiBezier(...cloned_bezier);
  }

  Barycenter() {
    var barycenter = vec2.fromValues(0, 0);
    for(var i = 0 ; i < this.beziers.length ; i++) {
      barycenter.add(barycenter, barycenter, this.beziers[i].Barycenter());
    }
    vec2.div(barycenter, barycenter, vec2.fromValues(this.beziers.length, this.beziers.length));
    return barycenter;
  }

  BBox() {
    var bbox = this.beziers[0].BBox();
    for(var i=1; i<this.beziers.length; i++) {
      utils.expandbox(bbox, this.beziers[i].BBox());
    }
    return bbox;
  }

  Translate(val) {
    for(var i = 0 ; i < this.beziers.length ; i++)
      this.beziers[i].Translate(val);
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

  GetControlPoints() {
    var result = this.beziers[0].GetControlPoints();
    for(var i = 1 ; i < this.beziers.length ; i++) {
      result = result.concat(this.beziers[i].GetControlPoints().slice(1));
    }
    return result;
  }

  BezierCount() {
    return this.beziers.length;
  }

  Project(point) {
    // step 1: coarse check
    var LUT = this.GetLUT(), l = LUT.length-1,
        closest = utils.closest(LUT, point),
        mdist = closest.mdist,
        mpos = closest.mpos;
    if (mpos===0 || mpos===l) {
      var t = mpos/l, pt = this.compute(t);
      pt.t = t;
      pt.d = mdist;
      return pt;
    }

    // step 2: fine check
    var ft, t, p, d,
        t1 = (mpos-1)/l,
        t2 = (mpos+1)/l,
        step = 0.1/l;
    mdist += 1;
    for(t=t1,ft=t; t<t2+step; t+=step) {
      p = this.Compute(t);
      d = utils.dist(point, p);
      if (d<mdist) {
        mdist = d;
        ft = t;
      }
    }
    p = this.Compute(ft);
    p.t = ft;
    p.d = mdist;
    return p;
  }
}