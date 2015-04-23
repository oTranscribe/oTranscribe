module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {   
            dist: {
                src: [
                    'src/js/libs/*.js', // All JS in the libs folder
                    'src/js/intro.js'
                  , 'src/js/media.js'
                  , 'src/js/input.js'
                  , 'src/js/message-panel.js'
                  , 'src/js/import.js'
                  , 'src/js/texteditor.js'
                  , 'src/js/timestamp.js'
                  , 'src/js/other.js'
                  , 'src/js/backup.js'
                  , 'src/js/init.js'
                  , 'src/js/google.js'
                  , 'src/js/export.js'
                  , 'src/js/languages.js'
                  , 'src/js/ui.js'
                  , 'src/js/timestamp_ext.js'
                ],
                dest: 'dist/script.js',
            },
            html: {
                src: [
                    'src/html/*.htm'
                ],
                dest: 'dist/index.html',
            },
            l10n: {
                src: [
                    'src/l10n/english.ini'
                  , 'src/l10n/*.ini'
                ],
                dest: 'dist/data.ini',
            }
            
            
        },
        
        uglify: {
            build: {
                options: {
                    sourceMap: true
                },
                
                files: {
                    'dist/script.js': ['dist/script.js']
                }
            }
        },
        
        sass: {
            dist: {
                options: {
                    style: 'compressed'
                },
                files: {
                    'dist/style.css': 'src/scss/base.scss'
                }
            } 
        },
        
        copy: {
            img: {
                files: [
                    // includes files within path
                    {
                        expand: true,
                        flatten: true,
                        src: ['src/img/*'],
                        dest: 'dist/img/'
                    }
                ],
            },
            l10n: {
                files: [
                    // includes files within path
                    {
                        expand: true,
                        flatten: true,
                        src: ['src/js/webL10n/l10n.js'],
                        dest: 'dist/'
                    }
                ],
            }
        },

        
        watch: {
            options: {
                livereload: true,
            },
            scripts: {
                files: ['src/js/*.js', 'otranscribe.js'],
                tasks: ['concat', 'uglify'],
                options: {
                    spawn: false,
                },
            },
            html: {
                files: ['src/html/*.htm'],
                tasks: ['concat'],
                options: {
                    spawn: false,
                },
            },
            l10n: {
                files: ['src/l10n/*.ini','js/webL10n/l10n.js'],
                tasks: ['concat','copy:l10n'],
                options: {
                    spawn: false,
                },
            },
            css: {
                files: ['src/scss/*.scss'],
                tasks: ['sass'],
                options: {
                    spawn: false,
                }
            },
            img: {
                files: ['src/img/*'],
                tasks: ['copy:img'],
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
    grunt.loadNpmTasks('grunt-contrib-copy');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat','uglify','sass','copy']);
    grunt.registerTask('watch', ['concat','uglify','sass','copy','watch']);

};
