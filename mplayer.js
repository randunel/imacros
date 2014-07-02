
/*
(C) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


// An object to encapsulate all operations for parsing
// and playing macro commands

function MacroPlayer(win_id) {
    console.info("creating player for window "+win_id);
    this.win_id = win_id;
    this.vars = new Array(10);
    this.userVars = new Object();
    this.ports = new Object();
    this._ActionTable = new Object();
    this.compileExpressions();

    this._onScriptError = this.onErrorOccurred.bind(this);
    this._onBeforeNavigate = this.onBeforeNavigate.bind(this);
    this._onCompleted = this.onNavigationCompleted.bind(this);
    this._onErrorOccured = this.onNavigationErrorOccured.bind(this);
    this._onCommitted = this.onNavigationCommitted.bind(this);
    // this._onCreatedNavTarget = this.onCreatedNavigationTarget.bind(this);
    // this._onDOMLoaded = this.onDOMContentLoaded.bind(this);
    // this._onRefFragUpdated = this.onReferenceFragmentUpdated.bind(this);
    this._onTabUpdated = this.onTabUpdated.bind(this);
    this._onActivated = this.onTabActivated.bind(this);

    // bindings to monitor network activity
    this.onAuth = this.onAuthRequired.bind(this);
    // this.onRequest = this.onBeforeRequest.bind(this);
    // this.onRedirect = this.onBeforeRedirect.bind(this);
    // this.onSendHeaders = this.onBeforeSendHeaders.bind(this);
    // this.onCompleted = this.onReqCompleted.bind(this);
    // this.onReqError = this.onErrorOccurred.bind(this);
    // this.onHeaders = this.onHeadersReceived.bind(this);
    // this.onResponse = this.onResponseStarted.bind(this);
    // this.onSend = this.onSendHeaders.bind(this);

    // handle sandbox messages
    window.addEventListener("message", this.onSandboxMessage.bind(this));
}

// Object for debugging time intervals while replaying
var DebugTimer = {
    start: function () {
        this._start = (new Date()).getTime();
    },

    get: function () {
        return (new Date()).getTime() - this._start;
    }
}

// A table to hold the code for processing a command
MacroPlayer.prototype.ActionTable = new Object();
MacroPlayer.prototype.RegExpTable = new Object();



// compile actions regexps
MacroPlayer.prototype.compileExpressions = function () {
    if (!this.RegExpTable.compiled) {
        for (var x in this.RegExpTable) {
            try {
                this.RegExpTable[x] = new RegExp(this.RegExpTable[x], "i");
            } catch (e) {
                console.error(e);
                throw e;
            }
        }
        this.RegExpTable.compiled = true;
    }
    for (var x in MacroPlayer.prototype.ActionTable) {
        this._ActionTable[x] = MacroPlayer.prototype.ActionTable[x].bind(this);
    }
};



// add listener for various events
MacroPlayer.prototype.addListeners = function() {
    communicator.registerHandler("error-occurred",
                                 this._onScriptError, this.win_id);
    chrome.tabs.onUpdated.addListener(this._onTabUpdated);
    chrome.tabs.onActivated.addListener(this._onActivated);

    // use WebNavigation interface to trace download events

    chrome.webNavigation.onBeforeNavigate.addListener(this._onBeforeNavigate);
    chrome.webNavigation.onCompleted.addListener(this._onCompleted);
    chrome.webNavigation.onErrorOccurred.addListener(this._onErrorOccured);
    
    chrome.webNavigation.onCommitted.addListener(this._onCommitted);
    // chrome.webNavigation.onCreatedNavigationTarget.addListener(
    //     this._onCreatedNavTarget
    // );
    // chrome.webNavigation.onDOMContentLoaded.addListener(
    //     this._onDOMLoaded
    // );
    // chrome.webNavigation.onReferenceFragmentUpdated.addListener(
    //     this._onRefFragUpdated
    // );

    // network events
    chrome.webRequest.onAuthRequired.addListener(
        this.onAuth,
        {windowId: this.win_id, urls: ["<all_urls>"]},
        ["blocking"]
    );
    // chrome.webRequest.onBeforeRequest.addListener(
    //     this.onRequest,
    //     {
    //         windowId: this.win_id,
    //         urls: ["<all_urls>"]// ,
    //         // types: ["main_frame", "sub_frame"]
    //     }
    // );
    // chrome.webRequest.onBeforeRedirect.addListener(
    //     this.onRedirect,
    //     {windowId: this.win_id, urls: ["<all_urls>"]},
    //     ["responseHeaders"]
    // );
    // chrome.webRequest.onBeforeSendHeaders.addListener(
    //     this.onSendHeaders,
    //     {windowId: this.win_id, urls: ["<all_urls>"]},
    //     ["requestHeaders"]
    // );
    // chrome.webRequest.onCompleted.addListener(
    //     this.onCompleted,
    //     {
    //         windowId: this.win_id,
    //         urls: ["<all_urls>"]
    //     }
    // );
    // chrome.webRequest.onErrorOccurred.addListener(
    //     this.onReqError,
    //     {
    //         windowId: this.win_id,
    //         urls: ["<all_urls>"]
    //     }
    // );
    // chrome.webRequest.onHeadersReceived.addListener(
    //     this.onHeaders,
    //     {windowId: this.win_id, urls: ["<all_urls>"]},
    //     ["responseHeaders"]
    // );
    // chrome.webRequest.onResponseStarted.addListener(
    //     this.onResponse,
    //     {windowId: this.win_id, urls: ["<all_urls>"]},
    //     ["responseHeaders"]
    // );
    // chrome.webRequest.onSendHeaders.addListener(
    //     this.onSend,
    //     {windowId: this.win_id, urls: ["<all_urls>"]},
    //     ["requestHeaders"]
    // );
};

MacroPlayer.prototype.removeListeners = function() {
    communicator.unregisterHandler("error-occurred", this._onScriptError);
    chrome.tabs.onUpdated.removeListener(this._onTabUpdated);
    chrome.tabs.onActivated.removeListener(this._onActivated);
    chrome.webNavigation.onBeforeNavigate.removeListener(this._onBeforeNavigate);
    chrome.webNavigation.onCompleted.removeListener(this._onCompleted);
    chrome.webNavigation.onErrorOccurred.removeListener(this._onErrorOccured);

    chrome.webNavigation.onCommitted.removeListener(this._onCommitted);
    // chrome.webNavigation.onCreatedNavigationTarget.removeListener(
    //     this._onCreatedNavTarget
    // );
    // chrome.webNavigation.onDOMContentLoaded.removeListener(
    //     this._onDOMLoaded
    // );
    // chrome.webNavigation.onReferenceFragmentUpdated.removeListener(
    //     this._onRefFragUpdated
    // );

    // network events
    chrome.webRequest.onAuthRequired.removeListener(this.onAuth);
    // chrome.webRequest.onBeforeRequest.removeListener(this.onRequest);
    // chrome.webRequest.onBeforeRedirect.removeListener(this.onRedirect);
    // chrome.webRequest.onBeforeSendHeaders.removeListener(this.onSendHeaders);
    // chrome.webRequest.onCompleted.removeListener(this.onCompleted);
    // chrome.webRequest.onErrorOccurred.removeListener(this.onReqError);
    // chrome.webRequest.onHeadersReceived.removeListener(this.onHeaders);
    // chrome.webRequest.onResponseStarted.removeListener(this.onResponse);
    // chrome.webRequest.onSendHeaders.removeListener(this.onSend);
};


// NOTE: it seems that onCommitted is more apropriate for that
// because onBeforeNavigate does not take redirection into account
// But onBeforeNavigate fires earlier so we duplicate onCommitted handler

MacroPlayer.prototype.onBeforeNavigate = function(details) {
    // NOTE: I commemnted out onBeforeNavigate because it helps to ignore
    // ads and counter frames that never loads.
    // There was a reason to start timer here, however I don't remember it
    // clearly and thus can not re-test it
    return;

    // if (details.tabId != this.tab_id)
    //     return;
    // console.log("onBeforeNavigate: %O", details);

    // if (this.playing && /^(?:https?|file)/.test(details.url)) {
    //     this.waitingForPageLoad = true;
    //     this.activeNavigations[details.frameId+":"+details.processId] = true;
    //     if (!this.loadingTimeout) {
    //         console.log("onBeforeNavigate, start timer");
    //         this.startLoadingTimer();
    //     }
    // }
};


MacroPlayer.prototype.reviseActiveNavigations = function() {
    var count = 0, x;
    for (x in this.activeNavigations) {
        // console.log("activeNavigations["+x+"]="+this.activeNavigations[x]);
        if (this.activeNavigations[x])
            count++;
    }

    if (count == 0 && this.afterCompleteTimeout) {
        // we're waiting for navigation completion after
        // onTabUpdated with 'complete' fired
        clearTimeout(this.afterCompleteTimeout);
        this.afterCompleteTimeout = null;
        this.activeNavigations = new Object();
        this.waitingForPageLoad = false;
        this.stopLoadingTimer();
        this.next("Page load complete, url="+this.currentURL);
    }

    return count;
};

MacroPlayer.prototype.onNavigationCompleted = function(details) {
    if (details.tabId != this.tab_id)
        return;
    // console.log("onNavigationCompleted: %O", details);

    if (this.playing && /^(?:https?|file)/.test(details.url)) {
        this.activeNavigations[details.frameId+":"+details.processId] = false;
        this.reviseActiveNavigations();
    }
};


MacroPlayer.prototype.onNavigationErrorOccured = function(details) {
    if (details.tabId != this.tab_id)
        return;

    if (this.playing) {
        // console.error("onNavigationErrorOccured: %O", details);
        
        // workaround for #223, see crbug.com/117043
        if (/net::ERR_ABORTED/.test(details.error)) {
            var navigation = details.frameId+":"+details.processId;
            this.activeNavigations[navigation] = false;
            this.reviseActiveNavigations();
            return;
        }
        
        this.handleError(new RuntimeError(details.error, 730));
        this.waitingForPageLoad = false;
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = null;
        }
        this.activeNavigations = new Object();
        return;
    }
};



MacroPlayer.prototype.onNavigationCommitted = function(details) {
    if (details.tabId != this.tab_id)
        return;
    
    // console.log("onNavigationCommitted: %O");

    if (this.playing && /^(?:https?|file)/.test(details.url)) {
        this.waitingForPageLoad = true;
        this.activeNavigations[details.frameId+":"+details.processId] = true;
        if (!this.loadingTimeout) {
            this.startLoadingTimer();
        }
    }
};


// MacroPlayer.prototype.onCreatedNavigationTarget = function(details) {
//     console.log("onCreatedNavigationTarget: %O", details);
// };


// MacroPlayer.prototype.onDOMContentLoaded = function(details) {
//     console.log("onDOMContentLoaded: %O", details);
// };

// MacroPlayer.prototype.onReferenceFragmentUpdated = function(details) {
//     console.log("onReferenceFragmentUpdated: %O", details);
// };




// network events
MacroPlayer.prototype.onAuthRequired = function(details, callback) {
    // console.log("onAuthRequired: %O", details);
    if (!this.loginData)
        return {cancel: true};
    
    var response = {
        authCredentials: {
            username: this.loginData.username,
            password: this.loginData.password
        }
    };
    
    this.loginData = null;
    
    return response;
};


// MacroPlayer.prototype.onBeforeRequest = function(details) {
//     console.log("onBeforeRequest: %O", details);
// };

// MacroPlayer.prototype.onBeforeRedirect = function(details) {
//     console.log("onBeforeRedirect: %O", details);
// };


// MacroPlayer.prototype.onBeforeSendHeaders = function(details) {
//     console.log("onBeforeSendHeaders: %O", details);
// };

// MacroPlayer.prototype.onReqCompleted = function(details) {
//     console.log("onReqCompleted: %O", details);
// };


// MacroPlayer.prototype.onErrorOccurred = function(details) {
//     console.log("onErrorOccured: %O", details);
// };

// MacroPlayer.prototype.onHeadersReceived = function(details) {
//     console.log("onHeadersReceived: %O", details);
// };

// MacroPlayer.prototype.onResponseStarted = function(details) {
//     console.log("onResponseStarted: %O", details);
// };

// MacroPlayer.prototype.onSendHeaders = function(details) {
//     console.log("onSendHeaders: %O", details);
// };


MacroPlayer.prototype.onTabActivated = function(activeInfo) {
    if (activeInfo.windowId == this.win_id) {
        // console.log("onTabActivated, tabId="+activeInfo.tabId);
        this.tab_id = activeInfo.tabId;
    }
};


// listen to page load events
MacroPlayer.prototype.onTabUpdated = function(tab_id, obj, tab) {
    if (this.tab_id != tab_id)
        return;

    // console.log("onTabUpdated, changeInfo=%O, tab_id=%d", obj, tab_id);

    this.currentURL = tab.url;

    if (obj.status == "loading") {
        // We need to catch "loading" event as early as possible
        // onTabUpdated may be fired too late in some cases.
        // For example, Amazon search box triggers page load event
        // where onTabUpdated reports 'complete' prematurely and
        // the next TAG commad may be executed before search results
        // appeared on the page

        // this.waitingForPageLoad = true;
        // if (!this.loadingTimeout)
        //     this.startLoadingTimer();
    } else if (obj.status == "complete") {
        if (this.waitingForPageLoad) {
            if (this.reviseActiveNavigations()) {
                // there are some loadings in queue, start timeout
                // to let them complete (in 5s)
                var mplayer = this;
                this.afterCompleteTimeout = setTimeout(function() {
                    mplayer.waitingForPageLoad = false;
                    if (mplayer.loadingTimeout) {
                        clearTimeout(mplayer.loadingTimeout);
                        mplayer.loadingTimeout = null;
                    }
                    if (mplayer.loadingInterval) {
                        clearInterval(mplayer.loadingInterval);
                        mplayer.loadingInterval = null;
                    }

                    mplayer.next("Page load complete, url="+
                                 mplayer.currentURL);
                }, 5000);
            } else {
                // no active loadings at the moment
                this.waitingForPageLoad = false;
                this.stopLoadingTimer();
                this.next("Page load complete, url="+this.currentURL);
            }
        }
    }
};



MacroPlayer.prototype.startLoadingTimer = function() {
    var mplayer = this;
    this.loadingTimeout = setTimeout(function() {
        clearInterval(mplayer.loadingInterval);
        mplayer.loadingInterval = null;
        mplayer.loadingTimeout = null;
        mplayer.waitingForPageLoad = false;
        mplayer.handleError(
            new RuntimeError("Page loading timeout"+
                    ", URL: "+mplayer.currentURL, -602));
    }, this.timeout*1000);
    
    var counter = 0;
    this.loadingInterval = setInterval(function() {
        counter++;
        // change panel/badge text
        var panel = context[mplayer.win_id].panelWindow;
        if (panel && !panel.closed) {
            panel.setStatLine("Loading "+(counter/10).toFixed(1)+
                              "("+mplayer.timeout+")s",
                              "warning");
        }

        if ((counter % 10) == 0) {
            badge.set(mplayer.win_id, {
                status: "loading",
                text: Math.round(counter/10) // make sure it is integer
            });
        }
    }, 100);
};


MacroPlayer.prototype.stopLoadingTimer = function() {
    if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
    }
    if (this.loadingInterval) {
        clearInterval(this.loadingInterval);
        this.loadingInterval = null;
    }
};


// handle messages from content-scripts
MacroPlayer.prototype.onTagComplete = function(data) {
    // console.log("onTagComplete, data=%O", data);
    if (!data.found) {
        if (this.nattempts--) {
            // set badge text
            var text = this.nattempts.toString();
            while(text.length < 2)
                text = "0"+text;
            text += "s";
            badge.set(this.win_id, {
                status: "tag_wait",
                text: text
            });

            // set panel text
            var panel = context[this.win_id].panelWindow;
            if (panel && !panel.closed) {
                panel.setStatLine("Tag waiting... "+this.nattempts+
                                  "("+this.tagTimeout+")s",
                                  "warning");
            }
            
            this.playingAgain = true;
            var mplayer = this;
            setTimeout(function() {
                mplayer.playNextAction("onTagComplete");
            }, 1000);

            return;
        } 
    }
    
    if (data.error) {
        this.handleError(data.error);
    } else {
        if (data.extract)
            this.showAndAddExtractData(data.extract);
        this.next("onTagComplete");
    }
};


// MacroPlayer.prototype.onContentChange = function(data, tab_id, callback) {
//     if (callback)   // release resources
//         callback();

//     if (this.tab_id != tab_id)
//         return;
//     var mplayer = this;
//     chrome.tabs.get(tab_id, function(tab) {
//         if (!tab) return;
//         if (Storage.getBool("debug"))
//             console.debug("content-change, url "+tab.url);

//         // This is for TAG commands acting on <a> elements
//         // because tab.onUpdated() is fired too late
//         if (mplayer.playing) {
//             mplayer.waitingForPageLoad = true;
//         }
//     });
// };


MacroPlayer.prototype.terminate = function() {
    if (Storage.getBool("debug"))
        console.info("terminating player for window "+this.win_id);
    // ensure that player is stopped
    if (this.playing)
        this.stop();
};


// a pattern to match a double quoted string or eval() command
// or a non-whitespace char sequence
const im_strre = "(?:\"(?:[^\"\\\\]|\\\\[0btnvfr\"\'\\\\])*\"|"+
    "eval\\s*\\(\"(?:[^\"\\\\]|\\\\[\\w\"\'\\\\])*\"\\)|"+
    "\\S*)";

// const im_strre = "(?:\"(?:[^\"\\\\]|\\\\[0btnvfr\"\'\\\\])*\"|\\S*)";


MacroPlayer.prototype.noContentPage = function(cmd_name) {
    if (!/^https?|file/i.test(this.currentURL))
        this.handleError(
            new RuntimeError(
                cmd_name+" command can not be executed because"+
                    " it requires a Web page loaded in active tab."+
                    " Current page is "+this.currentURL, 612
            )
        );
};


// ADD command http://wiki.imacros.net/ADD
// regexp for parsing ADD command
MacroPlayer.prototype.RegExpTable["add"] =
    "^(\\S+)\\s+("+im_strre+")\\s*$";

MacroPlayer.prototype.ActionTable["add"] = function (cmd) {
    var param = imns.unwrap(this.expandVariables(cmd[2], "add2"));
    var m = null;
    
    if ( m = cmd[1].match(/^!var([0-9])$/i) ) {
        var num = imns.s2i(m[1]);
        var n1 = imns.s2i(this.vars[num]), n2 = imns.s2i(param);
        if ( !isNaN(n1) && !isNaN(n2) ) {
            this.vars[num] = (n1 + n2).toString();
        } else {
            this.vars[num] += param;
        }
    } else if ( arr = cmd[1].match(/^!extract$/i) ) {
        this.addExtractData(param);
    } else if (/^!\S+$/.test(cmd[1])) {
        throw new BadParameter("Unsupported variable "+cmd[1]+
                               " for ADD command");
    } else {
        if (!this.hasUserVar(cmd[1])) {
            throw new BadParameter("Undefinded vaiable "+cmd[1]);
        }
        var n1 = imns.s2i(this.getUserVar(cmd[1])), n2 = imns.s2i(param);
        if ( !isNaN(n1) && !isNaN(n2) ) {
            this.setUserVar(cmd[1], (n1 + n2).toString());
        } else {
            this.setUserVar(cmd[1], this.getUserVar(cmd[1])+param);
        }
    }

    this.next("ADD");
};


MacroPlayer.prototype.RegExpTable["back"] = "^\\s*$";

MacroPlayer.prototype.ActionTable["back"] = function (cmd) {
    if (this.noContentPage("BACK")) 
        return;

    chrome.tabs.get(this.tab_id, function(tab) {
        if (/^(?:https?|file)/.test(tab.url))
            communicator.postMessage("back-command", {}, tab.id,
                                     function() {},
                                     {number: 0});
    });
    // mplayer.next() will be called on load-complete event
};


// CLEAR command http://wiki.imacros.net/CLEAR
// I added new optional parameter to the command which restricts
// cookies removal to specified domain/url
MacroPlayer.prototype.RegExpTable["clear"] = "^\\s*("+im_strre+")?\\s*$";

MacroPlayer.prototype.ActionTable["clear"] = function (cmd) {
    var specifier = cmd[1] ?
        imns.unwrap(this.expandVariables(cmd[1], "clear1")) : null;
    var details = {};
    if (specifier) {
        if (/^http/.test(specifier)) {
            details.url = specifier;
        } else if (/^[\w\.]+$/.test(specifier)) {
            details.domain = specifier;
        } else {
            throw new BadParameter("domain name or URL", 1);
        }
    }

    var mplayer = this;
    chrome.cookies.getAll(details, function(cookies) {
        cookies.forEach(function(cookie) {
            // TODO: check if we should omit storeId here.
            // As for now I think that only current execution context
            // store's cookies should be removed
            var url = (cookie.secure? "https" : "http")+"://"+
                cookie.domain+cookie.path;
            chrome.cookies.remove({url: url, name: cookie.name});
        });
        mplayer.next("CLEAR");
    });
};


// CMDLINE command http://wiki.imacros.net/CMDLINE
MacroPlayer.prototype.RegExpTable["cmdline"] =
    "^(\\S+)\\s+("+im_strre+")\\s*$";

MacroPlayer.prototype.ActionTable["cmdline"] = function (cmd) {
    var param = imns.unwrap(this.expandVariables(cmd[2], "cmdline2"));
    var found = false;
    
    if (/^!(\S+)$/i.test(cmd[1])) {
        var val = RegExp.$1.toLowerCase();
        if( val == "timeout" ) {
            if (isNaN(imns.s2i(param)))
                throw new BadParameter("integer", 2);
            this.timeout = imns.s2i(param);
        } else if (val == "loop") {
            if (isNaN(imns.s2i(param)))
                throw new BadParameter("integer", 2);
            this.currentLoop = imns.s2i(param);
        } else if (val == "datasource") {
            this.loadDataSource(param);
        } else if ( /^var([0-9])/.test(val) ) {
            this.vars[imns.s2i(RegExp.$1)] = param;
        } else {
            throw new BadParameter("!TIMEOUT|!LOOP|!DATASOURCE|!VAR[0-9]", 1);
        }
    } else {
        if (this.hasUserVar(cmd[1])) {
            this.setUserVar(cmd[1], param);
        } else {
            throw new BadParameter("unknown variable "+cmd[1]);
        }
    }
    this.next("CMDLINE");
};




// FRAME command http://wiki.imacros.net/FRAME
MacroPlayer.prototype.RegExpTable["frame"] =
    "^(f|name)\\s*=\\s*("+im_strre+")\\s*$";

MacroPlayer.prototype.onFrameComplete = function(data) {
    if (!data.frame) {
        this.nattempts--;
        var timeout = (this.tagTimeout >= 0) ? this.tagTimeout :
            this.timeout/10;

        var text = (timeout-this.nattempts).toString();
        while(text.length < 3)
            text = "0"+text;
        badge.set(this.win_id, {status: "warning", text: text});

        // set panel text
        var panel = context[this.win_id].panelWindow;
        if (panel && !panel.closed) {
            panel.setStatLine("Frame waiting... "+
                              (timeout-this.nattempts)+
                              "("+timeout+")s", "warning");
        }
        
        this.playingAgain = true;
        var self = this;
        setTimeout(function() {
            self.playNextAction("onFrameComplete");
        }, 1000);
    } else {
        this.currentFrame = data.frame;
        this.next("onFrameComplete");
    }
};

MacroPlayer.prototype.ActionTable["frame"] = function (cmd) {
    var type = cmd[1].toLowerCase();
    var param = imns.unwrap(this.expandVariables(cmd[2], "frame2"));
    var frame_data = new Object();

    if (type == "f") {
        param = imns.s2i(param);
        if (isNaN(param))
            throw new BadParameter("F=<number>", 1);

        // shortcut for main frame
        if (param == 0) {
            this.currentFrame = {number: 0};
            this.next("FRAME");
            return;
        }
    }

    var timeout = (this.tagTimeout >= 0) ? this.tagTimeout :
        this.timeout/10;

    if (!this.playingAgain) {
        this.nattempts = Math.round(timeout);
        if (!this.nattempts)
            this.nattempts = 1;
    } else {
        if (!this.nattempts) {
            this.currentFrame = {number: 0};
            throw new RuntimeError("frame "+param+" not found", 722);
        }
    }
    

    if (type == "f")
        frame_data.number = param;
    else if (type == "name")
        frame_data.name = param;
    
    var self = this;
    
    communicator.postMessage("frame-command", frame_data, this.tab_id,
                             this.onFrameComplete.bind(this),
                             {number: 0});
};



// IMAGESEARCH command http://wiki.imacros.net/IMAGESEARCH
MacroPlayer.prototype.RegExpTable["imagesearch"] =
    "^pos\\s*=\\s*("+im_strre+
    ")\\s+image\\s*=\\s*("+im_strre+")\\s+"+
    "confidence\\s*=\\s*("+im_strre+")";

MacroPlayer.prototype.ActionTable["imagesearch"] = function (cmd) {
    var pos = imns.s2i(imns.unwrap(
        this.expandVariables(cmd[1], "imagesearch1")
    ));
    var image = imns.unwrap(this.expandVariables(cmd[2], "imagesearch2"));
    var cl = imns.s2i(imns.unwrap(
        this.expandVariables(cmd[3], "imagesearch3")
    ));

    if (!__is_windows()) {
        throw new UnsupportedCommand("IMAGESEARCH");
    }

    if (!this.afioIsInstalled) {
        throw new RuntimeError(
            "IMAGESEARCH command requires File IO interface"
        );
    }

    if (!__is_full_path(image)) {
        // NOTE: we assume here that defdatapath is already set which
        // may not be true under some (rare) circumstances
        var default_dir = afio.openNode(localStorage["defdatapath"]);
	default_dir.append(image);
	image = default_dir.path;
    }

    var mplayer = this;
    
    var timeout = (this.tagTimeout >= 0) ? this.tagTimeout :
        this.timeout/10;

    if (!this.playingAgain) {
        this.nattempts = Math.round(timeout);
        if (!this.nattempts)
            this.nattempts = 1;
    }
    
    chrome.tabs.captureVisibleTab(this.win_id, {format: "png"}, function(_) {
        const host = "com.iopus.imacros.host";
        var msg_no_free_beer = "This feature requires"+
            " the iMacros image recognition library,"+
            " which is part of the commercial iMacros Standard"+
            " and Enterprise Editions";
        
        var re = /data\:([\w-]+\/[\w-]+)?(?:;(base64))?,(.+)/;
        var m = re.exec(_);
        if (!m) {
            mplayer.handleError(new RuntimeError("Can not parse image data"+_));
            return;
        }

        if (m[1] != "image/png") { // should never happen
            mplayer.handleError(new RuntimeError(
                "Unsupported MIME type for captured image data: "+m[1]
            ));
            return;
        }

        var request = {
            type: "do_image_search",
            image_data: m[3],
            sample_path: image,
            pos: pos,
            cl: cl
        };
        
        chrome.runtime.sendNativeMessage(host, request, function(result) {
            if (chrome.runtime.lastError) {
                var nf = "Specified Specified native messaging host not found";
                if (chrome.runtime.lastError.message.match(nf)) {
                    mplayer.handleError(new RuntimeError(msg_no_free_beer));
                } else {
                    mplayer.handleError(chrome.runtime.lastError);
                }
                return;
            }

            if (result.type == "error") {
                mplayer.handleError(new RuntimeError(result.error));
                return;
            }

            if(!result.found) {
                if (mplayer.nattempts--) {
                    // set badge text
                    var text = mplayer.nattempts.toString();
                    while(text.length < 2) text = "0"+text;
                    text += "s";
                    badge.set(mplayer.win_id, {
                        status: "tag_wait", text: text
                    });

                    // set panel text
                    var panel = context[mplayer.win_id].panelWindow;
                    if (panel && !panel.closed) {
                        panel.setStatLine(
                            "Image waiting... "+mplayer.nattempts+
                                "("+timeout+")s", "warning"
                        );
                    }
                    
                    mplayer.playingAgain = true;
                    setTimeout(function() {
                        mplayer.playNextAction("onImageSearchWaiting");
                    }, 1000);

                    return;
                } else {
                    mplayer.handleError(new RuntimeError(
                        "Image specified by "+image+
                            " does not match the web-page"
                    ));
                }
            } else if (result.found) {
                communicator.postMessage(
                    "image-search-command",
                    result, mplayer.tab_id,
                    function() {},
                    mplayer.currentFrame
                );
                mplayer.next("IMAGESEARCH");
            }
        });
    });
};


// ONERRORDIALOG command http://wiki.imacros.net/ONERRORDIALOG

MacroPlayer.prototype.RegExpTable["onerrordialog"] =
    "^(?:button\\s*=\\s*(?:\\S*))?\\s*(?:\\bcontinue\\s*=\\s*(\\S*))?\\s*$"

MacroPlayer.prototype.ActionTable["onerrordialog"] = function (cmd) {
    var param = cmd[1] ? imns.unwrap(this.expandVariables(cmd[1], "onerrordialog1")) : "";
    if (/^no|false$/i.test(param)) {
        this.shouldStopOnError = true;
    }

    this.next("ONERRORDIALOG");
};


MacroPlayer.prototype.onErrorOccurred = function(data) {
    if (!this.playing || !this.shouldStopOnError)
        return;

    this.handleError(data);
};

// TODO: maybe onscripterror should have another syntax?
// now these are plain references
MacroPlayer.prototype.RegExpTable["onscripterror"] =
    MacroPlayer.prototype.RegExpTable["onerrordialog"];
    

MacroPlayer.prototype.ActionTable["onscripterror"] =
    MacroPlayer.prototype.ActionTable["onerrordialog"];



// ONLOGIN command http://wiki.imacros.net/ONLOGIN
MacroPlayer.prototype.RegExpTable["onlogin"] =
    "^user\\s*=\\s*("+im_strre+")\\s+"+
    "password\\s*=\\s*("+im_strre+")\\s*$";

MacroPlayer.prototype.ActionTable["onlogin"] = function (cmd) {
    var username = imns.unwrap(this.expandVariables(cmd[1], "onlogin1"));
    var password = imns.unwrap(this.expandVariables(cmd[2], "onlogin2"));
    
    this.loginData = {
        username: username,
        password: password
    }
    
    switch(this.encryptionType) {
    case "no":
        break;
    case "stored":      // get password from storage
        var pwd = Storage.getChar("stored-password");
        // stored password is base64 encoded
        pwd = decodeURIComponent(atob(pwd));
        // throws error if password does not match
        this.loginData.password = Rijndael.decryptString(
            this.loginData.password, pwd
        );
        break;
    case "tmpkey":
        if (!Rijndael.tempPassword) {    // ask password now
            this.waitingForPassword = true;
            var features = "titlebar=no,menubar=no,location=no,"+
                "resizable=yes,scrollbars=no,status=no,"+
                "width=350,height=170";
            var win = window.open("passwordDialog.html",
                                  "iMacros Password Dialog", features);
            win.args = {
                shouldProceed: true,
                type: "player",
                mplayer: this
            };
            // mplayer.next() will be called from win
            return;
        } else {
            // throws error if password does not match
            this.loginData.password = Rijndael.decryptString(
                this.loginData.password,
                Rijndael.tempPassword
            );
        }
        break;
    default:
        throw new RuntimeError("Unsupported encryption type: "+
                               this.encryptionType, 712);
        break;
    }
    
    this.next("ONLOGIN");
};


// PAUSE command http://wiki.imacros.net/PAUSE
MacroPlayer.prototype.RegExpTable["pause"] = "^\\s*$";

MacroPlayer.prototype.ActionTable["pause"] = function (cmd) {
    this.pause();
    this.next("PAUSE");
};


// PROMPT command http://wiki.imacros.net/PROMPT
MacroPlayer.prototype.RegExpTable["prompt"] =
    "^("+im_strre+")"+
    "(?:\\s+("+im_strre+")"+
    "(?:\\s+("+im_strre+"))?)?\\s*$";

MacroPlayer.prototype.ActionTable["prompt"] = function (cmd) {
    if (this.noContentPage("PROMPT")) 
        return;

    var x = {};
    x.text = imns.unwrap(this.expandVariables(cmd[1], "prompt1"));

    if (typeof(cmd[2]) != "undefined") {
        if (/!var([0-9])/i.test(cmd[2])) {
            x.varnum = imns.s2i(RegExp.$1);
        } else if (/[^!]\S*/.test(cmd[2])) {
            x.varname = cmd[2];
        }
    }

    if (typeof(cmd[3]) != "undefined") {
        x.defval = imns.unwrap(this.expandVariables(cmd[3], "prompt3"));
    }

    try {
        communicator.postMessage("prompt-command", x, this.tab_id,
                                 this.onPromptComplete.bind(this),
                                 this.currentFrame);
    } catch (e) {
        this.handleError(e);
    }
};

