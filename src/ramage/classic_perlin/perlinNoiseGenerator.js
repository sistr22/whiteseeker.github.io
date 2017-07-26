importScripts("//cdnjs.cloudflare.com/ajax/libs/seedrandom/2.4.0/seedrandom.min.js");

onmessage = function(e) {
  console.log('Message received from main script');
  generateMap(e.data);
}

function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

var size_array = 256;
var mask = size_array - 1;
var perm = new Array(size_array); // int array of size == size_array
var grads_x = new Array(size_array);
var grads_y = new Array(size_array); // float array of size == size_array

function init(sizearray) {
    size_array = sizearray;
    mask = size_array - 1;
    perm = new Array(size_array); // int array of size == size_array
    grads_x = new Array(size_array);
    grads_y = new Array(size_array); // float array of size == size_array
    for (var index = 0; index < size_array; index++) {
        var other = randomIntFromInterval(0, index);
        if (index > other)
            perm[index] = perm[other];
        perm[other] = index;
        grads_x[index] = Math.cos(2.0 * Math.PI * index / size_array);
        grads_y[index] = Math.sin(2.0 * Math.PI * index / size_array);
    }
}

function f(t) { // return float
    t = Math.abs(t);
    return t >= 1.0 ? 0.0 : 1.0 -
        ( 3.0 - 2.0 * t ) * t * t;
}
function surflet(x, y, grad_x, grad_y) { // return float
    return f(x) * f(y) * (grad_x * x + grad_y * y);
}
function noise(x, y) { // return float
    var result = 0.0;
    var cell_x = Math.floor(x);
    var cell_y = Math.floor(y);
    for (var grid_y = cell_y ; grid_y <= cell_y + 1 ; grid_y++)
        for (var grid_x = cell_x ; grid_x <= cell_x + 1; grid_x++) {
            var hash = perm[( perm[ grid_x & mask ] + grid_y ) & mask];
            result += surflet( x - grid_x, y - grid_y,
                               grads_x[ hash ], grads_y[ hash ] );
        }
    return result;
}

function generateMap(data) {
    console.log("[worker] Start generating map");

    // ----------------------------------------------------
    // Get parameter from HTML

    var width = data.width;
    var height = data.height;
    var perlin_size = data.perlin_size;
    console.log("[worker] width = " + width);
    console.log("[worker] height = " + height);
    console.log("[worker] perlin_size = " + perlin_size);

    var seed = data.seed;
    console.log("[worker] seed = " + seed);

    Math.seedrandom(seed);

    // ----------------------------------------------------
    // Initialisation

    init(perlin_size);

    var heightMap = [];
    for(var i = 0 ; i < height*width ; i++) {
        heightMap[i] = -1;
    }

    // ----------------------------------------------------
    // Generate the 2D heightmap

    for(var i = 0 ; i < height * width ; i++) {
        var y = Math.floor(i/width)  ;
        var x = i%width;
        heightMap[i] = 128 + 126*noise(size_array*x/width, size_array*y/height);
    }

    // ----------------------------------------------------
    // Create the final visualisation

    postMessage({type:"Result", data:heightMap, width:width, height:height});

    // ----------------------------------------------------

}

function GetUpperLeft(d) {
    return [Math.min(d.c0[0], d.c1[0]), Math.min(d.c0[1], d.c1[1])];
}

function ReadMap(map, point, w, h) {
    var ptsn = sanetize(point, w, h);

    return map[ptsn[0] + w*ptsn[1]];
}
function sanetize(point, w, h) {
    var res = [];
    if(point[0] < 0)
        res[0] = w+(point[0]-1);
    else if(point[0] >= w)
        res[0] = point[0]-(w-1);
    else
        res[0] = point[0];

    if(point[1] < 0)
        res[1] = h+(point[1]-1);
    else if(point[1] >= h)
        res[1] = point[1]-(h-1);
    else
        res[1] = point[1];

    return res;
}