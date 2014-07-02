/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


// An object to encapsulate all recording operations
// on extension side
function Recorder(win_id) {
    this.win_id = win_id;
    this.recording = false;
    communicator.registerHandler("record-action",
                                 this.onRecordAction.bind(this), win_id);
    communicator.registerHandler("query-state",
                                 this.onQueryState.bind(this), win_id);
    // make bindings of event listeners
    this.onActivated = this.onTabActivated.bind(this);
    this.onCreated = this.onTabCreated.bind(this);
    // this.onUpdated = this.onTabUpdated.bind(this);
    this.onRemoved = this.onTabRemoved.bind(this);
    this.onMoved = this.onTabMoved.bind(this);
    this.onAttached = this.onTabAttached.bind(this);
    this.onDetached = this.onTabDetached.bind(this);

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

    this.onCommitted = this.onNavigation.bind(this);
};


Recorder.prototype.checkForFrameChange = function(frame) {
    if (frame.number != this.currentFrameNumber) {
        this.currentFrameNumber = frame.number;
        if (0 && frame.name) {
            this.recordAction("FRAME NAME=\""+frame.name+"\"");
        } else {
            this.recordAction("FRAME F="+frame.number.toString());
        }
        
    }
};


Recorder.prototype.start = function() {
    console.info("start recording");
    this.writeEncryptionType = true;
    context.updateState(this.win_id,"recording");
    var panel = context[this.win_id].panelWindow;
    if (panel && !panel.closed) {
        panel.showLines();
        panel.setStatLine("Recording...", "info");
    }
    // create array to store recorded actions
    this.actions = new Array();
    var recorder = this;
    chrome.tabs.query({active: true, windowId: this.win_id}, function (tabs) {
        recorder.recording = true;
        // save starting tab index
        recorder.startTabIndex = tabs[0].index;
        // add browser events listeners
        recorder.addListeners();
        // reset frame number
        recorder.currentFrameNumber = 0;
        // notify content script that recording was started
        communicator.broadcastMessage("start-recording", {}, recorder.win_id);
        // save intial commands
        recorder.recordAction(version_string);
        if (!/^chrome:/.test(tabs[0].url)) {
            recorder.recordAction("URL GOTO="+tabs[0].url);
        }
    });
};


Recorder.prototype.stop = function() {
    console.info("stop recording");
    // notify content script that recording was stopped
    communicator.broadcastMessage("stop-recording", {}, this.win_id);
    context.updateState(this.win_id, "idle");
    
    this.recording = false;
    this.removeListeners();
    // remove text from badge
    badge.clearText(this.win_id);
    var panel = context[this.win_id].panelWindow;
    if (panel && !panel.closed)
        panel.showMacroTree();
};


Recorder.prototype.recordAction = function (cmd) {
    var panel = context[this.win_id].panelWindow;
    this.actions.push(cmd);
    if (panel && !panel.closed) {
        panel.addLine(cmd);
    }

    badge.set(this.win_id, {
        status: "recording",
        text:  this.actions.length.toString()
    });
    
    this.afterRecordAction(cmd);
    console.info("recorded action: "+cmd);
};


Recorder.prototype.afterRecordAction = function(rec) {
    // password elements handling
    if (!/!ENCRYPTION|TYPE=INPUT:PASSWORD|ONLOGIN/i.test(rec)) {
        this.writeEncryptionType = true;
    }
};


