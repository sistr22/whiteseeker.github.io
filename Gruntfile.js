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
        	'css/photoswipe/photoswipe-ui-default.min.js': ['css/photoswipe/photoswipe-ui-default.js'],
        	'css/photoswipe/photoswipe.min.js': ['css/photoswipe/photoswipe.js'],
        	'css/material.min.js': ['css/material.js']
      	}
      }
    },

    pages: {
	    options: {
	      bundleExec: true,
	      safe: true,
	      draft: false
	    },
      build: {                             // Target
        options: {                        // Target options
        }
      },
	    serve: {                            // Another target
        options: {
          serve: true,
          drafts: true
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
  	}
  });

  // Uglify plugin (to minify javascript)
  grunt.loadNpmTasks('grunt-contrib-uglify');
  // jekyll plugin (To run jekyll)
  grunt.loadNpmTasks('grunt-jekyll-pages');
  // Plugin to deploy on github pages
  grunt.loadNpmTasks('grunt-build-control');

  grunt.registerTask('build', [
    'uglify',
    'pages:serve'
  ]);

  // Default task(s).
  grunt.registerTask('default', ['build']);

  grunt.registerTask('deploy', ['buildcontrol']);


}