MacroPlayer.prototype.onPromptComplete = function(data) {
    if (typeof(data.varname) != "undefined") {
        this.setUserVar(data.varname, data.value);
    } else if (typeof(data.varnum) != "undefined") {
        this.vars[imns.s2i(data.varnum)] = data.value;
    }
    this.next("onPromptComplete");
};


// PROXY command http://wiki.imacros.net/PROXY
MacroPlayer.prototype.RegExpTable["proxy"] =
    "^address\\s*=\\s*("+im_strre+")"+
    "(?:\\s+bypass\\s*=\\s*("+im_strre+")\\s*)?$";


MacroPlayer.prototype.setProxySettings = function(config) {
    // set new proxy settings
    var mplayer = this;
    chrome.proxy.settings.set(
        {value: config},
        function() {
            mplayer.next("PROXY");
        }
    );
};

MacroPlayer.prototype.storeProxySettings = function(callback) {
    var mplayer = this;
    // first we should store old settings
    chrome.proxy.settings.get(
        {'incognito': false},
        function(config) {
            mplayer.proxySettings = config.value;
            if (callback && typeof(callback) == "function")
                callback();
        }
    );
};


MacroPlayer.prototype.restoreProxySettings = function() {
    if (!this.proxySettings)
        return;
    if (this.proxySettings.mode == "system") {
        chrome.proxy.settings.clear({});
    } else {
        chrome.proxy.settings.set(
            {value: this.proxySettings, 'incognito': false},
            function() {}
        );
    }
};