Recorder.prototype.onRecordAction = function(data, tab_id, callback) {
    // console.log("onRecordAction, data="+JSON.stringify(data));
    if (callback)   // release resources
        callback();

    if (data._frame) {
        this.checkForFrameChange(data._frame);
    }

    var cmd = data.action;
    
    // check for double-command
    var match_part = cmd;
    if (/^(tag .*\s+content\s*=)/i.test(cmd))
        match_part = RegExp.$1;
    if (this.actions.length &&
        this.actions[this.actions.length-1].indexOf(match_part) == 0) {
        // remove previously recorded element if it matches
        // with the current one
        // useful for selectboxes and double clicking
        this.actions.pop();
        var panel = context[this.win_id].panelWindow; 
        if (panel && !panel.closed) {
            panel.removeLastLine();
        }
    }
    
    // test action for password element
    var m, pwd_re = "\\btype=input:password\\b.+content=(\\S+)\\s*$";
    pwd_re = new RegExp(pwd_re, "i");
    if (m = pwd_re.exec(cmd)) { // handle password
        var plaintext = m[1], cyphertext;
        var typ = Storage.getChar("encryption-type");
        if (!typ.length)
            typ = "no";
        
        switch(typ) {
        case "no":
            if (this.writeEncryptionType) {
                this.writeEncryptionType = false;
                this.recordAction("SET !ENCRYPTION NO");
            }
            break;
        case "stored":      // get password from storage
            if (this.writeEncryptionType) {
                this.writeEncryptionType = false;
                this.recordAction("SET !ENCRYPTION STOREDKEY");
            }
            var pwd = Storage.getChar("stored-password");
            // stored password is base64 encoded
            pwd = decodeURIComponent(atob(pwd));
            cyphertext = Rijndael.encryptString(plaintext, pwd);
            cmd = cmd.replace(/(content)=(\S+)\s*$/i, "$1="+cyphertext);

            break;
        case "tmpkey":
            if (this.writeEncryptionType) {
                this.writeEncryptionType = false;
                this.recordAction("SET !ENCRYPTION TMPKEY");
            }
            
            if (!Rijndael.tempPassword) {    // ask password now
                var features = "titlebar=no,menubar=no,location=no,"+
                    "resizable=yes,scrollbars=no,status=no,"+
                    "width=350,height=170";
                var win = window.open("passwordDialog.html",
                                      "iMacros Password Dialog" , features);
                win.args = {
                    shouldProceed: true,
                    type: "recorder",
                    actionIndex: this.actions.length,
                    plaintext: plaintext,
                    cmd: cmd,
                    recorder: this
                };
                // action will be added in passwordDialog
                return;
            } else {
                cyphertext = Rijndael.encryptString(
                    plaintext, Rijndael.tempPassword
                );
                cmd = cmd.replace(/(content)=(\S+)\s*$/i, "$1="+cyphertext);
            }
            break;
        }
    }

    this.recordAction(cmd);
};


Recorder.prototype.saveAs = function() {
    var rec = "SAVEAS TYPE=MHT FOLDER=* FILE=*";
    this.recordAction(rec);
};

Recorder.prototype.capture = function() {
    var rec = "SAVEAS TYPE=PNG FOLDER=* FILE=*";
    this.recordAction(rec);
};



Recorder.prototype.onQueryState = function(data, tab_id, callback) {
    var recorder = this;
    chrome.tabs.get(tab_id, function (tab) {
        if (tab.windowId != recorder.win_id)
            return;
        if (tab.index < recorder.startTabIndex) {
            // don't touch tabs left of start tab
            callback({state: "idle"});
        } else {
            if (recorder.recording) {
                callback({
                    state: "recording",
                    frameNumber: recorder.currentFrameNumber
                });
            } else {
                callback({state: "idle"});
            }
        }
    });
};


// Add listeners for recording events
// tab selection 
Recorder.prototype.onTabActivated = function(activeInfo) {
    if (this.win_id != activeInfo.windowId)
        return;
    var recorder = this;
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        var cur = tab.index - recorder.startTabIndex;
        if (cur < 0) {
            // TODO: add real warning here
            console.warn("Note: Tabs LEFT "+
                         "of the start tab are not recorded.");
            return;
        }
        var cmd = "TAB T="+(cur+1);
        recorder.recordAction(cmd);
    });
    
};

