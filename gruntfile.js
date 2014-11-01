module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {   
            dist: {
                src: [
                    'js/libs/*.js', // All JS in the libs folder
                    'js/intro.js'
                  , 'js/media.js'
                  , 'js/input.js'
                  , 'js/message-panel.js'
                  , 'js/import.js'
                  , 'js/texteditor.js'
                  , 'js/timestamp.js'
                  , 'js/other.js'
                  , 'js/backup.js'
                  , 'js/init.js'
                  , 'js/google.js'
                  , 'js/export.js'
                  , 'js/languages.js'
                  , 'js/ui.js'
                  , 'js/timestamp_ext.js'
                ],
                dest: 'script.js',
            },
            html: {
                src: [
                    'html/*.htm'
                ],
                dest: 'index.html',
            },
            l10n: {
                src: [
                    'l10n/english.ini'
                  , 'l10n/*.ini'
                ],
                dest: 'data.ini',
            }
            
            
        },
        
        uglify: {
            build: {
                options: {
                    sourceMap: true
                },
                files: {
                    src: 'script.js',
                    dest: 'script.js'
                }
            }
        },
        
        sass: {
            dist: {
                options: {
                    style: 'compressed'
                },
                files: {
                    'style.css': 'scss/base.scss'
                }
            } 
        },
        
        watch: {
            options: {
                livereload: true,
            },
            scripts: {
                files: ['js/*.js', 'otranscribe.js'],
                tasks: ['concat', 'uglify'],
                options: {
                    spawn: false,
                },
            },
            html: {
                files: ['html/*.htm'],
                tasks: ['concat'],
                options: {
                    spawn: false,
                },
            },
            l10n: {
                files: ['l10n/*.ini'],
                tasks: ['concat'],
                options: {
                    spawn: false,
                },
            },
            css: {
                files: ['scss/*.scss'],
                tasks: ['sass'],
                options: {
                    spawn: false,
                }
            }
        }
        
        

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat','uglify','sass','watch']);

};
