// 2D fluid solver based on Navier-Stokes equation and Jos Stam paper

class Solver {
  constructor(grid_width, grid_height) {
    this.grid_width = grid_width;
    this.grid_height = grid_height;
    this.width = grid_width+2;
    this.height = grid_height+2;
    this.array_size = this.width*this.height;
    this.exposed_size = grid_width*grid_height;

    this.u = new Array(this.array_size);
    for (var i = 0 ; i < this.array_size ; i++)
      this.u[i] = 0;
    this.u_prev = new Array(this.array_size);
    for (var i = 0 ; i < this.array_size ; i++)
      this.u_prev[i] = 0;
    this.v = new Array(this.array_size);
    for (var i = 0 ; i < this.array_size ; i++)
      this.v[i] = 0;
    this.v_prev = new Array(this.array_size);
    for (var i = 0 ; i < this.array_size ; i++)
      this.v_prev[i] = 0;
    this.dens = new Array(this.array_size);
    for (var i = 0 ; i < this.array_size ; i++)
      this.dens[i] = 0;
    this.dens_prev = new Array(this.array_size);
    for (var i = 0 ; i < this.array_size ; i++)
      this.dens_prev[i] = 0;

    this.diff = 0.00003;
    this.visc = 0.00000;
    this.counter = 0;
  }

  step(dt) {
    for (var i = 0 ; i < this.array_size ; i++) {
      this.u_prev[i] = 0;
      this.v_prev[i] = 0;
      this.dens_prev[i] = 0;
    }

    // Get input from ui
    if(this.counter<100) {
      this.dens_prev[this.idx(30, 30)] += 15;
      this.u_prev[this.idx(30, 30)] += 12;
      this.v_prev[this.idx(30, 30)] += 4;
      /*for(var x = 29 ; x < 32 ; x++) {
        for(var y = 29 ; y < 32 ; y++) {
          this.u_prev[this.idx(x, y)] += -10;
          this.v_prev[this.idx(x, y)] = this.u_prev[this.idx(x, y)];
        }
      }*/
      this.counter++;
    }

    this.vel_step(dt)
    this.dens_step(dt);
    // Draw density
  }

  get_density() {
    return this.dens;
  }

  get_velocity_u() {
    return this.u;
  }

  get_velocity_v() {
    return this.v;
  }

  vel_step(dt) {
    this.add_source(this.u, this.u_prev, dt);
    this.add_source(this.v, this.v_prev, dt);

    // swap u & u_prev
    var tmp = this.u;
    this.u = this.u_prev;
    this.u_prev = tmp;

    this.diffuse(this.u, this.u_prev, 1, this.visc, dt);

    // swap v & v_prev
    tmp = this.v;
    this.v = this.v_prev;
    this.v_prev = tmp;

    this.diffuse(this.v, this.v_prev, 2, this.visc, dt);

    this.project();

    // swap u & u_prev
    var tmp = this.u;
    this.u = this.u_prev;
    this.u_prev = tmp;
    // swap v & v_prev
    tmp = this.v;
    this.v = this.v_prev;
    this.v_prev = tmp;

    this.advect(1, this.u, this.u_prev, this.u_prev, this.v_prev, dt);
    this.advect(2, this.v, this.v_prev, this.u_prev, this.v_prev, dt);
    this.project();
  }

  dens_step(dt) {
    this.add_source(this.dens, this.dens_prev, dt);

    // swap
    var tmp = this.dens;
    this.dens = this.dens_prev;
    this.dens_prev = tmp;

    this.diffuse(this.dens, this.dens_prev, 0, this.diff, dt);

    // swap
    tmp = this.dens;
    this.dens = this.dens_prev;
    this.dens_prev = tmp;

    this.advect(0, this.dens, this.dens_prev, this.u, this.v, dt);
  }

  idx(x, y) {
    return x + this.width*y;
  }

