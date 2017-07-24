importScripts("//cdnjs.cloudflare.com/ajax/libs/seedrandom/2.4.0/seedrandom.min.js");

onmessage = function(e) {
  console.log('Message received from main script');
  generateMap(e.data);
}

function Terrain(detail) {
    this.size = Math.pow(2, detail) + 1;
    this.max = this.size - 1;
    this.map = new Float32Array(this.size * this.size);
  }
Terrain.prototype.get = function(x, y) {
    if (x < 0 || x > this.max || y < 0 || y > this.max) return -1;
    return this.map[x + this.size * y];
};
Terrain.prototype.set = function(x, y, val) {
    this.map[x + this.size * y] = val;
};
Terrain.prototype.generate = function(roughness, initalt) {
    var self = this;
    this.set(0, 0, initalt);
    this.set(this.max, 0, initalt);
    this.set(this.max, this.max, initalt);
    this.set(0, this.max, initalt);
    divide(this.max, this.max);
    function divide(size, total_size) {
        var x, y, half = size / 2;
        var scale = roughness * (size/total_size);
        if (half < 1) return;
        for (y = half; y < self.max; y += size) {
            for (x = half; x < self.max; x += size) {
                square(x, y, half, Math.random() * scale * 2 - scale);
            }
        }
        for (y = 0; y <= self.max; y += half) {
            for (x = (y + half) % size; x <= self.max; x += size) {
                diamond(x, y, half, Math.random() * scale * 2 - scale);
            }
        }
        divide(size / 2, total_size);
    }
    function average(values) {
        var valid = values.filter(function(val) { return val !== -1; });
        var total = valid.reduce(function(sum, val) { return sum + val; }, 0);
        return total / valid.length;
    }
    function square(x, y, size, offset) {
        var ave = average([
            self.get(x - size, y - size),   // upper left
            self.get(x + size, y - size),   // upper right
            self.get(x + size, y + size),   // lower right
            self.get(x - size, y + size)    // lower left
        ]);
        offset = ave + offset > 1.0 ? 1-ave : offset;
        offset = ave + offset < 0.0 ? -ave : offset;
        self.set(x, y, ave + offset);
    }
    function diamond(x, y, size, offset) {
        var ave = average([
            self.get(x, y - size),      // top
            self.get(x + size, y),      // right
            self.get(x, y + size),      // bottom
            self.get(x - size, y)       // left
        ]);
        offset = ave + offset > 1.0 ? 1-ave : offset;
        offset = ave + offset < 0.0 ? -ave : offset;
        self.set(x, y, ave + offset);
    }
};

function generateMap(data) {
    console.log("[worker] Start generating map");

    // ----------------------------------------------------
    // Get parameter from HTML

    var pot = data.pot;
    var roughness = data.roughness;
    var initalt = parseFloat(data.initalt);
    var width = Math.pow(2, pot) + 1;
    var height = Math.pow(2, pot) + 1;

    var seed = data.seed;
    console.log("[worker] seed = " + seed);

    Math.seedrandom(seed);

    // ----------------------------------------------------
    // Initialise the height map

    var heightMap = [];
    for(var i = 0 ; i < height*width ; i++) {
        heightMap[i] = -1;
    }

    var terrain = new Terrain(pot);

    // ----------------------------------------------------
    // Generate the 2D heightmap

    terrain.generate(roughness, initalt);

    // ----------------------------------------------------
    // Create the final visualisation

    var max = -1;
    var min = 800;
    for(var x_i = 0 ; x_i < width ; x_i++) {
        for(var y_i = 0 ; y_i < height ; y_i++) {
            var val = terrain.get(x_i, y_i);
            max = val>max?val:max;
            min = val<min?val:min;
        }
    }

    for(var x_i = 0 ; x_i < width ; x_i++) {
        for(var y_i = 0 ; y_i < height ; y_i++) {
            //heightMap[x_i + y_i*width] = 255*(terrain.get(x_i, y_i)-min)/(max-min);
            var val = terrain.get(x_i, y_i);
            val = val<0?0:val;
            val = val>1?1:val;
            heightMap[x_i + y_i*width] = 255*val;
        }
    }

    console.log("max: " + max);
    console.log("min: " + min);

    postMessage({type:"Result", data:heightMap});

    // ----------------------------------------------------

}