// tab creation
Recorder.prototype.onTabCreated = function(tab) {
    if (this.win_id != tab.windowId)
        return;
    // console.log("onTabCreated, %O", tab);
    
    if (!tab.url && !tab.title) // looks like this tab is opened by web page
        return;
    
    var cmd = "TAB OPEN";
    this.recordAction(cmd);
};

// // tab update
// Recorder.prototype.onTabUpdated = function(tab_id, obj, tab) {
//     if (this.win_id != tab.windowId)
//         return;
//     chrome.tabs.get(tab_id, function (tab) {
//         // TODO: wait for they added 'type' property
//         console.log("onTabUpdated, openerTabId %s", tab.openerTabId);
//         if (obj.status == "loading" && obj.url && !tab.openerTabId) {
//             var cmd = "URL GOTO="+obj.url;
//             recorder.recordAction(cmd);
//         }
//     });
// };


// tab closed
Recorder.prototype.onTabRemoved = function(tab_id) {
    var recorder = this;
    chrome.tabs.get(tab_id, function (tab) {
        if (!tab || recorder.win_id != tab.windowId)
            return;
        var cmd = "TAB CLOSE";
        recorder.recordAction(cmd);
    });
};


// tab move, give a warning
Recorder.prototype.onTabMoved = function(tab_id, obj) {
    if (this.win_id != obj.windowId)
        return;
    // TODO: add real warning
    console.warn("tab move not supported");
};

// tab attached, give a warning
Recorder.prototype.onTabAttached = function(tab_id, obj) {
    if (this.win_id != obj.newWindowId)
        return;
    // TODO: add real warning
    console.warn("tab attachment not supported");
    
};

// tab detached, give a warning
Recorder.prototype.onTabDetached = function(tab_id, obj) {
    if (this.win_id != obj.oldWindowId)
        return;
    
    // TODO: add real warning
    console.warn("tab detachment not supported");
    
};


Recorder.prototype.onNavigation = function(details) {
    var recorder = this;
    chrome.tabs.get(details.tabId, function(tab) {
        if (!tab || tab.windowId != recorder.win_id)
            return;
        // console.log("onNavigation: %O", details);
        if (details.transitionQualifiers.length &&
            details.transitionQualifiers[0] == "forward_back") {
            // TODO: it appeared too complicated to find out
            // if it was Back or Forward button pressed,
            // so it simply records BACK command
            // anyways, there is no FORWARD command ;)
            recorder.recordAction("BACK");
        } else {
            switch(details.transitionType) {
            case "typed": case "auto_bookmark":
                recorder.recordAction("URL GOTO="+tab.url);
                break;
            case "link": case "generated":
                if (details.transitionQualifiers.length &&
                    details.transitionQualifiers[0] == "from_address_bar") {
                    recorder.recordAction("URL GOTO="+tab.url);
                }
                break;
            case "reload":
                recorder.recordAction("REFRESH");
                break;
            }
        }
    });
};


// network events
Recorder.prototype.onAuthRequired = function(details, callback) {
    // console.log("onAuthRequired: %O", details);
    
    // password encryption

    var enc = {};
    
    var typ = Storage.getChar("encryption-type");
    if (!typ.length)
        typ = "no";
    
    switch(typ) {
    case "no":
        enc.encrypt = false;
        if (this.writeEncryptionType) {
            this.writeEncryptionType = false;
            this.recordAction("SET !ENCRYPTION NO");
        }
        break;
    case "stored":      // get password from storage
        enc.encrypt = true;
        if (this.writeEncryptionType) {
            this.writeEncryptionType = false;
            this.recordAction("SET !ENCRYPTION STOREDKEY");
        }
        var pwd = Storage.getChar("stored-password");
        // stored password is base64 encoded
        pwd = decodeURIComponent(atob(pwd));
        enc.key = pwd;
        break;
    case "tmpkey":
        enc.encrypt = true;
        if (this.writeEncryptionType) {
            this.writeEncryptionType = false;
            this.recordAction("SET !ENCRYPTION TMPKEY");
        }
        
        if (!Rijndael.tempPassword) {    // ask password now
            var features = "titlebar=no,menubar=no,location=no,"+
                "resizable=yes,scrollbars=no,status=no,"+
                "width=350,height=170";
            var win = window.open("passwordDialog.html",
                                  "iMacros Password Dialog" , features);
            win.args = {
                shouldProceed: true,
                type: "loginDialog",
                // CHEAT: passwordDialog will call auth callback
                // with false user/pwd pair so next time onAuthRequired
                // will have temp password
                callback: callback
            };
            return;
        } else {
            enc.key = Rijndael.tempPassword;
        }
        break;
    }
    
    var features = "titlebar=no,menubar=no,location=no,"+
        "resizable=yes,scrollbars=no,status=no,"+
        "width=350,height=170";
    var win = window.open("loginDialog.html",
                          "iMacros Login Dialog" , features);
    win.args = {
        cypherData: enc,
        details: details,
        callback: callback,
        recorder: this
    };
};


