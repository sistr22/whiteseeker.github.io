'use strict';

module.exports = function(grunt) {

 // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        screwIE8: true
      },
      build: {
        options: {
          preserveComments: false
        },
      	files: {
        	'_site/css/photoswipe/photoswipe-ui-default.min.js': ['src/css/photoswipe/photoswipe-ui-default.js'],
        	'_site/css/photoswipe/photoswipe.min.js': ['src/css/photoswipe/photoswipe.js'],
        	'_site/scripts/material.min.js': ['src/css/material.js'],
          '_site/scripts/modernizr-custom.min.js': ['src/scripts/modernizr-custom.js'],
          '_site/service-worker.js': ['src/scripts/service-worker.js'],
      	}
      }
    },

    pages: {
	    options: {
	      bundleExec: true,
	      safe: true,
	      draft: true,
        src: 'src/',
        layouts: 'src/_layouts'
	    },
      build: {
      },
      serve: {
        options: {
          serve: true,
          watch: false
        }
      }
    },

    buildcontrol: {
      options: {
        dir: '_site',
        commit: true,
        push: true,
        message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
      },
      pages: {
        options: {
          remote: 'git@github.com:Whiteseeker/whiteseeker.github.io.git',
          branch: 'master'
        }
      }
  	}, 

    htmlmin: {
      build: {
        options: {
          removeComments: true,
          collapseWhitespace: true,
        },
        files: [{
          expand: true, 
          cwd: '_site/',
          src: 'src/**/*.html',
          dest: '_site/'
        }]
      }
    },

    penthouse: {
      extract : {
        outfile : '_site/css/critical.css',
        css : '_site/css/merged.min.css',
        url : 'http://localhost:4000',
        width : 1200,
        height : 900,
        skipErrors : false // this is the default
      }
    },

    cssmin: {
      options: {
        shorthandCompacting: true,
        roundingPrecision: -1,
        keepSpecialComments: 0
      },
      main: {
        files: {
          '_site/css/merged.min.css': ['src/css/material.css', 'src/css/photoswipe.css', 'src/css/style.css', 'src/css/default-skin.css', 'src/css/syntax-hightlighting.css'],
        }
      },
      critical: {
        files: {
          '_site/css/critical.min.css': ['_site/css/critical.css']
        }
      }
    },

    cwebp: {
      images: {
        options: {
          arguments: [ '-q', 50 ],
          concurrency: 20
        },
        files: [
          { src: [ '_site/assets/images/**/*.png'] }
        ]
      }
    },

    modernizr: {
      build: {
        "dest" : "_site/scripts/modernizr.js",
        "parseFiles": false,
        "customTests": [],
        "devFile": "src/scripts/modernizr-custom.js",
        "outputFile": "src/scripts/modernizr-custom.js",
        "tests": [
          "img/webp"
        ],
        "extensibility": [
          "setClasses"
        ],
        "uglify": true
      }
    },

    uncss: {

      dist: {
        options: {
          report: 'min', // optional: include to report savings
          media: [ '(min-width: 768px)', '(min-width: 992px)', '(min-width: 1200px)' ],
          stylesheets : ['_site/css/merged.min.css', '_site/css/critical.min.css'],
          ignoreSheets: [ '/fonts.googleapis/' ],
        },
        files: {
          '_site/css/toto.css': ['_site/index.html', '_site/about/index.html']
        }
      }
    },

    copy: {
      main: {
        nonull: true,
        files: {
          '_site/css/photoswipe/photoswipe-ui-default.min.js': ['src/css/photoswipe/photoswipe-ui-default.js'],
          '_site/css/photoswipe/photoswipe.min.js': ['src/css/photoswipe/photoswipe.js'],
          '_site/scripts/material.min.js': ['src/css/material.js'],
          '_site/scripts/modernizr-custom.min.js': ['src/scripts/modernizr-custom.js'],
          '_site/service-worker.js': ['src/scripts/service-worker.js'],
        }
      },
    }

    
  });

  // Uglify plugin (to minify javascript)
  grunt.loadNpmTasks('grunt-contrib-uglify');
  // jekyll plugin (To run jekyll)
  grunt.loadNpmTasks('grunt-jekyll-pages');
  // Plugin to deploy on github pages
  grunt.loadNpmTasks('grunt-build-control');
  // Plugin to minify html
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  // Get critical above the fold css
  grunt.loadNpmTasks('grunt-penthouse');
  // Minify css
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.loadNpmTasks('grunt-webp-compress');

  grunt.loadNpmTasks('grunt-modernizr');
  // Remove unused css
  grunt.loadNpmTasks('grunt-uncss');

  // Copy file (to copy css during development)
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('build', [
    'pages:build',
    'htmlmin',
    'cssmin:main',
    'penthouse',
    'cssmin:critical',
    'uglify',
    'cwebp'
  ]);

   grunt.registerTask('buildev', [
    'pages:build',
    'htmlmin',
    'cssmin:main',
    'penthouse',
    'cssmin:critical',
    'copy',
    'cwebp'
  ]);

  // Default task(s).
  grunt.registerTask('default', ['build']);

  grunt.registerTask('deploy', ['buildcontrol']);

  grunt.registerTask('connect', ['pages:serve']);

}