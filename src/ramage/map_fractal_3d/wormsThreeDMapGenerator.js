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
    var initalt = parseFloat(data.initalt);

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
    for(var i = 0 ; i < height*width ; i++) {
    	heightMap[i] = -1;
    }
    heightMap[0] = initalt;
    heightMap[width*height - 1] = initalt;
    heightMap[width-1] = initalt;
    heightMap[width*(height-1)] = initalt;

    // ----------------------------------------------------
    // Generate the 2D heightmap

    // d -> diamond pass
    // s -> square pass
    // We start with a d pass and the 4 corner (we give the top left and bottom right to define the square)
    var squareStack = [[[0, 0] /*upper left*/, width-1, height-1,
                    Math.max(1-initalt, initalt)-0.001]];

    var diamondStack = [];

    var MODE_SQUARE = 1;
    var MODE_DIAMOND = 2;
    var mode = MODE_SQUARE;

    while(squareStack.length + diamondStack.length > 0) {
        //console.log("stacks length: square[" + squareStack.length + "] diamond[" + diamondStack.length + "]");

        if(mode == MODE_SQUARE) {
            if(squareStack.length <= 0) {
                mode = MODE_DIAMOND;
                continue;
            }
            var elt = squareStack.pop();

            // Stop case
            if(elt[1] <= 1 && elt[2] <= 1)
                continue;

            var tlc = elt[0];
            var sw = elt[1];
            var sh = elt[2];
            var randomRange = elt[3];
            var nextRandomRange = randomRange*roughness;

            var middle = [tlc[0] + sw/2, tlc[1] + sh/2];
            //console.log("tlc " + tlc);
            //console.log("sw, sh " + sw + "   " + sh);
            //console.log("randomRange " + randomRange);
            //console.log("nextRandomRange " + nextRandomRange);

            // Randomize the height value of the middle point
            var average = ReadMap(heightMap, [tlc[0], tlc[1]], width, height);
            average += ReadMap(heightMap, [tlc[0], tlc[1]+sh], width, height);
            average += ReadMap(heightMap, [tlc[0] + sw, tlc[1]+sh], width, height);
            average += ReadMap(heightMap, [tlc[0] + sw,tlc[1]], width, height);
            average /= 4.0;
            //console.log("avg = " + average);
            heightMap[middle[0] + width*middle[1]] = average;
            heightMap[middle[0] + width*middle[1]] += 2*randomRange*Math.random() - randomRange;
            if(heightMap[middle[0] + width*middle[1]] < 0)
                heightMap[middle[0] + width*middle[1]] = 0;
            if(heightMap[middle[0] + width*middle[1]] > 1)
                heightMap[middle[0] + width*middle[1]] = 1;
            //console.log("middle val = " + heightMap[middle[0] + width*middle[1]]);

            // Add the 4 diamonds
            var d1 = {
                c0:[tlc[0] + sw/2, tlc[1] + sh/2], // Used to define the square
                c1:tlc, // Used to define the square
                c2:[tlc[0] + sw/2, tlc[1] - sh/2],
                c3:[tlc[0] + sw, tlc[1]],
                randomRange:nextRandomRange
            };
            diamondStack.push(d1);

            var d2 = {
                c0:[tlc[0] + sw/2, tlc[1] + sh/2], // Used to define the square
                c1:[tlc[0] + sw, tlc[1]], // Used to define the square
                c2:[tlc[0] + sw/2 + sw, tlc[1] + sh/2],
                c3:[tlc[0] + sw, tlc[1] + sh],
                randomRange:nextRandomRange
            };
            diamondStack.push(d2);

            var d3 = {
                c0:[tlc[0] + sw/2, tlc[1] + sh/2], // Used to define the square
                c1:[tlc[0] + sw, tlc[1] + sh], // Used to define the square
                c2:[tlc[0] + sw/2, tlc[1] + sh/2 + sh],
                c3:[tlc[0], tlc[1] + sh],
                randomRange:nextRandomRange
            };
            diamondStack.push(d3);

            var d4 = {
                c0:[tlc[0] + sw/2, tlc[1] + sh/2], // Used to define the square
                c1:[tlc[0], tlc[1] + sh], // Used to define the square
                c2:[tlc[0] + sw/2 - sw, tlc[1] + sh/2],
                c3:tlc,
                randomRange:nextRandomRange
            };
            diamondStack.push(d4);

        } else if(mode == MODE_DIAMOND) {
            if(diamondStack.length <= 0) {
                mode = MODE_SQUARE;
                continue;
            }

            var d = diamondStack.pop();

            //console.log("c1 " + d.c0);
            //console.log("c3 " + d.c2);
            var middle = [d.c1[0] + (d.c3[0] - d.c1[0])/2, d.c1[1] + (d.c3[1] - d.c1[1])/2];
            //console.log("middle " + middle);

            // Randomize the height value of the middle point
            var average = ReadMap(heightMap, d.c0, width, height);
            average += ReadMap(heightMap, d.c1, width, height);
            average += ReadMap(heightMap, d.c2, width, height);
            average += ReadMap(heightMap, d.c3, width, height);
            average /= 4.0;

            //console.log("avg = " + average);
            heightMap[middle[0] + width*middle[1]] = average;
            heightMap[middle[0] + width*middle[1]] += 2*d.randomRange*Math.random() - d.randomRange;
            if(heightMap[middle[0] + width*middle[1]] < 0)
                heightMap[middle[0] + width*middle[1]] = 0;
            if(heightMap[middle[0] + width*middle[1]] > 1)
                heightMap[middle[0] + width*middle[1]] = 1;
            //console.log("middle val = " + heightMap[middle[0] + width*middle[1]]);

            // Add the square
            // Get the upper left corner
            var ulc = GetUpperLeft(d);
            var w = Math.abs(d.c0[0]-d.c1[0]);
            var h = Math.abs(d.c0[1]-d.c1[1]);
            if(w+h>1)
                squareStack.push([ulc /*upper left*/, w, h,d.randomRange]);

        }
    }