// for possible bypass values see
// http://code.google.com/chrome/extensions/experimental.proxy.html#bypass_list

MacroPlayer.prototype.ActionTable["proxy"] = function (cmd) {
    var address = imns.unwrap(this.expandVariables(cmd[1], "proxy1"));
    var bypass = cmd[2]? imns.unwrap(this.expandVariables(cmd[2], "proxy2")):
        null;

    if (!chrome.proxy) {
        throw new RuntimeError("PROXY command can not be executed because"+
                               " chrome.proxy module unavailable", 610);
    }

    var addr_re = /^(?:(https?)\s*=\s*)?([\d\w\.]+):(\d+)\s*$/;
    var m = addr_re.exec(address);
    if (!m) {
        throw new BadParameter("server name or IP address with port number", 1);
    }
    
    var https = (m[1] == "https");
    var server = m[2];
    var port = imns.s2i(m[3]);

    var config = {
        mode: "fixed_servers",
        rules: {
            singleProxy: {}
        }
    };
    
    config.rules.singleProxy["scheme"] = https ? "https" : "http";
    config.rules.singleProxy["host"] = server;
    config.rules.singleProxy["port"] = port;

    if (bypass) {
        if (!/^null$/i.test(bypass)) {
            config.rules.bypassList = bypass.split(",");
        }
    }
    var mplayer = this;
    if (!this.proxySettings)
        this.storeProxySettings(function() {
            mplayer.setProxySettings(config);
        });
    else
       this.setProxySettings(config);
    
};


// REFRESH command http://wiki.imacros.net/REFRESH
MacroPlayer.prototype.RegExpTable["refresh"] = "^\\s*$";

MacroPlayer.prototype.ActionTable["refresh"] = function (cmd) {
    if (this.noContentPage("REFRESH")) 
        return;

    chrome.tabs.get(this.tab_id, function(tab) {
        if (/^(?:https?|file)/.test(tab.url))
            communicator.postMessage("refresh-command", {}, tab.id,
                                     function() {},
                                     {number: 0});
    });
    // mplayer.next() will be called on load-complete event
};


// utility functions for next two commands

// get file name of the page, e.g. index.html
var __doc_name = function(url) {
    // use the location file name if present
    var name = url;
    if (/\/([^\/?]*)(?:\?.*)?$/.test(url))
        name = RegExp.$1;
    // if name is empy use server name
    if (!name.length) {
        if (/^https?:\/\/(?:www\.)([^\/]+)/.test(url))
            name = RegExp.$1;
    }
    // remove extension if any
    if (/^(.*)\.(?:\w+)$/.test(name))
        return RegExp.$1;
    return name;
};


// ensure that filename has extension ext
var __ensure_ext = function(filename, ext) {
    if (/^(.*)\.(\w+)$/.test(filename)) {
        if (RegExp.$2 != ext)
            return RegExp.$1+"."+ext;
        else
            return filename;
    } else {
        return filename+"."+ext;
    }
};


// SAVEAS command http://wiki.imacros.net/SAVEAS
MacroPlayer.prototype.RegExpTable["saveas"] =
    "^type\\s*=\\s*(\\S+)\\s+"+
    "folder\\s*=\\s*("+im_strre+")\\s+"+
    "file\\s*=\\s*("+im_strre+")\\s*$";

