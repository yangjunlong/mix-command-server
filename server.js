/**
 * mix command server
 * 
 * usage
 * mix server [options]
 * 
 * @author  Yang,junlong at 2016-03-03 17:51:09 build.
 * @version $Id: server.js 13560 2016-03-17 07:59:44Z yangjunlong $
 */

'use strict';

var util = require('./lib/util.js');
var server = require('./lib/server.js');

mix.server.util = require('./lib/util.js');

mix.server.DEFAULT_REMOTE_REPOS = '';
mix.server.DEFAULT_HTDOCS = '';

exports.name = 'server';
exports.usage = '<command> [options]';
exports.desc = 'launch a web server';

exports.register = function(commander) {

    commander
        .option('-p, --port <int>', 'server listen port', parseInt, 8080)
        .option('--htdocs <path>', 'document root', String, util.getHtdocs())
        .option('--type <php|java|node>', 'process language', String, fis.config.get('server.type'))
        .option('--rewrite [script]', 'enable rewrite mode', String, fis.config.get('server.rewrite', false))
        .option('--repos <url>', 'install repository', String, process.env.FIS_SERVER_REPOSITORY)
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
            var htdocs = options.htdocs;
            var cwd = fis.util.realpath(process.cwd());
            var confname = 'fis-conf.js';
            var conf;

            if(!conf && fis.util.isFile(root + '/' + confname)){
                conf = root + '/' + confname;
            }

            if(!conf){
                //try to find fis-conf.js
                var pos = cwd.length;
                do {
                    cwd  = cwd.substring(0, pos);
                    conf = cwd + '/' + confname;
                    if(fis.util.exists(conf)){
                        root = cwd;
                        break;
                    } else {
                        conf = false;
                        pos = cwd.lastIndexOf('/');
                    }
                } while(pos > 0);
            }

            // require fis-conf.js
            if(conf){
                var cache = fis.cache(conf, 'conf');
                if(!cache.revert()){
                    options.clean = true;
                    cache.save();
                }
                require(conf);
                fis.emitter.emit('fis-conf:loaded');
            }

            if (options.rewrite) {
                if(options.rewrite != true){
                    options.script = options.rewrite;
                    options.rewrite = true;
                }
            }

            if(htdocs){
                if(fis.util.exists(htdocs) && !fis.util.isDir(htdocs)){
                    fis.log.error('invalid server document root [' + htdocs + ']');
                } else {
                    fis.util.mkdir(htdocs);
                }
            } else {
                fis.log.error('missing document root');
            }

            switch (cmd) {
                case 'start':
                    var opt = {};
                    fis.util.map(options, function(key, value){
                        if(typeof value !== 'object' && key[0] !== '_'){
                            opt[key] = value;
                        }
                    });
                    
                    server.stop(function() {
                        server.start(opt);
                    });
                    break;
                case 'stop':
                    server.stop(function() {

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
                    server.open(htdocs);
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
