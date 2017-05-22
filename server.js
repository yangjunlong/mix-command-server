/**
 * mix command server
 * 
 * usage
 * mix server [options] (start|stop|restart|info|clean|open)
 *
 * mix-conf.js:
 * {
 *     server: {
 *         type: 'node', // server type
 *         port: '',
 *         rewrite: 'true',
 *         root: '', // document root
 *         start: '',
 *         stop: '',
 *         restart: '',
 *         version: '',
 *         proxy: {
 *             // server proxy
 *         }
 *         timeout: '',
 *         
 *     }
 * }
 * 
 * @author  Yang,junlong at 2016-03-03 17:51:09 build.
 * @version $Id$
 */

'use strict';

exports.name = 'server';
exports.usage = '<command> [options]';
exports.desc = 'launch a web server';

exports.register = function(commander) {
    var __server = new mix.server();
    commander
        .option('-p, --port <int>', 'server listen port', parseInt, 8080)
        .option('--root <path>', 'document root', String, __server.getRoot())
        .option('--type <php|java|node>', 'process language', String, mix.config.get('server.type', 'java'))
        .option('--rewrite [script]', 'enable rewrite mode', String, mix.config.get('server.rewrite', false))
        //.option('--repos <url>', 'install repository', String, process.env.FIS_SERVER_REPOSITORY)
        .option('--timeout <seconds>', 'start timeout', parseInt, 15)
        .option('--php_exec <path>', 'path to php-cgi executable file', String, 'php-cgi')
        .option('--php_exec_args <args>', 'php-cgi arguments', String)
        .option('--php_fcgi_children <int>', 'the number of php-cgi processes', parseInt)
        .option('--php_fcgi_max_requests <int>', 'the max number of requests', parseInt)
        .option('--registry <registry>', 'set npm registry', 'https://registry.npmjs.org')
        .option('--include <glob>', 'clean include filter', String)
        .option('--exclude <glob>', 'clean exclude filter', String)
        .option('--https', 'start https server')
        .action(function(){
            var defaults = __server.option();
            var args = Array.prototype.slice.call(arguments);
            
            // filter options
            var options = {};
            mix.util.map(args.pop(), function(value, key){
                if(typeof value !== 'object' && key[0] !== '_'){
                    options[key] = value;
                }
            });

            var cmd = args.shift();
            var root = options.root;
            var type = options.type;
            var cwd = mix.util.realpath(process.cwd());
            var confname = 'mix-conf.js';
            var conffile;

            if(!conffile && mix.util.isFile(cwd + '/' + confname)){
                conffile = cwd + '/' + confname;
            }

            if(!conffile){
                // try to find mix-conf.js
                var pos = cwd.length;
                do {
                    cwd  = cwd.substring(0, pos);
                    conffile = cwd + '/' + confname;
                    if(mix.util.exists(conffile)){
                        // TODO nothing
                        break;
                    } else {
                        conffile = false;
                        pos = cwd.lastIndexOf('/');
                    }
                } while(pos > 0);
            }

            // require mix-conf.js
            if(conffile){
                var cache = mix.cache(conffile, 'conf');
                if(!cache.revert()){
                    options.clean = true;
                    cache.save();
                }
                require(conffile);
                mix.emitter.emit('mix-conf:loaded');
            }

            if(root){
                if(mix.util.exists(root) && !mix.util.isDir(root)){
                    mix.log.error('invalid server document root [' + root + ']');
                } else {
                    mix.util.mkdir(root);
                }
            } else {
                mix.log.error('missing document root');
            }

            // set process name
            options['process'] = 'mix';

            // require server by type [java php node smarty tomcat jetty apache nginx] etc.
            if (cmd) {
                var server = mix.require('server', type, module);
                if (!server) {
                    mix.log.warning('unable to load plugin '+ ('mix-server-' + type).green.bold + ', try: npm install -g mix-server-' + type);
                    mix.log.notice('using default server ' + 'mix-server-jetty'.gray.bold);
                    server = mix.require('server', 'jetty');
                }
            }

            // 启动服务
            function start() {
                server.start(options, function(cp, option){
                    if(cp.pid) {
                        server.setPid(cp.pid);
                        server.option(option);
                        var protocol = option.https ? "https" : "http";
                        mix.util.open(protocol + '://127.0.0.1' + (option.port == 80 ? '/' : ':' + option.port + '/'), function(){
                            process.exit();
                        });
                    } else {
                        mix.log.error('You must pass start method parameters callback(child_process)');
                    }
                });
            }

            switch (cmd) {
                case 'start':
                    start();
                    break;
                case 'stop':
                    server.stop(function() {
                        // TODO nothing
                    });
                    break;
                case 'restart':
                    server.stop(start);
                    break;
                case 'install':
                    //var names = args.shift();
                    //download(names);
                    break;
                case 'info':
                    server.info();
                    break;
                case 'open':
                    server.open();
                    break;
                case 'clean':
                    var glob = mix.util.glob;
                    process.stdout.write(' δ '.bold.yellow);
                    var now = Date.now();
                    var user_include = mix.config.get('server.clean.include');
                    var user_exclude = mix.config.get('server.clean.exclude');
                    //flow: command => user => default
                    var include = options.include  ? glob(options.include, root) : (user_include ? glob(user_include, root) : null);
                    var exclude = options.exclude ? glob(options.exclude, root) : (user_exclude ? glob(user_exclude, root) : /\/WEB-INF\/cgi\//);
                    mix.util.del(root, include, exclude);
                    process.stdout.write((Date.now() - now + 'ms').green.bold);
                    process.stdout.write('\n');
                    break;
                case 'init':
                    // var libs = mix.config.get('server.libs');
                    // if (mix.util.is(libs, 'Array')) {
                    //     libs.forEach(function(name) {
                    //         download(name);
                    //     });
                    // } else if(mix.util.is(libs, 'String')) {
                    //     download(libs);
                    // }
                    break;
                default :
                    commander.help();
            }
        });

    // mix server cmd define
    commander
        .command('start')
        .description('start server');

    commander
        .command('stop')
        .description('shutdown server');

    commander
        .command('restart')
        .description('restart server');

    commander
        .command('info')
        .description('output server info');

    commander
        .command('open')
        .description('open document root directory');

    commander
        .command('clean')
        .description('clean files in document root');
};