MacroPlayer.prototype.ActionTable["saveas"] = function (cmd) {
    if (this.noContentPage("SAVEAS")) 
        return;
    if (!this.afioIsInstalled)
        throw new RuntimeError("SAVEAS requires File IO interface installed");

    var folder = imns.unwrap(this.expandVariables(cmd[2], "saveas2"));
    var type = imns.unwrap(this.expandVariables(cmd[1], "saveas1")).
        toLowerCase();
    var file = imns.unwrap(this.expandVariables(cmd[3], "saveas3"));

    var f = null;
    if (folder == "*") {
        f = afio.openNode(localStorage["defdownpath"]);
    } else {
        f = afio.openNode(folder);
    }

    var mplayer = this;
    f.exists(function(exists, err) {
        if (err) {
            mplayer.handleError(err);
            return;
        }
        if (!exists) {
            mplayer.handleError( new RuntimeError(
                "Path "+folder+" does not exist", 732
            ));
            return;
        }
        
        var t;
        if (file == "*") {
            file = (type == "extract") ? "extract.csv" :
                __doc_name(mplayer.currentURL);
        } else if (t = file.match(/^\+(.+)$/)) {
            file = __doc_name(mplayer.currentURL) + t[1];
        }
        // replace illegal file name characters < > : " / \ | ? * by underscores
        var re = new RegExp('\\s*[:*?|<>\\"/]+\\s*', "g");
        file = file.replace(re, "_");
        if (type == "extract") {
            f.append(__ensure_ext(file, "csv"));
            var data = mplayer.getExtractData();
            mplayer.clearExtractData();
            data = data.replace(/\"/g, '""');
            data = '"'+data.replace(/\[EXTRACT\]/g, '","')+'"';
            f.append(file);
            afio.appendTextFile(f, data+"\r\n", function(err) {
                if (err) {
                    mplayer.handleError(err);
                    return;
                }
                mplayer.next("SAVEAS");
            });
        } else if (type == "mht") {
            f.append(__ensure_ext(file, "mht"));
            chrome.pageCapture.saveAsMHTML(
                {tabId: mplayer.tab_id},
                function(data) {
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        afio.writeTextFile(f, event.target.result, function(e) {
                            if (e) {
                                mplayer.handleError(e); return;}
                            mplayer.next("SAVEAS");
                        });
                    };
                    reader.onerror = function(event) {
                        mplayer.handleError(event.target.error);
                    };
                    reader.readAsText(data);
                }
            );
        } else if (type == "txt" || type == "htm") {
            f.append(__ensure_ext(file, type));
            // NOTE: both txt and htm save only topmost frame data
            communicator.postMessage(
                "saveas-command", {type: type}, mplayer.tab_id,
                function(data) {
                    afio.writeTextFile(f, data, function(e) {
                        if (e) 
                            mplayer.handleError(e);
                        else 
                            mplayer.next("SAVEAS");
                    });
                },
                {number: 0}
            );
        } else if (/^png|jpeg$/.test(type)) {
            f.append(__ensure_ext(file, type == "jpeg"? "jpg": "png"));
            chrome.tabs.captureVisibleTab(
                mplayer.win_id, {format: type},
                function(data) {
                    var re = /data\:([\w-]+\/[\w-]+)?(?:;(base64))?,(.+)/;
                    var m = re.exec(data);
                    var imageData = {
                        image: m[3],
                        encoding: m[2],
                        mimeType: m[1]
                    };
                    afio.writeImageToFile(f, imageData, function(e) {
                        if (e) {
                            mplayer.handleError(e);
                        } else {
                            mplayer.next("SAVEAS");
                        }
                    });
                }
            );
        } else {
            mplayer.handleError(
                new BadParameter("iMacros for Chrome supports only "+
                                 "MHT|HTM|TXT|EXTRACT|PNG|JPEG SAVEAS types")
            );
        } 
    });
};


// SCREENSHOT command
MacroPlayer.prototype.RegExpTable["screenshot"] =
    "^type\\s*=\\s*(browser|page)\\s+"+
    "folder\\s*=\\s*("+im_strre+")\\s+"+
    "file\\s*=\\s*("+im_strre+")\\s*$";

MacroPlayer.prototype.ActionTable["screenshot"] = function (cmd) {
    if (this.noContentPage("SCREENSHOT")) 
        return;
    if (!this.afioIsInstalled)
        throw new RuntimeError("SCREENSHOT requires File IO interface");

    var folder = imns.unwrap(this.expandVariables(cmd[2], "screenshot2"));
    var type = imns.unwrap(this.expandVariables(cmd[1], "screenshot1")).
        toLowerCase();
    if (type != "page") {
        throw new BadParameter("SCREENSHOT TYPE="+type.toUpperCase()+
                             " is not supported");
    }

    var f = null;
    if (folder == "*") {
        f = afio.openNode(localStorage["defdownpath"]);
    } else {
        f = afio.openNode(folder);
    }

    var file = imns.unwrap(this.expandVariables(cmd[3], "saveas3")), t;
    
    var mplayer = this;
    f.exists(function(exists, err) {
        if (err) {
            mplayer.handleError(err);
            return;
        }
        if (!exists) {
            mplayer.handleError(
                new RuntimeError(
                    "Path "+folder+" does not exist", 732)
            );
            return;
        }
        
        if (file == "*") {
            file = __doc_name(mplayer.currentURL);
        } else if (t = file.match(/^\+(.+)$/)) {
            file = __doc_name(mplayer.currentURL) + t[1];
        }

        // replace illegal file name characters < > : " / \ | ? * by underscores
        var re = new RegExp('\\s*[:*?|<>\\"/]+\\s*', "g");
        file = file.replace(re, "_");
        f.append(__ensure_ext(file, "png"));
        chrome.tabs.captureVisibleTab(
            mplayer.win_id, {format: "png"},
            function(data) {
                var re = /data\:([\w-]+\/[\w-]+)?(?:;(base64))?,(.+)/;
                var m = re.exec(data);
                var imageData = {
                    image: m[3],
                    encoding: m[2],
                    mimeType: m[1]
                };
                afio.writeImageToFile(f, imageData, function(e) {
                    if (e) {
                        mplayer.handleError(e);
                    } else {
                        mplayer.next("SAVEAS");
                    }
                });
            }
        );
    });
};


// SEARCH command
MacroPlayer.prototype.RegExpTable["search"] =
    "^source\\s*=\\s*(txt|regexp):("+im_strre+")"+
    "(?:\\s+ignore_case\\s*=\\s*(yes|no))?"+
    "(?:\\s+extract\\s*=\\s*("+im_strre+"))?\\s*$";

MacroPlayer.prototype.ActionTable["search"] = function (cmd) {
    var query = imns.unwrap(this.expandVariables(cmd[2]));
    var extract = cmd[4] ? imns.unwrap(this.expandVariables(cmd[4])) : "";
    var ignore_case = cmd[3] && /^yes$/i.test(cmd[3]) ? "i" : "";
    var search_re;
    
    // check if EXTRACT is present
    if (extract && !(cmd[1].toLowerCase() == "regexp"))
        throw new BadParameter("EXTRACT has sense only for REGEXP search");

    var data = {
        type: cmd[1].toLowerCase(),
        query: query,
        extract: extract,
        ignore_case: ignore_case
    };

    communicator.postMessage("search-command", data, this.tab_id,
                             this.onSearchComplete.bind(this),
                             this.currentFrame);
};


MacroPlayer.prototype.onSearchComplete = function(data) {
    if (data.error) {
        this.handleError(data.error);
    } else {
        if (data.extract)
            this.showAndAddExtractData(data.extract);
        this.next("onSearchComplete");
    }
};


// SET command http://wiki.imacros.net/SET
MacroPlayer.prototype.RegExpTable["set"] =
    "^(\\S+)\\s+("+im_strre+")\\s*$";


MacroPlayer.prototype.ActionTable["set"] = function (cmd) {
    var param = imns.unwrap(this.expandVariables(cmd[2], "set2"));
    var mplayer = this;
    switch(cmd[1].toLowerCase()) {
    case "!encryption":
        switch(param.toLowerCase()) {
        case "no":
            this.encryptionType = "no"; break;
        case "storedkey": case "yes":
            this.encryptionType = "stored"; break;
        case "tmpkey": 
            this.encryptionType = "tmpkey"; break;
        default:
            throw new BadParameter("!ENCRYPTION can be only "+
                                   "YES|NO|STOREDKEY|TMPKEY");
        }
        
        break;
    case "!downloadpdf":
        this.shouldDownloadPDF = /^yes$/i.test(param); break;
    case "!loop":
        if (this.firstLoop) {
            if (isNaN(imns.s2i(param)))
                throw new BadParameter("!LOOP must be integer");
            this.currentLoop = imns.s2i(param);
            var panel = context[this.win_id].panelWindow;
            if (panel && !panel.closed)
                panel.setLoopValue(this.currentLoop);
        }
        break;
    case "!extract":
        this.clearExtractData();
        if (!/^null$/i.test(param))
            this.addExtractData(param);
        break;
    case "!extractadd":
        this.addExtractData(param); break;
    case "!extract_test_popup":
        this.shouldPopupExtract = /^yes$/i.test(param); break;
    case "!errorignore":
        this.ignoreErrors = /^yes$/i.test(param); break;
    case "!datasource":
        if (!this.afioIsInstalled) {
            throw new RuntimeError(
                "!DATASOURCE requires File IO interface"
            );
        }
        this.loadDataSource(param); break;
    case "!datasource_line":
        var x = imns.s2i(param);
        if (isNaN(x) || x <= 0)
            throw new BadParameter("!DATASOURCE_LINE must be positive integer");
        if (this.dataSource.length < x)
            throw new RuntimeError("Invalid DATASOURCE_LINE value: "+
                                   param, 751);
        this.dataSourceLine = x;
        break;
    case "!datasource_columns":
        if (isNaN(imns.s2i(param)))
                throw new BadParameter("!DATASOURCE_COLUMNS must be integer");
        this.dataSourceColumns = imns.s2i(param);
        break;
    case "!datasource_delimiter":
        if (param.length > 1)
            throw new BadParameter("!DATASOURCE_DELIMITER must be single character");
        this.dataSourceDelimiter = param;
        break;
    case "!folder_datasource":
        if (!this.afioIsInstalled) {
            throw new RuntimeError(
                "!FOLDER_DATASOURCE File IO interface"
            );
        }
        this.dataSourceFolder = afio.openNode(param);
        this.dataSourceFolder.exists(function(exists, err) {
            if (err) {
                mplayer.handleError(new RuntimeError(
                    "can not open FOLDER_DATASOURCE: "+
                        param+", error "+err.message, 731
                ));
            } else if (!exists) {
                mplayer.handleError( new RuntimeError(
                    "can not write to FOLDER_DATASOURCE: "+
                        param+" does not exist or not accessible.", 731
                ));
            }
        });
        break;
    case "!timeout": case "!timeout_page":
        var x = imns.s2i(param);
        if (isNaN(x) || x <= 0)
            throw new BadParameter("!TIMEOUT must be positive integer");
        this.timeout = x;
        this.tagTimeout = Math.round(this.timeout/10);
        break;
    case "!timeout_tag": case "!timeout_step":
        var x = imns.s2i(param);
        if (isNaN(x) || x < 0)
            throw new BadParameter("!TIMEOUT_TAG must be positive integer");
        this.tagTimeout = x;
        break;
    case "!timeout_macro":
        var x = parseFloat(param);
        if (isNaN(x) || x <= 0)
            throw new BadParameter("!TIMEOUT_MACRO must be positive number");
        this.globalTimer.setMacroTimeout(x);
        break;
    case "!clipboard":
        imns.Clipboard.putString(param);
        break;
    case "!filestopwatch":
        if (!this.afioIsInstalled)
            throw new RuntimeError("!FILESTOPWATCH requires File IO interface");

        var filename = param, file;
        if (__is_full_path(filename) ) { // full path
            var file = afio.openNode(filename);
            var parent = file.parent;
            parent.exists(function(exists, err) {
                if (!exists)
                    mplayer.handleError( new RuntimeError("Path "+parent.path+
                                       " does not exists", 732));
            });
        } else {
            file = afio.getDefaultDir(localStorage["deflogpath"]);
            file.append(filename);
        }
        afio.appendTextFile(file, "", function(e) {
            if (e) {
                var reason = "";
                if (/ACCESS_DENIED/.test(e.toString()))
                    reason = ", access denied";
                mplayer.handleError(new RuntimeError(
                    "can not write to STOPWATCH file: "+
                        file.path+reason, 731
                ));
            } else {
                mplayer.stopwatchFile = file;
                mplayer.shouldWriteStopwatchFile = true;
            }
        });
        break;
    case "!folder_stopwatch":
        if (param.toLowerCase() == "no") {
            this.shouldWriteStopwatchFile = false;
        } else {
            this.stopwatchFolder = afio.openNode(param);
	    // TODO: isWritable is buggy on Windows as it can only check files
	    // if (!this.stopwatchFolder.isWritable) {
            //  throw new RuntimeError("can not write to STOPWATCH folder: "+
            //                            "access denied", 731);
            // }
            this.shouldWriteStopwatchFile = true;
	}
        break;

    case "!replayspeed":
        switch(param.toLowerCase()) {
            case "slow":
                this.delay = 2000; break;
            case "medium":
                this.delay = 1000; break;
            case "fast":
                this.delay = 100; break;
            default:
                throw new BadParameter("!REPLAYSPEED can be SLOW|MEDIUM|FAST");
            }
        break;

    case "!file_profiler":
        if (param.toLowerCase() == "no") {
            this.writeProfilerData = false;
            this.profiler.file = null;
        } else {
            if (!this.afioIsInstalled) {
                throw new RuntimeError(
                    "!FILE_PROFILER requires File IO interface"
                );
            }
            this.writeProfilerData = true;
            this.profiler.enabled = true;
            this.profiler.file = param;
        }
        break;

    case "!linenumber_delta":
        var x = imns.s2i(param);
        if (isNaN(x))
            throw new BadParameter("!LINENUMBER_DELTA must be integer");
        this.linenumber_delta = x;
        break;

    default:
        if (/^!var([0-9])$/i.test(cmd[1])) {
            this.vars[imns.s2i(RegExp.$1)] = param;
        } else if (/^!\S+$/.test(cmd[1])) {
            throw new BadParameter("Unsupported variable "+cmd[1]);
        } else {
            this.setUserVar(cmd[1], param);
        }
    }
    this.next("SET");
};




