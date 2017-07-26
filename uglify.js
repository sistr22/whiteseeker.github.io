var UglifyJS = require("uglify-js");
var fs = require('fs'); 

var inputs = ['src/css/photoswipe/photoswipe-ui-default.js',
              'src/css/photoswipe/photoswipe.js',
              'src/css/material.js',
              'src/scripts/modernizr-custom.js',
              'src/scripts/service-worker.js',
              'src/scripts/gl-matrix-2.4.0.js' ];

var outputs= ['_site/css/photoswipe/photoswipe-ui-default.min.js',
              '_site/css/photoswipe/photoswipe.min.js',
              '_site/scripts/material.min.js',
              '_site/scripts/modernizr-custom.min.js',
              '_site/service-worker.js',
              '_site/scripts/gl-matrix-2.4.0.min.js'];

var uglifyOpts = null;
if(process.argv[2] == "dev") {
  uglifyOpts = {
    beautify : true,
    comments : true
  };
  console.log('Dev mode, we don\'t uglify !');
}
var i;

for (i = 0 ; i < inputs.length ; i++) {
  console.log("input: ", inputs[i], " output: ", outputs[i]);
  var result = UglifyJS.minify(inputs[i], {output : uglifyOpts});
  fs.writeFile(outputs[i], result.code, function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("success");
    }
  });
}