/*
    while(stack.length > 0) {
        console.log("stack.length = " + stack.length);
        var elt = stack.pop();

        // Stop case
        if(elt[3][0] - elt[1][0] <= 1 && elt[3][1] - elt[1][1] <= 1)
            continue;

        
        var middle = [elt[1][0] + Math.floor((elt[3][0] - elt[1][0])/2), elt[1][1] + Math.floor((elt[3][1] - elt[1][1])/2)];
        console.log("middle = " + middle);

        var randomRange = elt[5];
        var nextRandomRange = randomRange*roughness;

        // Randomize the height value of the middle point
        var average = heightMap[elt[1][0] + width*elt[1][1]];
        average += heightMap[elt[2][0] + width*elt[2][1]];
        average += heightMap[elt[3][0] + width*elt[3][1]];
        average += heightMap[elt[4][0] + width*elt[4][1]];
        average /= 4.0;
        console.log("avg = " + average);
        heightMap[middle[0] + width*middle[1]] = average;
        heightMap[middle[0] + width*middle[1]] += 2*randomRange*Math.random() - randomRange;
        if(heightMap[middle[0] + width*middle[1]] < 0)
            heightMap[middle[0] + width*middle[1]] = 0;
        if(heightMap[middle[0] + width*middle[1]] > 1)
            heightMap[middle[0] + width*middle[1]] = 1;
        console.log("middle val = " + heightMap[middle[0] + width*middle[1]]);

        // Calculate the diamonds

        //Diamond 1 (left)
        var pt1 = sanetize(elt[1], width, height);
        var pt2 = sanetize(elt[2], width, height);
        var pt3 = sanetize(middle, width, height);
        var pt4 = sanetize([elt[1][0] - (middle[0]-elt[1][0]), middle[1]], width, height);
        console.log("pt1 " + pt1 + " = " + heightMap[pt1[0] + width*pt1[1]]);
        console.log("pt2 " + pt2 + " = " + heightMap[pt2[0] + width*pt2[1]]);
        console.log("pt3 " + pt3 + " = " + heightMap[pt3[0] + width*pt3[1]]);
        console.log("pt4 " + pt4 + " = " + heightMap[pt4[0] + width*pt4[1]]);

        average  = heightMap[pt1[0] + width*pt1[1]];
        average += heightMap[pt2[0] + width*pt2[1]];
        average += heightMap[pt3[0] + width*pt3[1]];
        average += heightMap[pt4[0] + width*pt4[1]];
        average /= 4.0;

        console.log("avg1 = " + average);
        heightMap[elt[1][0] + width*middle[1]] = average;
        heightMap[elt[1][0] + width*middle[1]] += 2*randomRange*Math.random() - randomRange;
        if(heightMap[elt[1][0] + width*middle[1]] < 0)
            heightMap[elt[1][0] + width*middle[1]] = 0;
        if(heightMap[elt[1][0] + width*middle[1]] > 1)
            heightMap[elt[1][0] + width*middle[1]] = 1;

        //Diamond 2 (bottom)
        pt1 = sanetize(middle, width, height);
        pt2 = sanetize(elt[2], width, height);
        pt3 = sanetize(elt[3], width, height);
        pt4 = sanetize([middle[0], elt[2][1] - (middle[1]-elt[2][1])], width, height);
        console.log("pt1 " + pt1 + " = " + heightMap[pt1[0] + width*pt1[1]]);
        console.log("pt2 " + pt2 + " = " + heightMap[pt2[0] + width*pt2[1]]);
        console.log("pt3 " + pt3 + " = " + heightMap[pt3[0] + width*pt3[1]]);
        console.log("pt4 " + pt4 + " = " + heightMap[pt4[0] + width*pt4[1]]);

        average  = heightMap[pt1[0] + width*pt1[1]];
        average += heightMap[pt2[0] + width*pt2[1]];
        average += heightMap[pt3[0] + width*pt3[1]];
        average += heightMap[pt4[0] + width*pt4[1]];
        average /= 4.0;

        console.log("avg2 = " + average);
        heightMap[middle[0] + width*elt[2][1]] = average;
        heightMap[middle[0] + width*elt[2][1]] += 2*randomRange*Math.random() - randomRange;
        if(heightMap[middle[0] + width*elt[2][1]] < 0)
            heightMap[middle[0] + width*elt[2][1]] = 0;
        if(heightMap[middle[0] + width*elt[2][1]] > 1)
            heightMap[middle[0] + width*elt[2][1]] = 1;

        //Diamond 3 (right)
        pt1 = sanetize(middle, width, height);
        pt2 = sanetize(elt[3], width, height);
        pt3 = sanetize(elt[4], width, height);
        pt4 = sanetize([elt[3][0] + (elt[3][0]-middle[0]), middle[1]], width, height);
        console.log("pt1 " + pt1 + " = " + heightMap[pt1[0] + width*pt1[1]]);
        console.log("pt2 " + pt2 + " = " + heightMap[pt2[0] + width*pt2[1]]);
        console.log("pt3 " + pt3 + " = " + heightMap[pt3[0] + width*pt3[1]]);
        console.log("pt4 " + pt4 + " = " + heightMap[pt4[0] + width*pt4[1]]);

        average  = heightMap[pt1[0] + width*pt1[1]];
        average += heightMap[pt2[0] + width*pt2[1]];
        average += heightMap[pt3[0] + width*pt3[1]];
        average += heightMap[pt4[0] + width*pt4[1]];
        average /= 4.0;

        console.log("avg3 = " + average);
        heightMap[elt[3][0] + width*middle[1]] = average;
        heightMap[elt[3][0] + width*middle[1]] += 2*randomRange*Math.random() - randomRange;
        if(heightMap[elt[3][0] + width*middle[1]] < 0)
            heightMap[elt[3][0] + width*middle[1]] = 0;
        if(heightMap[elt[3][0] + width*middle[1]] > 1)
            heightMap[elt[3][0] + width*middle[1]] = 1;

        //Diamond 4 (top)
        pt1 = sanetize(middle, width, height);
        pt2 = sanetize(elt[4], width, height);
        pt3 = sanetize(elt[1], width, height);
        pt4 = sanetize([middle[0], elt[1][1] + (elt[1][1] - middle[1])], width, height);
        console.log("pt1 " + pt1 + " = " + heightMap[pt1[0] + width*pt1[1]]);
        console.log("pt2 " + pt2 + " = " + heightMap[pt2[0] + width*pt2[1]]);
        console.log("pt3 " + pt3 + " = " + heightMap[pt3[0] + width*pt3[1]]);
        console.log("pt4 " + pt4 + " = " + heightMap[pt4[0] + width*pt4[1]]);

        average  = heightMap[pt1[0] + width*pt1[1]];
        average += heightMap[pt2[0] + width*pt2[1]];
        average += heightMap[pt3[0] + width*pt3[1]];
        average += heightMap[pt4[0] + width*pt4[1]];
        average /= 4.0;

        console.log("avg4 = " + average);
        heightMap[middle[0] + width*elt[1][1]] = average;
        heightMap[middle[0] + width*elt[1][1]] += 2*randomRange*Math.random() - randomRange;
        if(heightMap[middle[0] + width*elt[1][1]] < 0)
            heightMap[middle[0] + width*elt[1][1]] = 0;
        if(heightMap[middle[0] + width*elt[1][1]] > 1)
            heightMap[middle[0] + width*elt[1][1]] = 1;

        // Push the square phase
        stack.push([0, [elt[1][0], middle[1]], elt[2], [middle[0], elt[2][1]], middle, nextRandomRange]);
        //stack.push([0, middle, [middle[0], elt[2][1]], elt[3], [elt[3][0], middle[1]], nextRandomRange]);
        //stack.push([0, [middle[0], elt[1][1]], middle, [elt[4][0], middle[1]], elt[4], nextRandomRange]);
        //stack.push([0, elt[1], [elt[1][0], middle[1]], middle, [middle[0], elt[1][1]], nextRandomRange]);

    }
*/
    // ----------------------------------------------------
    // Create the final visualisation

    for(var i = 0 ; i < height * width ; i++) {
    	heightMap[i] *= 255;
    }

    postMessage({type:"Result", data:heightMap});

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