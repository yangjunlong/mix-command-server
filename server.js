/**
 * mix command server
 * 
 * usage
 * mix server [options]
 * 
 * @author  Yang,junlong at 2016-03-03 17:51:09 build.
 * @version $Id$
 */

'use strict';

require('./lib/server.js');

exports.name = 'server';
exports.usage = '<command> [options]';
exports.desc = 'launch a web server';

// var child_process = require('child_process');
// var spawn = child_process.spawn;
// var args = [
//         '-k',
//         // '-Djava.nio.channels.spi.SelectorProvider=sun.nio.ch.PollSelectorProvider',
//         'start'
//     ];
// var server = spawn('apachectl', args, { cwd : __dirname, detached: true });
// console.log(server.pid);

// register mix server commander to mix cli
exports.register = function(commander) {

    commander
        .option('-p, --port <int>', 'server listen port', parseInt, 8080)
        .option('--root <path>', 'document root', String, mix.server.util.getHtdocs())
        .option('--type <php|java|node>', 'process language', String, fis.config.get('server.type', 'java'))
        .option('--rewrite [script]', 'enable rewrite mode', String, fis.config.get('server.rewrite', false))
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
            var args = Array.prototype.slice.call(arguments);
            var options = args.pop();
            var cmd = args.shift();
            var root = options.root;
            var type = options.type;
            var cwd = fis.util.realpath(process.cwd());
            var confname = 'mix-conf.js';
            var conffile;

            // init project
            // fis.project.setProjectRoot(cwd);

            if(!conffile && fis.util.isFile(cwd + '/' + confname)){
                conffile = cwd + '/' + confname;
            }

            if(!conffile){
                // try to find fis-conf.js
                var pos = cwd.length;
                do {
                    cwd  = cwd.substring(0, pos);
                    conffile = cwd + '/' + confname;
                    if(fis.util.exists(conffile)){
                        root = cwd;
                        break;
                    } else {
                        conffile = false;
                        pos = cwd.lastIndexOf('/');
                    }
                } while(pos > 0);
            }

            // require mix-conf.js
            if(conffile){
                var cache = fis.cache(conffile, 'conf');
                if(!cache.revert()){
                    options.clean = true;
                    cache.save();
                }
                require(conffile);
                fis.emitter.emit('mix-conf:loaded');
            }

            // if(root){
            //     if(fis.util.exists(root) && !fis.util.isDir(root)){
            //         fis.log.error('invalid server document root [' + root + ']');
            //     } else {
            //         fis.util.mkdir(root);
            //     }
            // } else {
            //     fis.log.error('missing document root');
            // }

            var opt = {};
            fis.util.map(options, function(key, value){
                if(typeof value !== 'object' && key[0] !== '_'){
                    opt[key] = value;
                }
            });

            var server = mix.require('server', type);
            if (!server) {
                server = fis.require('server', 'jetty');
            }

            // init server
            //server.init(opt);
            switch (cmd) {
                case 'start':
                    // restart server
                    server.stop(function() {
                        server.start(opt);
                    });
                    break;
                case 'stop':
                    server.stop(function() {
                        // TODO nothing
                    });
                    break;
                case 'restart':
                    server.stop(server.start);
                    break;
                case 'install':
                    var names = args.shift();
                    download(names);
                    break;
                case 'info':
                    server.info();
                    break;
                case 'open':
                    server.open(root);
                    break;
                case 'clean':
                    process.stdout.write(' δ '.bold.yellow);
                    var now = Date.now();
                    var user_include = fis.config.get('server.clean.include');
                    var user_exclude = fis.config.get('server.clean.exclude');
                    //flow: command => user => default
                    var include = options.include  ? glob(options.include, htdocs) : (user_include ? glob(user_include, htdocs) : null);
                    var exclude = options.exclude ? glob(options.exclude, htdocs) : (user_exclude ? glob(user_exclude, htdocs) : /\/WEB-INF\/cgi\//);
                    fis.util.del(htdocs, include, exclude);
                    process.stdout.write((Date.now() - now + 'ms').green.bold);
                    process.stdout.write('\n');
                    break;
                case 'init':
                    var libs = fis.config.get('server.libs');
                    if (fis.util.is(libs, 'Array')) {
                        libs.forEach(function(name) {
                            download(name);
                        });
                    } else if(fis.util.is(libs, 'String')) {
                        download(libs);
                    }
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
