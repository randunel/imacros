/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/

// Some utility functions


(function() {
    if (typeof(Function.prototype.bind) == "undefined") {
        Function.prototype.bind = function(obj) {
            var method = this;
            return  function() {
                return method.apply(obj, arguments);
            };
        };
    }
    if (typeof(Array.prototype.indexOf) == "undefined") {
        Array.prototype.indexOf = function(x) {
            var a = this;
            for (var i = 0; i < a.length; i++)
                if (a[i] === x)
                    return i;
            return -1;
        };
    }
    if (typeof(Array.prototype.forEach) == "undefined") {
        // the code of this function was taken from
        // https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Array/forEach
        Array.prototype.forEach = function(func /*, thisp*/) {
            var len = this.length >>> 0;
            if (typeof func != "function")
                throw new TypeError();

            var thisp = arguments[1];
            for (var i = 0; i < len; i++) {
                if (i in this)
                    func.call(thisp, this[i], i, this);
            }
        };
    }
}) ();


function $(id, win) {
    return (win || window).document.getElementById(id);
}


// Open URL in a new window
function link(url) {
    window.open(url);
}


function __is_windows() {
    return /^win(32)?/i.test(navigator.platform);
}

function __psep() {
    return __is_windows() ? "\\" : "/";
}

function __is_full_path(path) {
    if (__is_windows()) {
        return /^[a-z]:/i.test(path);
    } else {
        return /^\//.test(path);
    }
}

var imns = {

    // Returns number if and only if num is
    // a string representation of a number,
    // otherwise returns NaN
    s2i: function(num) {
        var s = num.toString();
        s = this.trim(s);
        if (!s.length)
            return Number.NaN;
        var n = parseInt(s);
        if (n.toString().length != s.length)
            return Number.NaN;
        return n;
    },

    // escape \n, \t, etc. chars in line
    escapeLine: function(line) {
        var values_to_escape = {
                "\\u005C": "\\\\",
                "\\u0000": "\\0",
                "\\u0008": "\\b",
                "\\u0009": "\\t",
                "\\u000A": "\\n",
                "\\u000B": "\\v",
                "\\u000C": "\\f",
                "\\u000D": "\\r",
                "\\u0022": "\\\"",
                "\\u0027": "\\'"};

        // var values_to_escape = {
        //         "\\": "\\\\",
        //         "\0": "\\0",
        //         "\b": "\\b",
        //         "\t": "\\t",
        //         "\n": "\\n",
        //         "\v": "\\v",
        //         "\f": "\\f",
        //         "\r": "\\r",
        //         "\"": "\\\"",
        //         "'": "\\'"};
        
        for (var x in values_to_escape) {
            line = line.replace(new RegExp(x, "g"), values_to_escape[x]);
        }

        return line;
    },

    // replace all white-space symbols by <..>
    wrap: function (line) {
        const line_re = new RegExp("^\"((?:\n|.)*)\"$");

        var m = null;
        if (m = line.match(line_re)) { // it is a quoted string
            line = this.escapeLine(m[1]);
            
            // add quotes
            line = "\""+line+"\"";
        } else {
            line = line.replace(/\t/g, "<SP>");
            line = line.replace(/\n/g, "<BR>");
            line = line.replace(/\r/g, "<LF>");
            line = line.replace(/\s/g, "<SP>");
        }

        return line;
    },

    // Unwraps a line 
    // If the line is a quoted string then the following escape sequences
    // are translated:
    // \0 The NUL character (\u0000).
    // \b Backspace (\u0008).
    // \t Horizontal tab (\u0009).
    // \n Newline (\u000A).
    // \v Vertical tab (\u000B).
    // \f Form feed (\u000C).
    // \r Carriage return (\u000D).
    // \" Double quote (\u0022).
    // \' Apostrophe or single quote (\u0027).
    // \\ Backslash (\u005C).
    // \xXX The Latin-1 character specified by the two hexadecimal digits XX.
    // \uXXXX The Unicode character specified by four hexadecimal digits XXXX.
    // Otherwise <BR>, <LF>, <SP> are replaced by \n, \r, \x31 resp.

    unwrap: function(line) {
        const line_re = new RegExp("^\"((?:\n|.)*)\"$");
        var m = null;
        
        var handleSequence = function(s) {
            if (s == "\\\\") {
                return "\u005C";
            } else if (s == "\\0") {
                return "\u0000";
            } else if (s == "\\b") {
                return "\u0008";
            } else if (s == "\\t") {
                return "\u0009";
            } else if (s == "\\n") {
                return "\u000A";
            } else if (s == "\\v") {
                return "\u000B";
            } else if (s == "\\f") {
                return "\u000C";
            } else if (s == "\\r") {
                return "\u000D";
            } else if (s == "\\\"") {
                return "\u0022";
            } else if (s == "\\\'") {
                return "\u0027"
            } else {
                // function to replace \x|u sequence
                var replaceChar = function (match_str, char_code) {
                    return String.fromCharCode(parseInt("0x"+char_code));
                };
                if (/^\\x/.test(s))// replace \xXX by its value
                    return s.replace(/\\x([\da-fA-F]{2})/g, replaceChar);
                else if (/^\\u/.test(s)) // replace \uXXXX by its value
                    return s.replace(/\\u([\da-fA-F]{4})/g, replaceChar);
            }
        };

        var esc_re = new RegExp("\\\\(?:[0btnvfr\"\'\\\\]|x[\da-fA-F]{2}|u[\da-fA-F]{4})", "g");
        
        if (m = line.match(line_re)) {
            line = m[1];        // 'unquote' the line
            // replace escape sequences by their value
            line = line.replace(esc_re, handleSequence);
        } else {
            line = line.replace(/<br>/gi, '\n');
            line = line.replace(/<lf>/gi, '\r');
            line = line.replace(/<sp>/gi, ' ');
        }

        return line;
    },
    
    formatDate: function(str, date) {
        var  prependDate = function(str, num) {
            str = str.toString(); 
            var x = imns.s2i(str), y = imns.s2i(num);
            if (isNaN(x) || isNaN(y))
                return;
            while (str.length < num)
                str = '0'+str;
            return str;
        };
        var now = date ? date : new Date();
        str = str.replace(/yyyy/g, prependDate(now.getFullYear(), 4));
        str = str.replace(/yy/g, now.getFullYear().toString().substr(-2));
        str = str.replace(/mm/g, prependDate(now.getMonth()+1, 2));
        str = str.replace(/dd/g, prependDate(now.getDate(), 2));
        str = str.replace(/hh/g, prependDate(now.getHours(), 2));
        str = str.replace(/nn/g, prependDate(now.getMinutes(), 2));
        str = str.replace(/ss/g, prependDate(now.getSeconds(), 2));

        return str;
    },
    
    // escape chars which are of special meaning in regexp
    escapeREChars: function(str) {
        var chars = "^$.+?=!:|\\/()[]{}", res = "", i, j;

        for ( i = 0; i < str.length; i++) {
            for (j = 0; j < chars.length; j++) {
                if (str[i] == chars[j]) {
                    res += "\\";
                    break;
                }
            }
            res += str[i];
        }

        return res;
    },

    escapeTextContent: function(str) {
        // 1. remove all leading/trailing white spaces
        str = this.trim(str);
        // 2. remove all linebreaks
        str = str.replace(/[\r\n]+/g, "");
        // 3. all consequent white spaces inside text are replaced by one
        str = str.replace(/\s+/g, " ");

        return str;
    },


    trim: function(s) {
        return s.replace(/^\s+/, "").replace(/\s+$/, "");
    },

    Clipboard: {
        _check_area: function(str) {
            var x;
            if (!(x = $("clipboard-area"))) {
                x = document.createElement("textarea");
                x.id = "clipboard-area";
                x.setAttribute("contentEditable", "true");
                document.body.appendChild(x);    
            }
            return x;
        },

        putString: function(str) {
            var x = this._check_area();
            x.value = str;
            x.focus();
            x.select();
            document.execCommand("Copy");
        },

        getString: function() {
            var x = this._check_area();
            x.focus();
            document.execCommand("Paste");
            
            return x.value;
        }
    }
};