// STOPWATCH command http://wiki.imacros.net/STOPWATCH
MacroPlayer.prototype.RegExpTable["stopwatch"] =
    "^((?:(start|stop)\\s+)?id|label)\\s*=\\s*("+im_strre+")\\s*$";

// add new time watch
MacroPlayer.prototype.addTimeWatch = function(name) {
    this.watchTable[name] = this.globalTimer.getElapsedTime();
};


MacroPlayer.prototype.stopTimeWatch = function(name) {
    if (typeof this.watchTable[name] == "undefined")
        throw new RuntimeError("Time watch "+name+" does not exist", 762);
    var elapsed = this.globalTimer.getElapsedTime() - this.watchTable[name];
    this.lastWatchValue = elapsed;
    var x = {id: name, type: "id", elapsedTime: elapsed};
    this.stopwatchResults.push(x);
};


MacroPlayer.prototype.addTimeWatchLabel = function(name) {
    var elapsed = this.globalTimer.getElapsedTime();
    this.lastWatchValue = elapsed;
    var x = {id: name, type: "label", elapsedTime: elapsed};
    this.stopwatchResults.push(x);
};


// command handler
MacroPlayer.prototype.ActionTable["stopwatch"] = function (cmd) {
    var action = cmd[2] ? cmd[2].toLowerCase() : null;
    var use_label = /label$/i.test(cmd[1]);
    var param = imns.unwrap(this.expandVariables(cmd[3], "stopwatch3"));

    // make the watch name uppercase to be compatible with IE version
    param = param.toUpperCase();
    
    if (!use_label) {
        var found = typeof this.watchTable[param] != "undefined";
        switch (action) {
        case "start":
            if (found)
                throw new RuntimeError("stopwatch id="+param+
                                       " already started", 761);
            this.addTimeWatch(param);
            break;
        case "stop":
            if (!found)
                throw new RuntimeError("stopwatch id="+param+
                                       " wasn't started", 762);
            this.stopTimeWatch(param);
            break;
        default:                // old syntax
            if (found) 
                this.stopTimeWatch(param);
            else 
                this.addTimeWatch(param);
            break;
        }
    } else {
        // save time in sec since macro was started
        this.addTimeWatchLabel(param);
    }
    this.next("STOPWATCH");
};


MacroPlayer.prototype.globalTimer = {
    init: function(mplayer) {
        this.mplayer = mplayer;
        if (this.macroTimeout) {
            clearTimeout(this.macroTimeout);
            this.macroTimeout = null;
        }
    },

    start: function() {
        this.startTime = new Date();
    },

    getElapsedTime: function() {
        if (!this.startTime)
            return 0;
        var now = new Date();
        return (now.getTime()-this.startTime.getTime())/1000;
    },

    setMacroTimeout: function(x) {
        var mplayer = this.mplayer;
        this.macroTimeout = setTimeout( function () {
            if (!mplayer.playing)
                return;
            mplayer.handleError(
                new RuntimeError("Macro replaying timeout of "+x+
                                 "s exceeded", 603)
            );
        }, Math.round(x*1000));
    },

    stop: function() {
        if (this.macroTimeout) {
            clearTimeout(this.macroTimeout);
            this.macroTimeout = null;
        }
    }
};



// TAG command http://wiki.imacros.net/TAG

// regexp for matching att1:"val1"&&att2:val2.. sequence
const im_atts_re = "(?:[-\\w]+:"+im_strre+"(?:&&[-\\w]+:"+im_strre+")*|\\*?)";

MacroPlayer.prototype.RegExpTable["tag"] =
    "^(?:pos\\s*=\\s*(\\S+)\\s+"+
    "type\\s*=\\s*(\\S+)"+
    "(?:\\s+form\\s*=\\s*("+im_atts_re+"))?\\s+"+
    "attr\\s*=\\s*("+im_atts_re+")"+
    "|xpath\\s*=\\s*("+im_strre+"))"+
    "(?:\\s+(content|extract)\\s*=\\s*"+
    "([%$#]"+im_strre+"(?::[%$#]"+im_strre+")*|"+
    "event:"+im_strre+"|"+
    im_strre+"))?\\s*$";


MacroPlayer.prototype.ActionTable["tag"] = function (cmd) {
    if (this.noContentPage("TAG"))
        return;

    // form message to send to content-script
    var data = {
        pos: 0,
        relative: false,
        tagName: "",
        form: null,
        atts: null,
        xpath: null,
        type: "",
        txt: null,
        cdata: null,
        scroll: true,
        highlight: true
    };

    var isPasswordElement = false;
    
    // parse attr1:val1&&atr2:val2...&&attrN:valN string
    // into array of regexps corresponding to vals
    var mplayer = this;
    var parseAtts = function(str) {
        if (!str || str == "*")
            return null;
        var arr = str.split(new RegExp("&&(?=[-\\w]+:"+im_strre+")"));
        var parsed_atts = new Object(), at, val, m;
        const re = new RegExp("^([-\\w]+):("+im_strre+")$");
        for (var i = 0; i < arr.length; i++) {
            if (!(m = re.exec(arr[i])))
                throw new BadParameter("incorrect ATTR or FORM specifier: "
                                       +arr[i]);
            at = m[1].toLowerCase();
            if (at.length) {
                val = imns.unwrap(mplayer.expandVariables(m[2], "tag_attr"+i));
                // While replaying:
                // 1. remove all leading/trailing whitespaces 
                // 2. remove all linebreaks in the target string
                val = imns.escapeTextContent(val);
                val = imns.escapeREChars(val);
                val = val.replace(/\*/g, '(?:\n|.)*');
                // 3. treat all <SP> as a one or more whitespaces
                val = val.replace(/ /g, "\\s+");
                parsed_atts[at] = "^\\s*"+val+"\\s*$";
            } else {
                parsed_atts[at] = "^$";
            }
        }

        return parsed_atts;
    };
    
    if (cmd[5]) {
        data.xpath = imns.unwrap(this.expandVariables(cmd[5], "tag5"));
    } else {
        data.pos = imns.unwrap(this.expandVariables(cmd[1], "tag1"));
        data.tagName = imns.unwrap(this.expandVariables(cmd[2], "tag2")).
               toLowerCase();
        data.form = parseAtts(cmd[3]);
        data.atts = parseAtts(cmd[4]);
        data.atts_str = cmd[4]; // for error message

        // get POS parameter
        if (/^r(-?\d+)$/i.test(data.pos)) {
            data.pos = imns.s2i(RegExp.$1);
            data.relative = true;
        } else if (/^(\d+)$/.test(data.pos)) {
            data.pos = imns.s2i(RegExp.$1);
            data.relative = false;
        } else {
            throw new BadParameter("POS=<number> or POS=R<number>"+
                                   "where <number> is a non-zero integer", 1);
        }
        // get rid of INPUT:* tag names
        if (/^(\S+):(\S+)$/i.test(data.tagName)) { 
            if (!data.atts)
                data.atts = new Object();
            var val = RegExp.$2;
            data.tagName = RegExp.$1.toLowerCase();
            // check for password element
            isPasswordElement = /password/i.test(val);
            val = imns.escapeREChars(val);
            val = val.replace(/\*/g, '(?:\n|.)*');
            data.atts["type"] = "^"+val+"$";
        }

    }
    if (cmd[6]) {
        data.type = cmd[6].toLowerCase();
        data.rawdata = cmd[7];
        data.txt = imns.unwrap(this.expandVariables(cmd[7], "tag7"));
        if (data.type == "content") 
            data.cdata = this.parseContentStr(cmd[7]);
    }

    if (isPasswordElement && data.type == "content" && data.txt) {
        switch(this.encryptionType) {
        case "no": break; // do nothing
        case "stored":      // get password from storage
            var pwd = Storage.getChar("stored-password");
            // stored password is base64 encoded
            pwd = decodeURIComponent(atob(pwd));
            // throws error if password does not match
            data.txt = Rijndael.decryptString(data.txt, pwd);
            break;
        case "tmpkey":
            if (!Rijndael.tempPassword) {    // ask password now
                this.waitingForPassword = true;
                var features = "titlebar=no,menubar=no,location=no,"+
                    "resizable=yes,scrollbars=no,status=no,"+
                    "width=350,height=170";
                var win = window.open("passwordDialog.html",
                    "iMacros Password Dialog", features);
                win.args = {
                    shouldProceed: true,
                    type: "player",
                    data: data,
                    mplayer: this
                };
                // mplayer.next() and communicator.postMessage()
                // will be called from win
                return;
            } else {
                // throws error if password does not match
                data.txt = Rijndael.decryptString(
                    data.txt,
                    Rijndael.tempPassword
                );
            }
            break;
        default:
            throw new RuntimeError("Unsupported encryption type: "+
                                   this.encryptionType, 712);
            break;
        }
    }

    if(!this.playingAgain) {
        this.nattempts = this.tagTimeout || 1;
    }

    communicator.postMessage("tag-command", data, this.tab_id,
                             this.onTagComplete.bind(this),
                             this.currentFrame);
};