// Recorder.prototype.onBeforeRequest = function(details) {
//     console.log("onBeforeReqeust: %O", details);
// };

// Recorder.prototype.onBeforeRedirect = function(details) {
//     console.log("onBeforeRedirect: %O", details);
// };


// Recorder.prototype.onBeforeSendHeaders = function(details) {
//     console.log("onBeforeSendHeaders: %O", details);
// };

// Recorder.prototype.onReqCompleted = function(details) {
//     console.log("onReqCompleted: %O", details);
// };

// Recorder.prototype.onErrorOccurred = function(details) {
//     console.log("onErrorOccured: %O", details);
// };

// Recorder.prototype.onHeadersReceived = function(details) {
//     console.log("onHeadersReceived: %O", details);
// };

// Recorder.prototype.onResponseStarted = function(details) {
//     console.log("onResponseStarted: O", details);
// };

Recorder.prototype.onSendHeaders = function(details) {
    // console.log("onSendHeaders: %O", details);
};



Recorder.prototype.addListeners = function() {
    // add listeners
    chrome.tabs.onActivated.addListener(this.onActivated);
    chrome.tabs.onCreated.addListener(this.onCreated);
    // chrome.tabs.onUpdated.addListener(this.onUpdated);
    chrome.tabs.onRemoved.addListener(this.onRemoved);
    chrome.tabs.onMoved.addListener(this.onMoved);
    chrome.tabs.onAttached.addListener(this.onAttached);
    chrome.tabs.onDetached.addListener(this.onDetached);

    // here we catch typed navigation events
    chrome.webNavigation.onCommitted.addListener(this.onCommitted);
    
    // network events
    chrome.webRequest.onAuthRequired.addListener(
        this.onAuth,
        {windowId: this.win_id, urls: ["<all_urls>"]},
        ["asyncBlocking"]
    );
    // chrome.webRequest.onBeforeRequest.addListener(
    //     this.onRequest,
    //     {windowId: this.win_id, urls: ["<all_urls>"]}
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
    //     {windowId: this.win_id, urls: ["<all_urls>"]},
    //     ["responseHeaders"]
    // );
    // chrome.webRequest.onErrorOccurred.addListener(
    //     this.onReqError,
    //     {windowId: this.win_id, urls: ["<all_urls>"]}
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

// remove recording listeners
Recorder.prototype.removeListeners = function() {
    chrome.tabs.onActivated.removeListener(this.onActivated);
    chrome.tabs.onCreated.removeListener(this.onCreated);
    // chrome.tabs.onUpdated.removeListener(this.onUpdated);
    chrome.tabs.onRemoved.removeListener(this.onRemoved);
    chrome.tabs.onMoved.removeListener(this.onMoved);
    chrome.tabs.onAttached.removeListener(this.onAttached);
    chrome.tabs.onDetached.removeListener(this.onDetached);

    // typed navigation
    chrome.webNavigation.onCommitted.removeListener(this.onCommitted);
    
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