// App exceptions

// Classes for reporting syntax and runtime errors

// Returns error with message=msg and optional position of
// bad parameter set by num
function BadParameter(msg, num) {
    this.message = typeof(num) != "undefined" ? "expected "+msg+
        " as parameter "+num : msg;
    this.name = "BadParameter";
    this.errnum = 711;
}

BadParameter.prototype = Error.prototype;


function UnsupportedCommand(msg) {
    this.message = "command "+msg+" is not supported in the current version";
    this.name = "UnsupportedCommand";
    this.errnum = 712;
}

UnsupportedCommand.prototype = Error.prototype;

// Returns error with message=msg, optional error number num
// sets mplayer.errorCode
function RuntimeError(msg, num) {
    this.message = msg;
    if (typeof num != "undefined")
        this.errnum = num;
    this.name = "RuntimeError";
}

RuntimeError.prototype = Error.prototype;


SyntaxError.prototype.
    __defineGetter__("errnum", function() { return 710; });


function normalize_error(e) {
    return {name: e.name, message: e.message, errnum: e.errnum};
}



// preference storage
var Storage = {
    isSet: function(key) {
        return typeof(localStorage[key]) != "undefined";
    },

    setBool: function(key, value) {
        localStorage[key] = Boolean(value);
    },

    getBool: function(key) {
        var value = localStorage[key];
        return value ? value.toString() != "false" : false;
    },

    setChar: function(key, value) {
        localStorage[key] = String(value);
    },

    getChar: function(key) {
        var value = localStorage[key];
        return value ? value.toString() : "";
    },

    setNumber: function(key, value) {
        var val = Number(value);
        if (!isNaN(val))
            localStorage[key] = val;
    },

    getNumber: function(key) {
        return localStorage[key];
    },

    setObject: function(key, value) {
        var s = JSON.stringify(value);
        localStorage[key] = s;
    },

    getObject: function(key) {
        var s = localStorage[key];
        if (typeof s != "string")
            return null;
        try {
            return JSON.parse(s);
        } catch(e) {
            return null;
        }
    }
};


// resize window to fit its content
function resizeToContent(window, container, margin) {
    setTimeout(function() {
	var margin = margin || 30;
	var rect = container.getBoundingClientRect();
        // NOTE: outerHeight and outerWidth sometimes are zero (?)
        // -> must be a bug in Google Chrome
	// var width = rect.width+margin+
        //     window.outerWidth-window.innerWidth;
	// var height = rect.height+margin+
        //     window.outerHeight-window.innerHeight;
        var width = rect.width+margin;
         // that +20 is to compensate for window decoration
        var height = rect.height+margin+16;
        window.resizeTo(width, height);
    }, 200);
}