MacroPlayer.prototype.parseContentStr = function(cs) {
    var rv = new Object();
    if (/^event:(\S+)$/i.test(cs)) {
        rv.type = "event";
        var etype = RegExp.$1.toLowerCase();
        switch(etype) {
        case "saveitem": case "savepictureas":
        case "savetargetas": case "savetarget":
        case "mouseover": case "fail_if_found":
            rv.etype = etype;
            break;
        default:
            throw new RuntimeError("Unknown event type "+etype+
                                   " for tag command.", 710);
        }
    } else {
        rv.type = "select";
        // regexp for testing if content is $goo:$foo
        const val_re = new RegExp(
            "^(?:([%$#])"+im_strre+")(?::\\1"+im_strre+")*$"
        );
        const idx_re = new RegExp("^\\d+(?::\\d+)*$");

        var m, split_re = null;
        // build regexp for splitting content into values
        if(m = cs.match(val_re)) {
            var non_delimeter =
                "(?:\"(?:[^\"\\\\]|\\\\[0btnvfr\"\'\\\\])*\"|"+
                "eval\\s*\\(\"(?:[^\"\\\\]|\\\\[\\w\"\'\\\\])*\"\\)|"+
                "(?:[^:\\s]|:[^"+m[1]+"])+)";
            split_re = new RegExp("(\\"+m[1]+non_delimeter+")", "g");
        } else if (m = cs.match(idx_re)) {
            split_re = new RegExp("(\\d+)", "g");
        } else if (cs.toLowerCase() =="all") {
            rv.seltype = "all";
            return rv;
        } else {
            // could be some data for input elements
            rv.type = "unknown";
            return rv;
        }

        // split content into values
        var g, opts = new Array();
        while(g = split_re.exec(cs)) {
            opts.push(g[1]);
        }
        rv.seltype = opts.length > 1 ? "multiple" : "single";

        for (var i = 0; i < opts.length; i++) {
            if (/^([%$#])(.*)$/i.test(opts[i])) {
                var typ = RegExp.$1;
                var val = RegExp.$2;
                val = imns.unwrap(this.expandVariables(val, "opts"+i));
                if (typ == "$" || typ == "%") {
                    var re_str = "^\\s*"+imns.escapeREChars(val).
                        replace(/\*/g, '(?:[\r\n]|.)*')+"\\s*$";
                    opts[i] = {typ: typ, re_str: re_str, str: val};
                } else if (typ == "#") {
                    var idx = parseInt(val);
                    if (isNaN(idx))
                        throw new RuntimeError(
                            "Wrong CONTENT specifier "+cs, 725);
                    opts[i] = {typ: "#", idx: idx};
                }
            } else if (/^(\d+)$/i.test(opts[i])) { // indexes 1:2:...
                var idx = parseInt(RegExp.$1);
                if (isNaN(idx))
                    throw new RuntimeError("Wrong CONTENT specifier "+cs,
                                           725);
                opts[i] = {typ: "#", idx: idx};
            }
        }

        rv.opts = opts;
    }

    return rv;
};


// VERSION command http://wiki.imacros.net/VERSION
MacroPlayer.prototype.RegExpTable["version"] = "^(?:build\\s*=\\s*(\\S+))?"+
    "(?:\\s+recorder\\s*=\\s*(\\S+))?\\s*$";
MacroPlayer.prototype.ActionTable["version"] = function (cmd) {
    // do nothing
    this.next("VERSION");
};



// URL command http://wiki.imacros.net/URL
MacroPlayer.prototype.RegExpTable["url"] =
    "^goto\\s*=\\s*("+im_strre+")\\s*$";

MacroPlayer.prototype.ActionTable["url"] = function (cmd) {
    var param = imns.unwrap(this.expandVariables(cmd[1], "url1")),
        scheme = null;
    
    if (!/^([a-z]+):.*/i.test(param)) {
        param = "http://"+param;
    }
    
    var mplayer = this;    
    
    chrome.tabs.update(
        this.tab_id, {url: param},
        function () {
            if (/^javascript:/.test(param)) {
                // somewhat ugly hack for javascript: urls
                mplayer.next("URL");
            } else {
                // this for about:blank type urls
                mplayer.waitingForPageLoad = true;
            }
        }
    );
};




// TAB command http://wiki.imacros.net/TAB
MacroPlayer.prototype.RegExpTable["tab"] = "^(t\\s*=\\s*(\\S+)|"+
    "close|closeallothers|open|open\\s+new|new\\s+open"+
    ")\\s*$";

MacroPlayer.prototype.ActionTable["tab"] = function (cmd) {
    // the main purpouse of sending the command is removing
    // highlight divs if any when changing active tab
    communicator.postMessage("tab-command", {}, this.tab_id,
                             function() {});
    var mplayer = this;
    if (/^close$/i.test(cmd[1])) { // close current tab
        chrome.tabs.remove(this.tab_id, function() {
            mplayer.next("TAB CLOSE");
        });
    } else if (/^closeallothers$/i.test(cmd[1])) {
        //close all tabs except current
        chrome.tabs.query({windowId: this.win_id, active: false}, function (tabs) {
            try {
                tabs.forEach( function (tab) {
                    if (!tab.active) {
                        chrome.tabs.remove(tab.id);
                    }
                    mplayer.startTabIndex = 0;
                });
                // give them some time to close
                setTimeout( function() {
                    mplayer.next("TAB CLOSEALLOTHERS");
                }, 200); 
            } catch (e) {
                console.error(e);
            }
        });

    } else if (/open/i.test(cmd[1])) {
        chrome.tabs.get(this.tab_id, function(tab) {   
            var args = {
                url: "about:blank",
                windowId: mplayer.win_id,
                index: tab.index+1,
                active: false
            };
            try {
                chrome.tabs.create(args, function (t) {
                    mplayer.next("TAB OPEN");
                });
            } catch (e) {
                console.error(e);
            }
        });
    } else if (/^t\s*=/i.test(cmd[1])) {
        var n = imns.s2i(mplayer.expandVariables(cmd[2], "tab2"));
        if (isNaN(n))
            throw new BadParameter("T=<number>", 1);
        var tab_num = n+mplayer.startTabIndex-1;
        chrome.tabs.query({windowId: this.win_id}, function (tabs) {
            if (tab_num >= 0 && tab_num < tabs.length ) {
                chrome.tabs.update(
                    tabs[tab_num].id,
                    {active: true},
                    function(t) {
                        if (t.status == "loading") {
                            mplayer.waitingForPageLoad = true;
                            if (!mplayer.loadingTimeout) {
                                mplayer.startLoadingTimer();
                            }
                        } else {
                            mplayer.next("TAB T=");
                        }
                    }
                );
            } else {
                mplayer.handleError(new RuntimeError("Tab number "+(tab_num+1)+
                                       " does not exist", 771));
            }
        });
    }
};



// WAIT command http://wiki.imacros.net/WAIT
MacroPlayer.prototype.RegExpTable["wait"] = "^seconds\\s*=\\s*(\\S+)\\s*$";

MacroPlayer.prototype.ActionTable["wait"] = function (cmd) {
    var param = Number(imns.unwrap(this.expandVariables(cmd[1], "wait1")));
    
    if (isNaN(param))
        throw new BadParameter("SECONDS=<number>", 1);
    param = Math.round(param*10)*100; // get number of ms
    if (param == 0)
        param = 10;
    else if (param < 0)
        throw new BadParameter("positive number of seconds", 1);
    this.inWaitCommand = true;
    var mplayer = this;
    
    this.waitTimeout = setTimeout(function () {
        mplayer.inWaitCommand = false;
        delete mplayer.waitTimeout;
        clearInterval(mplayer.countdown);
        delete mplayer.countdown;
        mplayer.next("WAIT");
    }, param);

    // show countdown timer
    var counter = Math.round(param/1000);
    mplayer.countdown = setInterval(function () {
        if (!mplayer.inWaitCommand) {
            clearInterval(mplayer.countdown);
            return;
        }
        counter--;
        if (counter) {
            var text = counter.toString();
            while(text.length < 3)
                text = "0"+text;
            badge.set(mplayer.win_id, {
                status: "waiting",
                text: text
            });

            var panel = context[mplayer.win_id].panelWindow;
            if (panel && !panel.closed) {
                panel.setStatLine("Waiting "+counter+
                                  "("+Math.round(param/1000)+")s", "info");
            }
        }
    }, 1000);
};





MacroPlayer.prototype.beforeEachRun = function() {
    // stopwatch-related properties
    this.watchTable = new Object();
    this.stopwatchResults = new Array();
    this.shouldWriteStopwatchFile = true; // default is true
    // last stopwatch value for !STOPWATCHTIME
    this.lastWatchValue = 0;
    this.totalRuntime = 0;
    this.lastPerformance = new Array();
    this.stopwatchFile = null;  // FILESTOPWATCH
    this.stopwatchFolder = null; // FOLDER_STOPWATCH
    // init runtime timer
    this.globalTimer.init(this);
    this.proxySettings = null;
    this.currentFrame = {number: 0};
    // action is replaying again (only for TAG and FRAME commands) 
    this.playingAgain = false;
    // clear waiting flags
    this.waitingForDownload = false;
    this.waitingForPageLoad = false;
    this.inWaitCommand = false;
    this.waitingForDelay = false;
    // Profiler Log feature
    this.writeProfilerData = Storage.getBool("profiler-enabled");
    this.profiler.file = null;
    // reset profiler
    this.profiler.init();
    this.profiler.enabled = this.profiler.si_enabled ||
        Storage.getBool("profiler-enabled");
    // eval expressions storage
    this.__eval_results = {};
    // script errors
    this.shouldStopOnError = false;
    // delta for line numbers in error reports and profiler data
    this.linenumber_delta = 0;
    // reset current line
    this.currentLine = 0;
    // rest navigation pool
    this.activeNavigations = new Object();
};


MacroPlayer.prototype.afterEachRun = function() {
    // form lastPerformance and save STOPWATCH results
    this.saveStopwatchResults();

    // restore proxy settings
    if (this.proxySettings) {
        this.restoreProxySettings();
        this.proxySettings = null;
    }
};


// reset all defaults, should be called on every play
MacroPlayer.prototype.reset = function() {
    // clear actions array
    this.actions = new Array();
    this.currentAction = null;
    // source code
    this.source = "";
    
    // reset state variables
    this.ignoreErrors = false;
    this.playing = false;
    this.paused = false;
    this.pauseIsPending = false;
    // current loop value
    this.currentLoop = 0;
    this.firstLoop = true;
    // datasources
    this.dataSource = new Array();
    this.dataSourceColumns = 0;
    this.dataSourceLine = 0;
    this.dataSourceFile = "";
    this.dataSourceDelimiter = ",";
    // TODO: should be we make reset() an aynchronous call? would that
    // a few ms delay for setting dataSourceFolder be fine in real-life?
    mplayer = this;
    afio.isInstalled(function(installed) {
        mplayer.afioIsInstalled = installed;
        if (!installed)
            return;
        afio.getDefaultDir("datapath", function(node, err) {
            mplayer.dataSourceFolder = err ? null : node;
        });
    });
    // extraction
    this.extractData = "";
    this.shouldPopupExtract = true;
    this.waitingForExtract = false;
    // replaying delay
    this.delay = 100;           // milliseconds
    // default timeout tag wait time
    this.timeout = 60;         // TODO: maybe store it in localStorage
    this.tagTimeout = Math.round(this.timeout/10);
    // current tab index
    this.startTabIndex = -1; // special initial value, will be checked later
    var mplayer = this;
    chrome.tabs.query({active: true, windowId: this.win_id}, function(tabs) {
        mplayer.startTabIndex = tabs[0].index;
        mplayer.currentURL = tabs[0].url;
        mplayer.tab_id = tabs[0].id;
    });
    
    // last error code and message
    this.errorCode = 1;
    this.errorMessage = "OK";
    // if this is a cycled replay
    this.cycledReplay = false;
    // encryption type
    var typ = Storage.getChar("encryption-type");
    if (!typ.length)
        typ = "no";
    this.encryptionType = typ;
    this.waitingForPassword = false;
};


MacroPlayer.prototype.pause = function() {
    this.pauseIsPending = true;
    context.updateState(this.win_id, "paused");
};

MacroPlayer.prototype.unpause = function () {
    this.paused = false;
    context.updateState(this.win_id, "playing");
    this.next("unpause");
};



// Start macro replaying
// @macro is a macro name
// @loopnum - positive integer
// which should be used to specify cycled replaying
MacroPlayer.prototype.play = function(macro, callback) {
    const comment = new RegExp("^\\s*(?:'.*)?$");
    
    try {
        this.addListeners();
        // re-initialize variables
        this.reset();
        this.beforeEachRun();
        this.playing = true;
        // store the macro source code
        this.source = macro.source;
        console.info("Playing macro "+macro.name);
        this.currentMacro = macro.name;

        // save macro id for "Edit" on error dialog
        this.file_id = macro.file_id;
        this.client_id = macro.client_id;
        this.bookmark_id = macro.bookmark_id;

        // count lines
        var line_re = /\r?\n/g, count = 0;
        while (line_re.exec(this.source))
            count++;
        // TODO: check macro length

        // save reference to callback
        this.callback = callback;

        // check number of loops
        this.times = macro.times || 1;
        this.currentLoop = macro.startLoop || 1;
        this.cycledReplay = this.times - this.currentLoop > 0;
        var warnOnLoop = !(this.cycledReplay);

        
        // parse macro file
        this.parseMacro(warnOnLoop, macro.runLocalTest);

        // prepare stack of actions
        this.action_stack = this.actions.slice();
        this.action_stack.reverse();
        context.updateState(this.win_id,"playing");

        var panel = context[this.win_id].panelWindow;
        if (panel && !panel.closed) {
            panel.showLines(this.source);
            panel.setStatLine("Replaying "+this.currentMacro, "info");
        }
        // start replaying
        this.globalTimer.start();
        // 100 ms timeout is required because of async nature of chrome.* api
        var mplayer = this;
        setTimeout(function f() {
            if (mplayer.startTabIndex != -1) {
                console.info("start replaying in window "+mplayer.win_id);
                DebugTimer.start();
                mplayer.playNextAction("start");
            } else {
                if (Storage.getBool("debug"))
                    console.info("waiting for a while to grab start tab index");
                setTimeout(f, 100); // TODO: avoid possible recursion
            }
        }, 100);
        
    } catch (e) {
        console.error(e);
        this.handleError(e);
    }
};


MacroPlayer.prototype.checkAlertFoxCompatibility = function(line, num) {
    const forbiddenCommands = new RegExp("^(?:pause|prompt|clear)$", "i");

    const forbiddenVariables = new RegExp(
        "^(?:timeout_macro|clipboard|filestopwatch|file_profiler|"+
            "folder_datasource|folder_stopwatch|loop|singlestep|datasource)$",
        "i");


    if (/^\s*(\w+)(?:\s+(.*))?$/.test(line)) {
        var command = RegExp.$1.toLowerCase();
        if (forbiddenCommands.test(command)) {
            throw new Error(
                "Command "+command+" on line "+(num+1)+
                    " is not compatible with Alertfox"
            );
        }
    }

    if (/^\s*set\s+!(\w+)/i.test(line)) {
        var variable = RegExp.$1.toLowerCase();
        if (forbiddenVariables.test(variable)) {
            throw new Error(
                "Variable !"+variable+
                    " on line "+(num+1)+" is not compatible with AlertFox"
            );
        } else if (variable == "encryption") {
            var iDrone = Storage.getBool("af-idrone-test");
            if (!/!encryption\s+no\s*$/i.test(line) && !iDrone) {
                throw new Error(
                    "Only iDrone allows encrypted passwords"
                );
            }
        }
    }
};


// parse macro
MacroPlayer.prototype.parseMacro = function(warnOnLoop, runLocalTest) {
    const comment = new RegExp("^\\s*(?:'.*)?$");
    
    // check macro syntax and form list of actions
    this.source = this.source.replace(/\r+/g, ""); // remove \r symbols if any
    var lines = this.source.split("\n");
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].match(comment)) { // skip comments and empty lines
            continue;
        }

        if (runLocalTest) {
            // Ensure compatibility with AlertFox (for Local Test button)
            this.checkAlertFoxCompatibility(lines[i], i);
        }
        if ( warnOnLoop && /{{!loop}}/i.test(lines[i])) {
            warnOnLoop = false;
            console.warn("TODO: warn on loop dialog");
        }
        if (/^\s*(\w+)(?:\s+(.*))?$/.test(lines[i])) {
            var command = RegExp.$1.toLowerCase();
            var arguments = RegExp.$2 ? RegExp.$2 : "";
            // check if command is known
            if (!(command in this.RegExpTable))
                throw new SyntaxError("unknown command: "+
                                      command.toUpperCase()+
                                      " at line "+(i+1));
            // parse arguments
            var args = this.RegExpTable[command].exec(arguments);
            if ( !args )
                throw new SyntaxError("wrong format of "+
                                      command.toUpperCase()+" command"+
                                      " at line "+(i+1));
            // put parsed action into action list
            this.actions.push({name: command,
                        args: args, line: i+1});
                            
        } else {
            throw new SyntaxError("can not parse macro line: "+lines[i]);
        }
    }
};



