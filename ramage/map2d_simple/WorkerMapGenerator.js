importScripts("//cdnjs.cloudflare.com/ajax/libs/seedrandom/2.4.0/seedrandom.min.js");
onmessage = function(e) {
  console.log('Message received from main script');
  if(e.data.nbDrop) {
  	generateMap(e.data);
  } else {
  	blur(e.data);
  }
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function isStable(x, y, values, range, width) {
	var ptsBelow = [];
	var v = values[x+y*width];
	for(var dx = -range ; dx <= range ; dx++) {
		for(var dy = -range ; dy <= range ; dy++) {
			if(x+dx < 0 || x+dx >= width)
				continue
			if(y+dy < 0 || y+dy >= width)
				continue

			if(v>values[x+dx+(y+dy)*width])
				ptsBelow[ptsBelow.length] = {x:(x+dx), y:(y+dy)};
		}
	}

	if(ptsBelow.length > 0) {
		var r = randomIntFromInterval(0, ptsBelow.length-1);
		return ptsBelow[r];
	} else
		return undefined;
}

function blur(data) {
    console.log("[worker] Start blur");

    var gaussian = data.gaussian;
    console.log("[worker] gaussian = " + gaussian);

    var width = data.width;
    var height = data.height;

    var img = data.img;

    // ----------------------------------------------------
    // Apply Gaussian blur

	var gaussianResult = [];
    if(gaussian > 0) {
	    for(var i = 0 ; i < width*height ; i++) {
	    	gaussianResult[i] = 0;
	    }

	    gaussBlur_4(img, gaussianResult, width, height, gaussian);
	} else {
		gaussianResult = img;
	}

	// ----------------------------------------------------
	// compute min and max value

	var maxVal = 0;
    var minVal = 5000;
    for(var i = 0 ; i < width*height ; i++) {
    	if(gaussianResult[i]<minVal)
    		minVal = gaussianResult[i];
    	if(gaussianResult[i]>maxVal)
    		maxVal = gaussianResult[i];
    }

    console.log("[worker] maxVal: " + maxVal);
	console.log("[worker] minVal: " + minVal);

	
    // ----------------------------------------------------
    // Send back the result
    postMessage({type:"Result", data:gaussianResult, maxVal:maxVal, minVal:minVal});

    // ----------------------------------------------------

}

function generateMap(data) {
    console.log("[worker] Start generating map");

    // ----------------------------------------------------
    // Get parameter from HTML
	var nbDrop = data.nbDrop;
    console.log("[worker] nbDrop = " + nbDrop);
    
	var minPart = data.minPart;
    console.log("[worker] minPart = " + minPart);
    
	var maxPart = data.maxPart;
    console.log("[worker] maxPart = " + maxPart);

    var maxRetry = data.maxRetry;
    console.log("[worker] maxRetry = " + maxRetry);

    var agitateRange = data.agitateRange;
    console.log("[worker] agitateRange = " + agitateRange);

    var gaussian = data.gaussian;
    console.log("[worker] gaussian = " + gaussian);

    var width = data.width;
    var height = data.height;

    var seed = data.seed;
    console.log("[worker] seed = " + seed);

    Math.seedrandom(seed);

    // ----------------------------------------------------
    // Initialise the height map
    var heightMap = [];
    for(var i = 0 ; i < width*height ; i++) {
    	heightMap[i] = 0;
    }
    
    // ----------------------------------------------------
    // Generate the map

    var maxVal = 1;
    // For each drop:
    for (var i = 0 ; i < nbDrop ; i++) {
    	postMessage({type:"Update", val:100*(i/nbDrop)});
    	var dropX = randomIntFromInterval(1, width-2);
    	var dropY = randomIntFromInterval(1, height-2);
    	var nbPart = randomIntFromInterval(minPart, maxPart);
    	//console.log("  drop [" + i + "]: [" + dropX + ", " + dropY + "] " + nbPart);

    	// For each particule
    	for(var j = 0 ; j < nbPart ; j++) {
    		//console.log("    part [" + j + "]");
    		var partX = dropX;
    		var partY = dropY;
    		var pt = isStable(partX, partY, heightMap, agitateRange, width);
    		var retry = 0;
    		while(pt && retry < maxRetry) {
    			retry++;
    			partX = pt.x;
    			partY = pt.y;
    			//console.log("    agitate:[" + pt.x + ", " + pt.y + "]");
    			pt = isStable(pt.x, pt.y, heightMap, agitateRange, width);
    			
    		}
    		
    		heightMap[partX + partY*width]++;
    		if(maxVal < heightMap[partX + partY*width])
    			maxVal = heightMap[partX + partY*width];
    	}
    };
    
    // Calculate the min value
    var minVal = maxVal;
    for(var i = 0 ; i < width*height ; i++) {
    	if(heightMap[i]<minVal)
    		minVal = heightMap[i];
    }

    console.log("[worker] maxVal: " + maxVal);
	console.log("[worker] minVal: " + minVal);

    postMessage({type:"Update", val:100});

    // ----------------------------------------------------
    // Apply Gaussian blur

    data.img = heightMap;
    blur(data);
    // ----------------------------------------------------
}

// **********************************************************************
// Gaussian blur section

function boxesForGauss(sigma, n)  // standard deviation, number of boxes
{
    var wIdeal = Math.sqrt((12*sigma*sigma/n)+1);  // Ideal averaging filter width 
    var wl = Math.floor(wIdeal);  if(wl%2==0) wl--;
    var wu = wl+2;
				
    var mIdeal = (12*sigma*sigma - n*wl*wl - 4*n*wl - 3*n)/(-4*wl - 4);
    var m = Math.round(mIdeal);
    // var sigmaActual = Math.sqrt( (m*wl*wl + (n-m)*wu*wu - n)/12 );
				
    var sizes = [];  for(var i=0; i<n; i++) sizes.push(i<m?wl:wu);
    return sizes;
}

function gaussBlur_4 (scl, tcl, w, h, r) {
    var bxs = boxesForGauss(r, 3);
    boxBlur_4 (scl, tcl, w, h, (bxs[0]-1)/2);
    boxBlur_4 (tcl, scl, w, h, (bxs[1]-1)/2);
    boxBlur_4 (scl, tcl, w, h, (bxs[2]-1)/2);
}
function boxBlur_4 (scl, tcl, w, h, r) {
    for(var i=0; i<scl.length; i++) tcl[i] = scl[i];
    boxBlurH_4(tcl, scl, w, h, r);
    boxBlurT_4(scl, tcl, w, h, r);
}
function boxBlurH_4 (scl, tcl, w, h, r) {
    var iarr = 1 / (r+r+1);
    for(var i=0; i<h; i++) {
        var ti = i*w, li = ti, ri = ti+r;
        var fv = scl[ti], lv = scl[ti+w-1], val = (r+1)*fv;
        for(var j=0; j<r; j++) val += scl[ti+j];
        for(var j=0  ; j<=r ; j++) { val += scl[ri++] - fv       ;   tcl[ti++] = Math.round(val*iarr); }
        for(var j=r+1; j<w-r; j++) { val += scl[ri++] - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
        for(var j=w-r; j<w  ; j++) { val += lv        - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
    }
}
function boxBlurT_4 (scl, tcl, w, h, r) {
    var iarr = 1 / (r+r+1);
    for(var i=0; i<w; i++) {
        var ti = i, li = ti, ri = ti+r*w;
        var fv = scl[ti], lv = scl[ti+w*(h-1)], val = (r+1)*fv;
        for(var j=0; j<r; j++) val += scl[ti+j*w];
        for(var j=0  ; j<=r ; j++) { val += scl[ri] - fv     ;  tcl[ti] = Math.round(val*iarr);  ri+=w; ti+=w; }
        for(var j=r+1; j<h-r; j++) { val += scl[ri] - scl[li];  tcl[ti] = Math.round(val*iarr);  li+=w; ri+=w; ti+=w; }
        for(var j=h-r; j<h  ; j++) { val += lv      - scl[li];  tcl[ti] = Math.round(val*iarr);  li+=w; ti+=w; }
    }
}
