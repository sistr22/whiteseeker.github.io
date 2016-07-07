importScripts("//cdnjs.cloudflare.com/ajax/libs/seedrandom/2.4.0/seedrandom.min.js");

onmessage = function(e) {
  console.log('Message received from main script');
  generateMap(e.data);
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function generateMap(data) {
    console.log("[worker] Start generating map");

    // ----------------------------------------------------
    // Get parameter from HTML

    var width = data.width;
    var height = data.height;
    var roughness = data.roughness;
    var initalt = data.initalt;

    var seed = data.seed;
    console.log("[worker] seed = " + seed);

    Math.seedrandom(seed);

    // ----------------------------------------------------
    // Initialise the height map

    // subd = Number of subdivision
    var subd = 4;
    // Space between subd (except for the last one)
    var space_subd = Math.floor(width / subd);
    var heightMap = [];
    for(var i = 0 ; i < width ; i++) {
    	heightMap[i] = initalt;
    }

    // ----------------------------------------------------
    // Generate the 1D heightmap

    var stack = [[0, width-1, Math.max(1-initalt, initalt)-0.001]];
    while(stack.length > 0) {
    	console.log("stack.length = " + stack.length);
    	var elt = stack.pop();
    	console.log("elt[" + elt[0] + " ; " + elt[1] + "]");

    	// Stop case ?
    	if(elt[1] - elt[0] <= 1)
    		continue;

    	var middle = elt[0] + Math.floor((elt[1] - elt[0])/2);
    	console.log("middle = " + middle);

    	var randomRange = elt[2];
    	var nextRandomRange = randomRange*roughness;
    	// We add the next recursion if necessary
    	if(elt[1] - elt[0] > 2) {
    		stack.push([elt[0], middle, nextRandomRange]);
    		stack.push([middle, elt[1], nextRandomRange]);	
    	}

    	// Algo

    	// Calcul line equation: f(x) = A*x + B
		var A = (heightMap[elt[1]] - heightMap[elt[0]])/(elt[1] - elt[0]);
		var B = heightMap[elt[1]] - A*elt[1];

		// Initialise the value at middle at its current height
		heightMap[middle] = A*middle + B;


		// Randomise its height
		heightMap[middle] += 2*randomRange*Math.random() - randomRange;
		if(heightMap[middle] < 0)
			heightMap[middle] = 0;
		if(heightMap[middle] > 1)
			heightMap[middle] = 1;
    }

    // ----------------------------------------------------
    // Create the final visualisation

    var result = [];
    for(var w = 0 ; w < width ; w++) {
    	var val = heightMap[w]*height;
    	for(var h = 0 ; h < height ; h++) {
    		if(h<val)
    			result[h*width + w] = 180;
    		else
    			result[h*width + w] = 10;
    	}
    }

    postMessage({type:"Result", data:result});

    // ----------------------------------------------------

}