// exec current action
MacroPlayer.prototype.exec = function(action) {
    if (!this.playingAgain) {
        badge.set(this.win_id, {
            status: "playing",
            text: action.line.toString()
        });
        
        // highlight action 
        var panel = context[this.win_id].panelWindow;
        if (panel && !panel.closed)
            panel.highlightLine(action.line);
    }
    
    this._ActionTable[action.name](action.args);
};

// delayed start of next action
MacroPlayer.prototype.next = function(caller_id) {
    var mplayer = this;
    this.waitingForDelay = true;
    
    if (this.delayTimeout) {
        console.error("delayTimeout is set!");
    }
    this.delayTimeout = setTimeout(function () {
        delete mplayer.delayTimeout;
        mplayer.waitingForDelay = false;
        mplayer.playNextAction(caller_id);
    }, this.delay);
    
    this.playingAgain = false;  // reset this if it was set earlier
    // stop profile timer
    this.profiler.end("OK", 1, this);
};


MacroPlayer.prototype.playNextAction = function(caller_id) {
    if (!this.playing)
        return;

    var panel = context[this.win_id].panelWindow;
    if (panel && !panel.closed && !this.playingAgain) {
        panel.setStatLine("Replaying "+this.currentMacro, "info");
    }
    
    // call "each run" initialization routine 
    if (caller_id == "new loop")
        this.beforeEachRun();

    if ( this.pauseIsPending ) { // check if player should be paused
        this.pauseIsPending = false;
        this.paused = true;
        return;
    } else if ( this.paused ||
                this.waitingForDelay ||    // replaying delay
                this.waitingForPageLoad || // a page is loading
                this.inWaitCommand ||     // we are in WAIT
                this.waitingForPassword || // asking for a password
                this.waitingForExtract     // extract dialog
              ) {
        if (Storage.getBool("debug"))
            console.debug("("+DebugTimer.get()+") "+
                          "playNextAction(caller='"+(caller_id || "")+"')"+
                          ", waiting for: "+
                          (this.waitingForDelay ? "delay, " : "")+
                          (this.waitingForPageLoad ? "page load, " : "")+
                          (this.waitingForPassword ? "password, " : "")+
                          (this.waitingForExtract ? "extract, " : "")+
                          (this.inWaitCommand ? "in wait, ": ""));
        // waiting for something
        return;
    }  else {
        // hack for tag waiting and frame waiting (when it gets ready)
        if (this.playingAgain) {
            this.action_stack.push(this.currentAction);
        }

        // fetch next action
        if ( this.action_stack.length ) {
            this.currentAction = this.action_stack.pop();
            try {
                if (Storage.getBool("debug"))
                    console.debug("("+DebugTimer.get()+") "+
                                  "playNextAction(caller='"+(caller_id || "")+
                                  "')\n playing "+
                                  this.currentAction.name.toUpperCase()+
                                  " command"+
                                  ", line: "+this.currentAction.line);
                this.profiler.start(this.currentAction);
                this.exec(this.currentAction);
                // profiler.end() is called from next() method
            } catch (e) {
                if (e.name && e.name == "InterruptSignal") {
                    this.onInterrupt(e.id);
                } else {
                    this.handleError(e);
                }
            }
        } else {
            this.afterEachRun();
            if (this.currentLoop < this.times) {
                this.firstLoop = false;
                this.currentLoop++;
                var panel = context[this.win_id].panelWindow;
                if (panel && !panel.closed)
                    panel.setLoopValue(this.currentLoop);
                this.action_stack = this.actions.slice();
                this.action_stack.reverse();
                this.next("new loop");
            } else {
                // no more actions left
                this.stop();
            }
        }
    }
};



// handle error
MacroPlayer.prototype.handleError = function (e) {
    this.errorCode = e.errnum ? -1*Math.abs(e.errnum) : -1001;
    this.errorMessage = (e.name ? e.name : "Error")+": "+e.message;
    if (this.currentAction) {
        this.errorMessage += ", line: "+
            (this.currentAction.line+this.linenumber_delta).toString();
    }
    // save profiler data for the broken action
    this.profiler.end(this.errorMessage, this.errorCode, this);
    console.error(this.errorMessage);
    if (this.playing && !this.ignoreErrors) {
        this.stop();
        var args = {
            message: this.errorMessage,
            errorCode: this.errorCode,
            win_id: this.win_id,
            macro: {
                source: this.source,
                name: this.currentMacro,
                file_id: this.file_id,
                bookmark_id: this.bookmark_id
            }
        };
        
        showInfo(args);
        
    } else if(this.ignoreErrors) {
        this.next("error handler");
    }
};



// form lastPerformance and save STOPWATCH results
MacroPlayer.prototype.saveStopwatchResults = function() {
    // ensure that macro timeout is cleared
    this.globalTimer.stop();

    // save total run time
    this.totalRuntime = this.globalTimer.getElapsedTime();

    // make all values look like 00000.000
    var format = function(x) {
        var m = x.toFixed(3).match(/^(\d+)\.(\d{3})/);
        var s = m[1];
        while (s.length < 5)
            s = "0"+s;
        
        return s+"."+m[2];
    };

    this.lastPerformance.push(
        {
            name: "TotalRuntime",
            value: this.totalRuntime.toFixed(3).toString()
        }
    );
    
    if (this.stopwatchResults.length) {
        // "Date: 2009/11/12  Time: 15:32, Macro: test1.iim, Status: OK (1)"
        var now = new Date();
        var d = imns.formatDate("yyyy/dd/mm", now);
        var t = imns.formatDate("hh:nn", now);
        
        var newline = __is_windows() ? "\r\n" : "\n";
        var s = "\"Date: "+d+"  Time: "+t+
            ", Macro: "+this.currentMacro+
            ", Status: "+this.errorMessage+" ("+this.errorCode+")\",";
        s += newline;
        for (var i = 0; i < this.stopwatchResults.length; i++) {
            var r = this.stopwatchResults[i];
            var timestamp = imns.
                formatDate("dd/mm/yyyy,hh:nn:ss", r.timestamp);
            s += timestamp+","+r.id+","+r.elapsedTime.toFixed(3).toString();
            s += newline;
            this.lastPerformance.push(
                {
                    name: r.id,
                    value: r.elapsedTime.toFixed(3).toString()
                }
            );
        }

        if (!this.shouldWriteStopwatchFile)
            return;

        if (!this.afioIsInstalled) {
            console.error("Saving Stopwatch file requires File IO interface");
            return;
        }

        var file;
        if (this.stopwatchFile) {
            file = this.stopwatchFile;
        } else {
            if (this.stopwatchFolder) 
                file = this.stopwatchFolder;
            else
                file = afio.openNode(localStorage["deflogpath"]);

            var filename = /^(.+)\.iim$/.test(this.currentMacro) ?
                RegExp.$1 : this.currentMacro;
            file.append("performance_"+filename+".csv");
        }
        afio.appendTextFile(file, s, function(err) {
            if (err) console.error(err);
        });
    }
};


MacroPlayer.prototype.profiler = {
    // make string representation of Date object
    make_str: function(x) {
        var prepend = function(str, num) {
            str = str.toString(); 
            var x = imns.s2i(str), y = imns.s2i(num);
            if (isNaN(x) || isNaN(y))
                return;
            while (str.length < num)
                str = '0'+str;
            return str;
        };
        var str = prepend(x.getHours(), 2)+":"+
            prepend(x.getMinutes(), 2)+":"+
            prepend(x.getSeconds(), 2)+"."+
            prepend(x.getMilliseconds(), 3);
        return str;
    },

    init: function() {
        this.profiler_data = new Array();
        this.macroStartTime = new Date();
        this.enabled = false;
    },


    start: function(action) {
        if (!this.enabled)
            return;
        this.currentAction = action;
        this.startTime = new Date();
    },

    
    end: function(err_text, err_code, mplayer) {
        if (!this.enabled || !this.startTime)
            return;
        var now = new Date();
        var elapsedTime = (now.getTime()-this.startTime.getTime())/1000;

        // form new profiler data object
        var data = {
            Line: this.currentAction.line+mplayer.linenumber_delta,
            StartTime: this.make_str(this.startTime),
            EndTime: this.make_str(now),
            ElapsedSeconds: elapsedTime.toFixed(3),
            StatusCode: err_code,
            StatusText: err_text,
            type: mplayer.ignoreErrors ? "errorignoreyes" : "errorignoreno"
        };

        // add timeout_threshold value if applicable
        if (this.currentAction.name == "tag") {
            var threshold = (mplayer.tagTimeout > 0) ?
                mplayer.tagTimeout : mplayer.timeout/10;
            // get threshold in percents of timeout_tag
            data.timeout_threshold =
                ((elapsedTime/threshold)*100).toFixed();
        } else if (this.currentAction.name == "url") {
            // get threshold in percents of timeout_page
            data.timeout_threshold =
                ((elapsedTime/mplayer.timeout)*100).toFixed();
        }
        // console.log("new profiler data, %O", data);
        this.profiler_data.push(data);

        // clear start data
        delete this.currentAction;
        delete this.startTime;
    },

    getResultingXMLFragment: function(mplayer) {
        if (!this.enabled)
            return "";
        var macroEndTime = new Date();
        var source = imns.trim(mplayer.source).split("\n");
        var doc = document.implementation.createDocument("", "Profile", null);
        var macro = doc.createElement("Macro");
        var name = doc.createElement("Name");
        name.textContent = mplayer.currentMacro;
        macro.appendChild(name);

        var lastStartTime = null; // this is for start/end time of comments

        // this is a counter for profiler_data[]
        var j = mplayer.linenumber_delta == 0 ? 0 : -mplayer.linenumber_delta;
        for (var i = 0; i < source.length; i++) {
            if (j < this.profiler_data.length &&
                this.profiler_data[j].Line == i+1+mplayer.linenumber_delta) {
                var command = doc.createElement("Command");
                var string = doc.createElement("String");
                // first set String node
                string.textContent = imns.trim(source[i]);
                command.appendChild(string);
                var x = this.profiler_data[j];
                for (var y in x) {
                    if (y != "type" && y != "timeout_threshold") {
                        var z = doc.createElement(y);
                        z.textContent = x[y];
                        command.appendChild(z);
                    }
                }
                // set 'type' attribute
                var type = doc.createAttribute("type");
                type.nodeValue = x.type;
                command.setAttributeNode(type);
                // set 'timeout_threshold' attribute
                if (x.timeout_threshold) {
                    var tt = doc.createAttribute("timeout_threshold");
                    tt.nodeValue = x.timeout_threshold;
                    command.setAttributeNode(tt);
                }
                lastStartTime = x.StartTime;
                j++;
                // now append the resulting node to "Macro"
                macro.appendChild(command);
            } 
        }

        // add total nodes
        var start = doc.createElement("Start"); // macro start time
        start.textContent = this.make_str(this.macroStartTime);
        var end = doc.createElement("End"); // macro end time
        end.textContent = this.make_str(macroEndTime);
        var elapsed = doc.createElement("ElapsedSeconds"); // macro duration
        var duration = (macroEndTime.getTime()-
                        this.macroStartTime.getTime())/1000;
        elapsed.textContent = duration.toFixed(3);
        var status = doc.createElement("Status"); // error code and text
        var code = doc.createElement("Code");
        code.textContent = mplayer.errorCode;
        var text = doc.createElement("Text");
        text.textContent = mplayer.errorMessage;
        
        status.appendChild(code);
        status.appendChild(text);
        macro.appendChild(start);
        macro.appendChild(end);
        macro.appendChild(elapsed);
        macro.appendChild(status);
        
        doc.documentElement.appendChild(macro);
        var s = new XMLSerializer();
        var result = s.serializeToString(doc);

        return result.replace(/^[.\n\r]*<Profile>\s*/, "").
            replace(/\s*<\/Profile>/, "");
    }
};


