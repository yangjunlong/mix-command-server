/**
 * command server utils
 * 
 * @author  Yang,junlong at 2016-03-17 16:30:16 build.
 * @version $Id$
 */

/**
 * get server process id file
 * 获取服务进程ID文件路径
 * 
 * @return string
 */
exports.getPidFile = function() {
    return fis.project.getTempPath('server/pid');
};

/**
 * get server conf file
 * 获取服务配置文件路径
 * 
 * @return string
 */
exports.getConfFile = function() {
    return fis.project.getTempPath('server/conf.json');
};

/**
 * get server document root
 * 获取服务doc root
 * 
 * @return string
 */
exports.getRoot = function() {
    var serverInfo = exports.option();
    if (serverInfo['root']) {
        return serverInfo['root'];
    } else {
        return fis.project.getTempPath('www');
    }
};

// open server document directory
exports.open = function(path, callback) {
    var child_process = require('child_process');
    var cmd = fis.util.escapeShellArg(path);
    if(fis.util.isWin()){
        cmd = 'start "" ' + cmd;
    } else {
        if(process.env['XDG_SESSION_COOKIE']){
            cmd = 'xdg-open ' + cmd;
        } else if(process.env['GNOME_DESKTOP_SESSION_ID']){
            cmd = 'gnome-open ' + cmd;
        } else {
            cmd = 'open ' + cmd;
        }
    }
    child_process.exec(cmd, function(){
        fis.log.notice('browse ' + path.yellow.bold + '\n');
        callback && callback(path);
    });
};

exports.glob = function(str, prefix) {
    var globArr = str.split(',');
    var group = [];
    var s_reg;
    globArr.forEach(function(g) {
        if (g.length > 0) {
            s_reg = fis.util.glob(g).toString();
            //replace
            // '/^' => ''
            // '$/i' => ''
            s_reg = s_reg.substr(2, s_reg.length - 5);
            group.push(s_reg);
        }
    });
    prefix = prefix || '';
    if (prefix) {
        s_reg = fis.util.glob(prefix).toString();
        // '/^' => '', '%/i' => ''
        prefix = s_reg.substr(2, s_reg.length - 5);
    }
    return new RegExp('^'+ prefix + '(' + group.join('|') + ')$', 'i');
};

// 下载
exports.download = function(names) {
    if((typeof names === 'string') && names.trim().length > 0){
        var remote = options.repos || fis.config.get(
            'system.repos', fis.project.DEFAULT_REMOTE_REPOS
            ).replace(/\/$/, '') + '/server';

        var option = {
            extract : options['root'],
            remote : remote
        };
        names.split(',').forEach(function(name){
            name = name.split('@');
            fis.util.install(name[0], name[1], option);
        });
    } else {
        fis.log.error('invalid server component name');
    }
};

// check lib version
exports.matchVersion = function(str) {
    var version = false;
    var reg = /\b\d+(\.\d+){2}/;
    var match = str.match(reg);
    if(match){
        version = match[0];
    }
    return version;
};

/**
 * parse cli args
 * @sample
 * `parseArgs('--root /home/fis/.fis-tmp --port 8888');`
 *  =>
 * `{'root': '/home/fis/.fis-tmp', 'port': 8888}`
 *
 * @param argv
 * @returns {Object}
 */
exports.parseCliArgs = function(argv) {
    var argv_array = {};
    if (Object.prototype.toString.apply(argv) == '[object Array]') {
        argv = argv.join('|');
    }
    argv.replace(/--([^\|]+)\|([^\|]+)/g, function($0, $1, $2) {
        if ($0) {
            argv_array[$1] = $2;
        }
    });
    return argv_array;
};

/**
 * set&get server options to&from conf file
 * 
 * @param  object options 
 * @return mixed opt
 */
exports.option = function (options) {
    var conf = exports.getConfFile();
    if(options){
        fis.util.write(conf, JSON.stringify(options));
    } else if(fis.util.exists(conf)){
        options = fis.util.readJSON(conf);
    } else {
        options = {};
    }
    return options;
}
