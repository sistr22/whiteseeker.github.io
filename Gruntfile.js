'use strict';

module.exports = function(grunt) {

 // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
        screwIE8: true,
        mangle: false

      },
      build: {
      	files: {
        	'_site/css/photoswipe/photoswipe-ui-default.min.js': ['css/photoswipe/photoswipe-ui-default.js'],
        	'_site/css/photoswipe/photoswipe.min.js': ['css/photoswipe/photoswipe.js'],
        	'_site/css/material.min.js': ['css/material.js']
      	}
      }
    },

    pages: {
	    options: {
	      bundleExec: true,
	      safe: true,
	      draft: false
	    },
      build: {
      },
      serve: {
        options: {
          serve: true,
          drafts: true,
          watch: true
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
          src: '**/*.html',
          dest: '_site/'
        }]
      }
    },

    penthouse: {
      extract : {
        outfile : './css/critical.css',
        css : './_site/css/merged.min.css',
        url : 'http://localhost:4000',
        width : 1200,
        height : 900,
        skipErrors : false // this is the default
      }
    },

    cssmin: {
      options: {
        shorthandCompacting: false,
        roundingPrecision: -1
      },
      target: {
        files: {
          '_site/css/merged.min.css': ['css/material.css', 'css/fonts.css', 'css/icon.css', 'css/photoswipe.css', 'css/style.css', 'css/default-skin.css', 'css/syntax-hightlighting.css'],
          '_site/css/critical.min.css': ['css/critical.css']
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
          { src: [ '_site/assets/images/**/*_small.png' ] }
        ]
      }
    },

    modernizr: {
      build: {
        "dest" : "_site/scripts/modernizr.js",
        "parseFiles": false,
        "customTests": [],
        "devFile": "scripts/modernizr-custom.js",
        "outputFile": "scripts/modernizr-custom.js",
        "tests": [
          "img/webp"
        ],
        "extensibility": [
          "setClasses"
        ],
        "uglify": true
      }
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

  grunt.registerTask('build', [
    'pages:build',
    'htmlmin',
    'cssmin',
    'uglify',
    'cwebp' ,
    'modernizr'
  ]);

  grunt.registerTask('css', ['build', 'penthouse']);

  // Default task(s).
  grunt.registerTask('default', ['build']);

  grunt.registerTask('deploy', ['buildcontrol']);

  grunt.registerTask('connect', ['pages:serve']);

}