var penthouse = require('penthouse'),
    path = require('path'),
    fs = require('fs');

penthouse({
    url: 'http://127.0.0.1:5000/',
    css: '_site/css/merged.min.css',
    // OPTIONAL params 
    width: 1200,                    // viewport width 
    height: 900,                    // viewport height 
    timeout: 30000,                 // ms; abort critical CSS generation after this timeout 
    strict: true,                   // set to true to throw on CSS errors (will run faster if no errors) 
    maxEmbeddedBase64Length: 1000,  // characters; strip out inline base64 encoded resources larger than this 
    userAgent: 'Penthouse Critical Path CSS Generator', // specify which user agent string when loading the page 
    renderWaitTime: 1000,           // ms; render wait timeout before CSS processing starts (default: 100) 
    blockJSRequests: false          // set to false to load (external) JS (default: true) 
}, function(err, criticalCss) {
    if (err) {
        // handle error 
        throw err;
    }
 
    fs.writeFileSync('_site/css/critical.css', criticalCss);
});