MacroPlayer.prototype.saveProfilerData = function() {
    var xml_frag = this.profiler.getResultingXMLFragment(this);
    var file = null;
    if (this.profiler.file) { // file was set with !FILE_PROFILER
        if (__is_full_path(this.profiler.file)) {
            file = afio.openNode(this.profiler.file);
        } else {
            file = afio.openNode(localStorage["defdownpath"]);
            var leafname = /\.xml$/i.test(this.profiler.file)?
                this.profiler.file : this.profiler.file+".xml";
            file.append(leafname);
        }
    } else {
        file = afio.openNode(localStorage["defdownpath"]);
        file.append("Chrome_Profiler_"+imns.formatDate("yyyy-mm-dd")+".xml");
    }

    file.exists(function(exists, ee) {
        if (exists) {
            afio.readTextFile(file, function(x, err) {
                if (err) {console.error(err); return;}
                x = x.replace(/\s*<\/Profile>\s*$/, "\n"+xml_frag+"</Profile>");
                afio.writeTextFile(file, x, function(e) {
                    if (e) console.error(e);
                });
            });
        } else {
            var x = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n"+
                "<?xml-stylesheet type='text/xsl' href='Profiler.xsl'?>\n"+
                "<Profile>\n"+
                "<!--Profiled with iMacros for Chrome "+
                Storage.getChar("version")+" on "+(new Date())+"-->";
            x += xml_frag;
            x += "</Profile>";
            afio.writeTextFile(file, x, function(e) {
                if (e) console.error(e);
            });
        }
    });
};


MacroPlayer.prototype.stop = function() {    // Stop playing
    this.playing = false;
    this.removeListeners();
    if (this.errorCode != 1) // save stopwatch result in case of error
        this.saveStopwatchResults();
    
    // clear wait and delay timeout if any
    if (this.delayTimeout) {
        clearTimeout(this.delayTimeout);
        delete this.delayTimeout;
    }
    if (this.waitTimeout) {
        clearTimeout(this.waitTimeout);
        delete this.waitTimeout;
    }
    if (this.countdown) {
        clearInterval(this.countdown);
        delete this.countdown;
    }
    if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        delete this.loadingTimeout;
    }
    
    if (this.loadingInterval) {
        clearInterval(this.loadingInterval);
        delete this.loadingInterval;
    }

    
    // stop profile timer
    // NOTE: handleError() saves data from broken action
    this.profiler.end("OK", 1, this);
    // write profiler data if any
    if (this.writeProfilerData) {
        this.saveProfilerData();
    }

    // tell content script do some clean-up
    communicator.postMessage("stop-replaying", {}, this.tab_id,
                             function() {});
    
    // clear user-set variables
    this.vars = new Array(10);
    this.userVars = new Object();
    context.updateState(this.win_id,"idle");

    // restore proxy settings
    if (this.proxySettings) {
        this.restoreProxySettings();
        this.proxySettings = null;
    }
    
    // remove badge text
    badge.clearText(this.win_id);
    
    // reset panel
    var panel = context[this.win_id].panelWindow;
    if (panel && !panel.closed)
        panel.setLoopValue(1);

    // show macro tree
    if (panel && !panel.closed)
        panel.showMacroTree();
    
    if (this.client_id) {
        var extra = {
            extractData: this.getExtractData(),
            lastPerformance: this.lastPerformance
        };
        if (this.profiler.si_enabled) {
            delete this.profiler.si_enabled;
            extra.profilerData =
                this.profiler.getResultingXMLFragment(this);
        }
        nm_connector.sendResponse(
            this.client_id,
            this.errorMessage,
            this.errorCode,
            extra
        );
    }

    if (this.callback) {
        var f = this.callback, self = this;
        delete this.callback;
        setTimeout(function() {f(self);}, 0);
    }
};



// functions to manipulate extraction results
MacroPlayer.prototype.getExtractData = function () {
    return this.extractData;
};

MacroPlayer.prototype.addExtractData = function(str) {
    if ( this.extractData.length ) {
        this.extractData += "[EXTRACT]"+str;
    } else {
        this.extractData = str;
    }
};

MacroPlayer.prototype.clearExtractData = function() {
    this.extractData = "";
};


// Show Popup for extraction
MacroPlayer.prototype.showAndAddExtractData = function(str) {
    this.addExtractData(str);
    if (!this.shouldPopupExtract || this.client_id)
        return;
    this.waitingForExtract = true;
    var features = "titlebar=no,menubar=no,location=no,"+
        "resizable=yes,scrollbars=yes,status=no,"+
        "width=430,height=380";
    var win = window.open("extractDialog.html",
        null, features);
    win.args = {
        data: str,
        mplayer: this
    };
};



// Datasources
MacroPlayer.prototype.loadDataSource = function(filename) {
    var file;
    if (!__is_full_path(filename)) {
        if (this.dataSourceFolder)
            file = this.dataSourceFolder.clone();
        else
            file = afio.openNode(localStorage["defdatapath"]);
        file.append(filename);
    } else {
        file = afio.openNode(filename);
    }
    var mplayer = this;
    file.exists(function(exists) {
        if (!exists) {
            mplayer.handleError(
                new RuntimeError("Data source file does not exist", 730)
            );
            return;
        }
        mplayer.dataSourceFile = file.path;
        afio.readTextFile(file, function(data, err) {
            if (err) {
                mplayer.handleError(err);
                return;
            }
            if (!/\r?\n$/.test(data))
                data += "\n";     // add \n to make regexp not so complicated
            mplayer.dataSource = new Array();
            // regexp to match single data field
            // based on http://edoceo.com/utilitas/csv-file-format
            var ws = '[ \t\v]';   // non-crlf whitespace,
            // TODO: should we include all Unicode ws?
            var delim = mplayer.dataSourceDelimiter;
            var field = ws+'*("(?:[^\"]+|"")*"|[^'+delim+'\\n\\r]*)'+ws+
                '*('+delim+'|\\r?\\n|\\r)';
            var re = new RegExp(field, "g"), m, vals = new Array();
            while (m = re.exec(data)) {
                var value = m[1], t;
                if (t = value.match(/^\"((?:[\r\n]|.)*)\"$/))
                    value = t[1];   // unquote the line
                value = value.replace(/\"{2}/g, '"'); // normalize double quotes
                // HACK: every {{!COLn}} variable is "unwrap()-ped" in
                // command handlers so we have to do some trickery to
                // preserve double-quoted strings
                // see fx #362
                if (t = value.match(/^\"((?:[\r\n]|.)*)\"$/))
                    value = '"\\"'+t[1]+'\\""';
                vals.push(value);

                if (m[2] != delim) {
                    mplayer.dataSource.push(vals.slice(0));
                    vals = new Array();
                }
            }
            
            if (!mplayer.dataSource.length) {
                mplayer.handleError(
                    new RuntimeError("Can not parse datasource file "+
                                     filename, 752)
                );
            }
        });
    });
};


MacroPlayer.prototype.getColumnData = function (col) {
    var line =  this.dataSourceLine || this.currentLoop;

    if (!line) 
        line = 1;

    var max_columns = this.dataSourceColumns || this.dataSource[line-1].length;
    if (col > max_columns)
        throw new RuntimeError("Column number "+col+
                               " greater than total number"+
                               " of columns "+max_columns, 753);
    
    return this.dataSource[line-1][col-1];
};


// functions to access user defined variables
MacroPlayer.prototype.setUserVar = function(name, value) {
    this.userVars[name.toLowerCase()] = value;
};

MacroPlayer.prototype.getUserVar = function(name) {
    return this.userVars[name.toLowerCase()];
};

MacroPlayer.prototype.hasUserVar = function(name) {
    return this.userVars.hasOwnProperty(name.toLowerCase());
};




function InterruptSignal(eval_id) {
    this.id = eval_id;
    this.name = "InterruptSignal";
    this.message = "Script interrupted";
}

MacroPlayer.prototype.do_eval = function (s, eval_id) {
    // check if we already eval-ed the expression
    if (this.__eval_results[eval_id]) {
        var result = this.__eval_results[eval_id].result;
        delete this.__eval_results[eval_id];
        return (result || "").toString();
    } else {
        // there was no expression result so send it to sandbox
        var str = s ? imns.unwrap(s) : "";
        var eval_data = {
            id: eval_id,
            expression: str
        };

        $("sandbox").contentWindow.postMessage(eval_data, "*");
        // we should put previos action back to stack
        this.playingAgain = true;
        // interrupt macro execution to wait for sandbox answer
        throw new InterruptSignal(eval_id);
    }
};


MacroPlayer.prototype.onSandboxMessage = function(event) {
    var x = event.data;
    this.__eval_results[x.id] = {
        result: typeof(x.result) == "undefinded" ? "undefinded" : x.result
    };
    
    if (x.error) {
        this.handleError(x.error);
    } else {
        this.playNextAction("eval");
    }
};

MacroPlayer.prototype.onInterrupt = function(eval_id) {
    if (Storage.getBool("debug")) {
        console.log("Caught interrupt exception, eval_id="+eval_id);
    }
};

// This function substitutes all occurrences of
// {{varname}} with the variable value
// Use '#NOVAR#{{' to insert '{{'
// (the function would fail if a variable contains '#novar#{' string)
MacroPlayer.prototype.expandVariables = function(param, eval_id) {
    // first replace all #NOVAR#{{ by #NOVAR#{
    param = param.replace(/#novar#\{\{/ig, "#NOVAR#{");
    // substitute {{vars}}
    var mplayer = this;
    var handleVariable = function (match_str, var_name) {
        var t = null;
        if ( t = var_name.match(/^!var([0-9])$/i) ) {
            return mplayer.vars[imns.s2i(t[1])];
        } else if ( t = var_name.match(/^!extract$/i) ) {
            return mplayer.getExtractData();
        } else if ( t = var_name.match(/^!urlcurrent$/i) ) {
            return mplayer.currentURL;
        } else if ( t = var_name.match(/^!col(\d+)$/i) ) {
            return mplayer.getColumnData(imns.s2i(t[1]));
        } else if ( t = var_name.match(/^!datasource_line$/i) ) {
            return mplayer.dataSourceLine || mplayer.currentLoop;
        } else if ( t = var_name.match(/^!datasource_columns$/i) ) {
            return mplayer.dataSourceColumns;
        } else if ( t = var_name.match(/^!datasource_delimiter$/i) ) {
            return mplayer.dataSourceDelimiter;
        } else if ( t = var_name.match(/^!datasource$/i) ) {
            return mplayer.dataSourceFile;
        } else if ( t = var_name.match(/^!folder_datasource$/i) ) {
            return mplayer.dataSourceFolder ?
                mplayer.dataSourceFolder.path : "__undefined__";
        } else if ( t = var_name.match(/^!now:(\S+)$/i) ) {
            return imns.formatDate(t[1]);
        } else if ( t = var_name.match(/^!loop$/i) ) {
            return mplayer.currentLoop;
        } else if ( t = var_name.match(/^!clipboard$/i) ) {
            return imns.Clipboard.getString() || "";
        }  else if ( t = var_name.match(/^!timeout(?:_page)?$/i) ) {
            return mplayer.timeout;
        } else if ( t = var_name.match(/^!timeout_(?:tag|step)?$/i) ) {
            return mplayer.tagTimeout;
        } else if ( t = var_name.match(/^!stopwatchtime$/i) ) {
            // convert to d+\.d{3} format
            var value = mplayer.lastWatchValue.toFixed(3).toString();
            return value;
        } else {                // a user-defined variable
            var value = "__undefined__";
            if (mplayer.hasUserVar(var_name))
                value = mplayer.getUserVar(var_name);
            return value;
        }
    };


    // check for "eval" command
    var eval_re = new RegExp("^eval\\s*\\((.*)\\)$", "i");
    var match = null;
    if (match = eval_re.exec(param)) {
        var escape = function (s) {
            var x = s.toString();
            return x.replace(/"/g, "\\\\\"").
                replace(/'/g, "\\\\\'").
                replace(/\n/g, "\\\\n").
                replace(/\r/g, "\\\\r");
        };
        var js_str = match[1].replace(/\{\{(\S+?)\}\}/g, function(m, s) {
            return escape(handleVariable(m, s))
        });
        // substitute all #novar#{ by {{
        js_str = js_str.replace(/#novar#\{(?=[^\{])/ig, "{{");
        param = this.do_eval(js_str, eval_id);
    } else {
        param = param.replace(/\{\{(\S+?)\}\}/g, handleVariable);
        // substitute all #novar#{ by {{
        param = param.replace(/#novar#\{(?=[^\{])/ig, "{{");
    }
    
    return param;
};

