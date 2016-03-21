/**
 * command server util
 * 
 * @author  Yang,junlong at 2016-03-17 16:30:16 build.
 * @version $Id$
 */

var util = module.exports;

// get server process id file
util.getPidFile = function() {
    return fis.project.getTempPath('server/pid');
};

// get server conf file
util.getConfFile = function() {
    return fis.project.getTempPath('server/conf.json');
};

// get server conf info 
util.getServerInfo = function() {
    var conf = util.getConfFile();
    if (fis.util.isFile(conf)) {
        return require(conf);
    }
    return {};
};

// get server document root
util.getHtdocs = function() {
    var serverInfo = util.getServerInfo();
    if (serverInfo['root']) {
        return serverInfo['root'];
    } else {
        return fis.project.getTempPath('www');
    }
};

// open server document directory
util.open = function(path, callback) {
    var child_process = require('child_process');
    fis.log.notice('browse ' + path.yellow.bold + '\n');
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
    child_process.exec(cmd, callback);
};

util.glob = function(str, prefix) {
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

// 备用
util.download = function(names) {
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

util.matchVersion = function(str) {
    var version = false;
    var reg = /\b\d+(\.\d+){2}/;
    var match = str.match(reg);
    if(match){
        version = match[0];
    }
    return version;
};

util.printObject = function(o, prefix) {
    prefix = prefix || '';
    for(var key in o){
        if(o.hasOwnProperty(key)){
            if(typeof o[key] === 'object'){
                util.printObject(o[key], prefix + key + '.');
            } else {
                console.log(prefix + key + '=' + o[key]);
            }
        }
    }
};

/**
 * parse args
 * @sample
 * `parseArgs('--root /home/fis/.fis-tmp --port 8888');`
 *  =>
 * `{'root': '/home/fis/.fis-tmp', 'port': 8888}`
 *
 * @param argv
 * @returns {Object}
 */
util.parseArgs = function(argv) {
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

// set&get server option conf
util.option = function (opt) {
    var conf = util.getConfFile();
    if(opt){
        fis.util.write(conf, JSON.stringify(opt));
    } else {
        if(fis.util.exists(conf)){
            opt = fis.util.readJSON(conf);
        } else {
            opt = {};
        }
    }
    return opt;
}
