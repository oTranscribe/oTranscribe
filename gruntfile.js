module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            dist: {
                options: {
                    banner: "var oT = {};(function(){",
                    footer: '}());'
                },
                src: [
                    'src/js/libs/*.js', // All JS in the libs folder
                    'src/js/modules/*.js', // Home for work-in-progress modules
                    'bower_components/otinput/dist/otinput.js',
                    'src/js/app/*.js'
                ],
                dest: 'dist/script.js',
            },
            html: {
                src: [
                    'src/html/*.htm'
                ],
                dest: 'dist/index.html',
            },
            help: {
                src: [
                    'src/help.htm'
                ],
                dest: 'dist/help/index.html',
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
                    {
                        expand: true,
                        flatten: true,
                        src: ['src/js/webL10n/l10n.js'],
                        dest: 'dist/'
                    }
                ],
            },
            manifest: {
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ['src/manifest.appcache'],
                        dest: 'dist/'
                    }
                ],
            }
            
        },
        
        replace: {
            manifest: {
                src: ['dist/manifest.appcache'],
                overwrite: true,
                replacements: [{
                    from: '[timestamp goes here]',
                    to: new Date().toGMTString()
                }]
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
            },
            img: {
                files: ['src/manifest.appcache'],
                tasks: ['copy:manifest'],
                options: {
                    spawn: false,
                }
            },
            replace: {
                files: ['src/*'],
                tasks: ['replace'],
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
    grunt.loadNpmTasks('grunt-text-replace');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat','uglify','sass','copy','replace']);
    grunt.registerTask('watch', ['concat','uglify','sass','copy','replace','watch']);

};