  project() {
    var u = this.u;
    var v = this.v;
    var p = this.u_prev;
    var div = this.v_prev;

    var hx = 1.0/this.grid_width;
    var hy = 1.0/this.grid_height;

    for (var i = 1 ; i <= this.grid_width ; i++) {
      for (var j = 0 ; j <= this.grid_height ; j++) {
        div[this.idx(i, j)] = -0.5*hx*(u[this.idx(i+1, j)]-u[this.idx(i-1, j)]+v[this.idx(i, j+1)]-v[this.idx(i, j-1)]);
        p[this.idx(i, j)] = 0;
      }
    }
    this.set_bnd(0, div);
    this.set_bnd(0, p);

    for (var k = 0 ; k < 20 ; k++) {
      for (var i = 1 ; i <= this.grid_width ; i++) {
        for (var j = 1 ; j <= this.grid_height ; j++) {
          p[this.idx(i, j)] = (div[this.idx(i, j)] + p[this.idx(i-1, j)]+p[this.idx(i+1, j)]+p[this.idx(i, j-1)]+p[this.idx(i, j+1)])/4;
        }
      }
      this.set_bnd(0, p);
    }

    for (var i = 1 ; i <= this.grid_width ; i++) {
      for (var j = 0 ; j <= this.grid_height ; j++) {
        u[this.idx(i, j)] -= 0.5*(p[this.idx(i+1, j)] - p[this.idx(i-1, j)])/hx;
        v[this.idx(i, j)] -= 0.5*(p[this.idx(i, j+1)] - p[this.idx(i, j-1)])/hy;
      }
    }
    this.set_bnd(1, u);
    this.set_bnd(2, v);
  }

  add_source(x, s, dt) {
    for(var i = 0 ; i < this.array_size ; i++) {
      x[i] += dt*s[i];
    }
  }

  advect(b, d, d0, u, v, dt) {
    var grid_height = this.grid_height;
    var grid_width = this.grid_width;
    var dt0x = dt*grid_width;
    var dt0y = dt*grid_height;
    for (var i=1 ; i<=grid_width ; i++) {
      for (var j=1 ; j<=grid_height ; j++) {
        var x = i-dt0x*u[this.idx(i, j)];
        var y = j-dt0y*v[this.idx(i, j)];
        if (x < 0.5)
          x = 0.5;
        if (x>grid_width+0.5)
          x = grid_width+0.5;
        var i0 = Math.floor(x);
        var i1 = i0+1;
        if (y < 0.5)
          y = 0.5;
        if (y>grid_height+0.5)
          y = grid_height+0.5;
        var j0 = Math.floor(y);
        var j1 = j0+1;
        
        var s1 = x-i0;
        var s0 = 1-s1;
        var t1 = y-j0;
        var t0 = 1-t1;
        d[this.idx(i, j)] = s0*(t0*d0[this.idx(i0, j0)] + t1*d0[this.idx(i0, j1)])+
                            s1*(t0*d0[this.idx(i1, j0)] + t1*d0[this.idx(i1, j1)]);
      }
    }
    this.set_bnd(b, d);
  }

  diffuse(x, x0, b, diff, dt) {
    var a = dt*diff*this.exposed_size;
    for(var k = 0 ; k < 20 ; k++) {
      for(var i = 1 ; i <= this.grid_width ; i++) {
        for(var j = 1 ; j <= this.grid_height ; j++) {
          x[this.idx(i, j)] = (x0[this.idx(i, j)] + a*(x[this.idx(i-1, j)]+x[this.idx(i+1, j)]+x[this.idx(i, j-1)]+x[this.idx(i, j+1)]))/(1+4*a);
        }
      }
      this.set_bnd(b, x);
    }
  }

  set_bnd(b, ar) {
    var grid_height = this.grid_height;
    var grid_width = this.grid_width;
    for(var x=1 ; x<=grid_width ; x++) {
      ar[this.idx(x, 0)] = b==2 ? -ar[this.idx(x, 1)] : ar[this.idx(x, 1)];
      ar[this.idx(x, grid_height+1)] = b==2 ? -ar[this.idx(x, grid_height)] : ar[this.idx(x, grid_height)];
    }
    for(var y=1 ; y<=grid_height ; y++) {
      ar[this.idx(0, y)] = b==1 ? -ar[this.idx(1, y)] : ar[this.idx(1, y)];
      ar[this.idx(grid_width+1, y)] = b==1 ? -ar[this.idx(grid_width, y)] : ar[this.idx(grid_width, y)];
    }
    ar[this.idx(0, 0)]                        = 0.5 * (ar[this.idx(1, 0)]+ar[this.idx(0, 1)]);
    ar[this.idx(0, grid_height+1)]            = 0.5 * (ar[this.idx(1, grid_height+1)] + ar[this.idx(0, grid_height)]);
    ar[this.idx(grid_width+1, 0)]             = 0.5 * (ar[this.idx(grid_width, 0)] + ar[this.idx(grid_width+1, 1)]);
    ar[this.idx(grid_width+1, grid_height+1)] = 0.5 * (ar[this.idx(grid_width, grid_height+1)] + ar[this.idx(grid_width+1, grid_height)]);
  }
}