/**
 * mix server kernel
 * 
 * @author  Yang,junlong at 2016-03-17 17:28:24 build.
 * @version $Id$
 */

var child_process = require('child_process');
var spawn = child_process.spawn;

var util = require('./util.js');
var server = mix.server = exports;
// 把server util 挂载到mix.server._util
mix.server.util = util;

// server start method
exports.start = function(opt) {
    mix.log.error('You must rewrite the method: start()');
};

// server stop
exports.stop = function(callback) {
    var isWin = fis.util.isWin();

    // read option
    var opt = util.options();
    var pid = exports.getPid();
    if (pid) {
        checkPid(pid, opt, function(exists) {
            if (exists) {

                if (isWin) {
                    // windows 貌似没有 gracefully 关闭。
                    // 用 process.kill 会遇到进程关不了的情况，没有 exit 事件响应，原因不明！
                    child_process.exec('taskkill /PID ' + pid + ' /T /F');
                } else {
                    // try to gracefully kill it.
                    process.kill(pid, 'SIGTERM');
                }

                // checkout it every half second.
                (function(done) {
                    var start = Date.now();
                    var timer = setTimeout(function() {
                        var fn = arguments.callee;

                        checkPid(pid, opt, function(exists) {
                            if (exists) {
                                // 实在关不了，那就野蛮的关了它。
                                if (Date.now() - start > 5000) {
                                    try {
                                        isWin ?
                                            child_process.exec('taskkill /PID ' + pid + ' /T /F') :
                                            process.kill(pid, 'SIGKILL');
                                    } catch(e) {

                                    }
                                    clearTimeout(timer);
                                    done();
                                    return;
                                }
                                timer = setTimeout(fn, 500);
                            } else {
                                done();
                            }
                        });
                    }, 20);
                })(function() {
                    process.stdout.write('shutdown '+opt['process']+' process [' + pid + ']\n');
                    fis.util.fs.unlinkSync(util.getPidFile());
                    callback && callback(opt);
                })
            } else {
                callback && callback(opt);
            }
        });
    } else {
        if (callback) {
            callback(opt);
        }
    }
};

// print server info
exports.info = function() {
    var options = util.options();
    if(options){
        mix.util.print(options, '  ');
    } else {
        console.log('nothing...');
    }
};

// server open document directory
exports.open = function(path, callback) {
    var conf = util.getConfFile();

    if(mix.util.is(path, 'String')) {
        util.open(path, callback);
    } else if(fis.util.isFile(conf)){
        conf = fis.util.readJSON(conf);
        if(fis.util.isDir(conf.root)){
            util.open(conf.root, callback);
        }
    } else {
        // TODO nothing
    }
};

/**
 * get server document root
 * 
 * @return string root
 */
exports.getRoot = function () {
    return util.getRoot();
};

/**
 * set server pid
 *
 * @author sobird
 * @param number pid
 * @return boolean
 */
exports.setPid = function (pid) {
    if(!pid) {
        return false;
    }
    var pidfile = util.getPidFile();
    return fis.util.write(pidfile, pid);
}

/**
 * get server pid
 *
 * @author sobird
 * @access public
 * @return mixed number||false
 */
exports.getPid = function () {
    var pidfile = util.getPidFile();
    if (fis.util.exists(pidfile)) {
        return fis.util.fs.readFileSync(pidfile, 'utf8').trim();
    } else {
        return false;
    }
};

/**
 * check java enable
 * 
 * @param  object   options
 * @param  function callback
 * @return void
 * @access private
 */
exports.checkJavaEnable = function (opt, callback) {
    var javaVersion = false;
    //check java
    process.stdout.write('checking java support : ');
    var java = spawn('java', ['-version']);

    java.stderr.on('data', function(data){
        if(!javaVersion){
            javaVersion = util.matchVersion(data.toString('utf8'));
            if(javaVersion) {
                process.stdout.write('v' + javaVersion + '\n');
            }
        }
    });

    java.on('error', function(err){
        process.stdout.write('java not support!');
        fis.log.warning(err);
        callback(javaVersion, opt);
    });

    java.on('exit', function() {
        if (!javaVersion) {
            process.stdout.write('java not support!');
        } else {
            opt['process'] = 'java';
            opt = util.option(opt); // rewrite opt
        }
        callback(javaVersion, opt);
    });
}

/**
 * check php-cgi env enable
 * 
 * @param  object   opt
 * @param  function callback
 * @return void
 * @access private
 */
exports.checkPHPEnable = function (options, callback) {
    var check = function(data){
        if(!phpVersion){
            phpVersion = util.matchVersion(data.toString('utf8'));
            if(phpVersion){
                process.stdout.write('v' + phpVersion + '\n');
            }
        }
    };
    // check php-cgi
    process.stdout.write('checking php-cgi support : ');
    var php = spawn(options.php_exec, ['--version']);
    var phpVersion = false;
    php.stdout.on('data', check);
    php.stderr.on('data', check);
    php.on('error', function(){
        process.stdout.write('unsupported php-cgi environment\n');
        // fis.log.notice('launching java server.');
        delete options.php_exec;
        callback && callback(phpVersion, options);
    });
    php.on('exit', function() {
        callback && callback(phpVersion, options);
    })
}

exports.options = function (options) {
    return util.options(options);
}


// private functions
// check mix server process exists
function checkPid(pid, opt, callback) {
    var list, msg = '';
    var isWin = fis.util.isWin();

    if (isWin) {
        list = spawn('tasklist');
    } else {
        list = spawn('ps', ['-A']);
    }

    list.stdout.on('data', function (chunk) {
        msg += chunk.toString('utf-8').toLowerCase();
    });

    list.on('exit', function() {
        var found = false;
        msg.split(/[\r\n]+/).forEach(function(item){
            var reg = new RegExp('\\b'+opt['process']+'(?:js)?\\b', 'i');
            if (reg.test(item)) {
                var iMatch = item.match(/\d+/);
                if (iMatch && iMatch[0] == pid) {
                    found = true;
                }
            }
        });

        callback(found);
    });

    list.on('error', function (e) {
        if (isWin) {
            fis.log.error('fail to execute `tasklist` command, please add your system path (eg: C:\\Windows\\system32, you should replace `C` with your system disk) in %PATH%');
        } else {
            fis.log.error('fail to execute `ps` command.');
        }
    });
}
