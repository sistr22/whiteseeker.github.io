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
      build: {
      },
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

    connect: {
      server: {
        options: {
          port: 9001,
          base: 'www-root',
          keepalive: true,
          base: '_site'
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
  // Plugin to minify html
  grunt.loadNpmTasks('grunt-contrib-htmlmin');

  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('build', [
    'uglify',
    'pages',
    'htmlmin'
  ]);

  // Default task(s).
  grunt.registerTask('default', ['build', 'connect']);

  grunt.registerTask('deploy', ['buildcontrol']);

}