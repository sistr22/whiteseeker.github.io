var webp=require('webp-converter');

var path = require('path');

if(process.argv[2] == undefined) {
  new Error("No input file !");
}
console.log('webp: ' + process.argv[2]);

if(process.argv[2].endsWith(".gif")){
  webp.gwebp(
    process.argv[2], // source
    process.argv[2]+'.webp', // destination
    "-lossy -f 20 -kmin 9 -kmax 17 -mt -m 6 -q 50",
    function(status) {
      console.log("webp status: " + status);
    }
  );
} else {
  var opts = "-q 55 -alpha_q 0 -m 6 -mt";
  if(process.argv[3] == "dev") {
    console.log("webp dev mode == quick compression");
    opts = "-q 55 -alpha_q 0 -m 2 -mt";
  }
  webp.cwebp(
    process.argv[2], // source
    process.argv[2]+'.webp', // destination
    opts,
    function(status) {
      console.log("webp status: " + status);
    }
  );
}