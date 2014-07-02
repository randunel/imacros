/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


function __play(runLocalTest, callback) {
    var win_id = args.win_id;
    var bg = chrome.extension.getBackgroundPage();
    var mplayer = bg.context[win_id].mplayer;
    var doc = window.frames["tree-iframe"].contentDocument;
    var container = doc.getElementById("imacros-macro-container");
    var div = doc.getElementById("imacros-bookmark-div");
    var macro = {};
    if (!runLocalTest && mplayer.paused) {
        mplayer.unpause();
        return;
    }

    if (div.hasAttribute("file_id")) {
        var node = afio.openNode(div.getAttribute("file_id"));
        macro.file_id = node.path;
        afio.readTextFile(node, function(source, err) {
            // TODO: it would be better to display the error
            // on the info area of the panel
            if (err) {
                console.error(err);
                alert("Can not read macro file, error "+err);
                return;
            }
            macro.source = source;
            macro.name = div.getAttribute("name");
            macro.runLocalTest = runLocalTest;
            mplayer.play(macro, callback);
        });
    } else if (div.hasAttribute("bookmark_id")) {
        macro.source = container.value;
        macro.bookmark_id = div.getAttribute("bookmark_id");
        macro.name = div.getAttribute("name");
        macro.runLocalTest = runLocalTest;
        mplayer.play(macro, callback);
    }
}

// play-button click handler
function play() {
    if ($("play-button").getAttribute("disabled") == "true")
        return;
    __play(false);
}

function playLoop() {
    if ($("loop-button").getAttribute("disabled") == "true")
        return;
    var cur = parseInt($("current-loop").value);
    var max = parseInt($("max-loop").value);
    if (cur > max) {
        alert("Current loop value should be less or equivalent max loop value");
        return;
    }

    var win_id = args.win_id;
    var bg = chrome.extension.getBackgroundPage();
    var mplayer = bg.context[win_id].mplayer;
    var doc = window.frames["tree-iframe"].contentDocument;
    var container = doc.getElementById("imacros-macro-container");
    var div = doc.getElementById("imacros-bookmark-div");
    var macro = {
        name: div.getAttribute("name"),
        times: max,
        startLoop: cur
    };
    
    if (div.hasAttribute("file_id")) {
        var node = afio.openNode(div.getAttribute("file_id"));
        macro.file_id = div.getAttribute("file_id");
        afio.readTextFile(node, function(source, err) {
            if (err) {
                alert("Can not open "+container.value+
                      ", reason: "+err);
                console.error(err);
                return;
            }
            macro.source = source;
            mplayer.play(macro);
        });
    } else if (div.hasAttribute("bookmark_id")) {
        macro.source = container.value;
        mplayer.play(macro);
    } 
}

// Pause button handler
function pause() {
    if ($("pause-button").getAttribute("disabled") == "true")
        return;
    try {
        var win_id = args.win_id;
        var bg = chrome.extension.getBackgroundPage();
        var mplayer = bg.context[win_id].mplayer;
        if (mplayer.playing) {
            mplayer.pause();
        } 
    } catch (e) {
        console.error(e);
    }
}

// Edit button handler
function edit() {
    if ($("edit-button").getAttribute("disabled") == "true")
        return;
    var bg = chrome.extension.getBackgroundPage();
    var doc = window.frames["tree-iframe"].contentDocument;
    var container = doc.getElementById("imacros-macro-container");
    var div = doc.getElementById("imacros-bookmark-div");
    var source = "", name = div.getAttribute("name");
    var macro = {name: name, win_id: args.win_id};

    if (div.hasAttribute("file_id")) {
        var file_id = div.getAttribute("file_id");
        var node = afio.openNode(file_id);
        afio.readTextFile(node, function(source, e) {
            if (e) {
                alert("Can not open "+container.value+
                      ", reason: "+e);
                console.error(e);
                return;
            }
            macro.source = source;
            macro.file_id = file_id;
            bg.edit(macro, true);
        });
    } else if (div.hasAttribute("bookmark_id")) {
        source = container.value;
        var bookmark_id = div.getAttribute("bookmark_id");
        macro.source = source;
        macro.bookmark_id = bookmark_id;
        bg.edit(macro, true);
    } 
}


// Record button handler
function record() {
    if ($("record-button").getAttribute("disabled") == "true")
        return;
    var win_id = args.win_id;
    var bg = chrome.extension.getBackgroundPage();
    var recorder = bg.context[win_id].recorder;
    try {
        recorder.start();
    } catch (e) {
        console.error(e);
    } 
}

// Stop button handler
function stop() {
    var win_id = args.win_id;
    var bg = chrome.extension.getBackgroundPage();
    
    var mplayer = bg.context[win_id].mplayer;
    var recorder = bg.context[win_id].recorder;
    
    if (mplayer.playing) {
        mplayer.stop();
    } else if (recorder.recording) {
        recorder.stop();
        var recorded_macro = recorder.actions.join("\n");
        
        var macro = {source: recorded_macro, win_id: win_id,
                     name: "#Current.iim"};

        if (Storage.getChar("tree-type") == "files") {
            afio.isInstalled(function(installed, e) {
                if (e) {console.error(e);}
                if (installed) {
                    var node = afio.openNode(localStorage["defsavepath"]);
                    node.append("#Current.iim");
                    macro.file_id = node.path;
                    bg.edit(macro, /* overwrite */ true);
                } else {            // no file access
                    bg.edit(macro, true);
                }
            });
        } else {
            bg.edit(macro, true);
        }
    }
}


// called when a macro is selected in tree-view
function onSelectionChanged(selected) {
    var disable = function (btns) {
        for (var x = 0; x < arguments.length; x++) {
            var b = $(arguments[x]+"-button");
            b.setAttribute("disabled", "true");
        }
    };
    var enable = function (btns) {
        for (var x = 0; x < arguments.length; x++) {
            var b = $(arguments[x]+"-button");
            b.setAttribute("disabled", "false");
        }
    };

    // change 'disabled' status of buttons
    if (selected) {
        enable("play", "loop", "edit",
               "local-test", "online-test", "af-upload");
    } else {
        disable("play", "loop", "edit",
                "local-test", "online-test", "af-upload");
    }
}


function updatePanel(state) {
    var show = function (btns) {
        for (var x = 0; x < arguments.length; x++) {
            $(arguments[x]+"-button").setAttribute("collapsed", "false");
        }
    };
    var hide = function (btns) {
        for (var x = 0; x < arguments.length; x++) {
            $(arguments[x]+"-button").setAttribute("collapsed", "true");
        }
    };
    var hideInfo = function() {
        $("info-div").setAttribute("hidden", "true");
        $("logo-and-links").removeAttribute("hidden");
    };
    var disable = function (btns) {
        for (var x = 0; x < arguments.length; x++) {
            var b = $(arguments[x]+"-button");
            b.setAttribute("disabled", "true");
        }
    };
    var enable = function (btns) {
        for (var x = 0; x < arguments.length; x++) {
            var b = $(arguments[x]+"-button");
            b.setAttribute("disabled", "false");
        }
    };
    switch(state) {
    case "playing":
        show("pause");
        hide("play");
        enable("stop-replaying");
        disable("loop", "record", "stop-recording", "saveas", "capture",
                "edit", "local-test", "online-test", "af-upload");
        hideInfo();
        break;
    case "paused":
        show("play");
        hide("pause");
        break;
    case "recording":
        enable("stop-recording", "saveas", "capture");
        disable("play", "loop", "record", "edit", "local-test",
                "online-test", "af-upload");
        hideInfo();
        break;
    case "idle":
        show("play");
        hide("pause");
        enable("play", "loop", "record", "edit", "local-test",
               "online-test", "af-upload");
        disable("stop-recording", "stop-replaying", "saveas", "capture");
        break;
    }
    
}


function onTreeSelect(type) {
    Storage.setChar("tree-type", type);
    var tree_iframe = $("tree-iframe");
    if (type == "files") {
        $("radio-files-tree").checked="yes";
        tree_iframe.src = "fileView.html";
    } else if (type == "bookmarks") {
        tree_iframe.src = "treeView.html";
        $("radio-bookmarks-tree").checked="yes";
    }
}


window.addEventListener("load", function() {
    var bg = chrome.extension.getBackgroundPage();
    args = {win_id: bg.onPanelLoaded(window)};
    var tree_type = Storage.isSet("tree-type") ?
        Storage.getChar("tree-type") : "files";
    afio.isInstalled(function(installed) {
        if (!/^(?:files|bookmarks)$/.test(tree_type)) {
            tree_type = installed ? "files" : "bookmarks"
        }
        if (tree_type == "files" && installed) {
            onTreeSelect("files");
        } else {
            onTreeSelect("bookmarks");
        }
    });
    // attach various event handlers
    $("play-button").addEventListener("click", play);
    $("pause-button").addEventListener("click", pause);
    $("record-button").addEventListener("click", record);
    $("stop-replaying-button").addEventListener("click", stop);
    $("stop-recording-button").addEventListener("click", stop);
    $("saveas-button").addEventListener("click", onSaveAs);
    $("capture-button").addEventListener("click", onCapture);
    $("loop-button").addEventListener("click", playLoop);
    $("edit-button").addEventListener("click", edit);
    $("settings-button").addEventListener("click", function() {
        link("options.html")
    });
    $("info-edit-button").addEventListener("click", onInfoEdit);
    $("info-help-button").addEventListener("click", onInfoHelp);
    $("info-close-button").addEventListener("click", onInfoClose);

    $("radio-files-tree").addEventListener("change", function() {
        onTreeSelect('files');
    });
    $("radio-bookmarks-tree").addEventListener("change", function() {
        onTreeSelect('bookmarks');
    });

    $("home-link").addEventListener("click", function() {
        link('http://www.iopus.com/imacros/chrome/');
    });
    $("wiki-link").addEventListener("click", function() {
        link('http://wiki.imacros.net/iMacros_for_Chrome');
    });
    $("forum-link").addEventListener("click", function() {
        link('http://forum.iopus.com/viewforum.php?f=21');
    });
    $("idrone-link").addEventListener("click", function() {
        link('http://wiki.imacros.net/AlertFox_allowed_iMacros_commands');
    });

    $("local-test-button").addEventListener("click", onLocalTest);
    idrone_chk = $("idrone-checkbox");
    idrone_chk.checked = Storage.getBool("af-idrone-test");
    idrone_chk.addEventListener("change", function(evt) {
        Storage.setBool("af-idrone-test", evt.target.checked);
    });
    $("online-test-button").addEventListener("click", onOnlineTest);
    $("af-upload-button").addEventListener("click", onAfUpload);

    document.body.oncontextmenu = function(e) {
        // e.preventDefault();
        // return false;
    };
});


window.addEventListener("beforeunload", function() {
    var bg = chrome.extension.getBackgroundPage();
    chrome.windows.get(bg.context[args.win_id].panelId, function(p) {
        var panelBox = {
            left: p.left, top: p.top,
            width: p.width, height: p.height
        };
        Storage.setObject("panel-box", panelBox);
    });
});


function setLoopValue(val) {
    $("current-loop").value = val;
}


// convert bookmarklet-type macro to file or vice versa
function convert() {
    var win_id = args.win_id;
    var bg = chrome.extension.getBackgroundPage();
    var doc = window.frames["tree-iframe"].contentDocument;
    var container = doc.getElementById("imacros-macro-container");
    var div = doc.getElementById("imacros-bookmark-div");
    var macro = {};
    var type;

    if (div.hasAttribute("file_id")) {
        // convert file to bookmarklet
        type = "bookmark";
        var node = afio.openNode(div.getAttribute("file_id"));
        afio.readTextFile(node, function(source, e) {
            if (e) {
                alert("Can not open "+container.value+
                      ", reason: "+e.toString());
                console.error(e);
                return;
            }
            macro.source = source;
            macro.name = div.getAttribute("name");
            bg.save(macro, false, function(macro) {
                alert("Macro duplicated in "+type+" storage");
            });
        });
    } else if (div.hasAttribute("bookmark_id")) {
        type = "file";
        // convert bookmarklet to file
        macro.source = container.value;
        macro.name = div.getAttribute("name");
        if (!/\.iim$/.test(macro.name))  // append .iim extension
            macro.name += ".iim";
        var node = afio.openNode(localStorage["defsavepath"]);
        node.append(macro.name);
        macro.file_id = node.path;
        bg.save(macro, false, function(macro) {
            alert("Macro duplicated in "+type+" storage");
        });
    } 
}




function showLines(code) {
    $("tree-view").setAttribute("hidden", "true");
    $("macro-view").removeAttribute("hidden");
    if (code && code.length) {
        $("macro-iframe").contentWindow.mv.showLines(code);
    } else {
        $("macro-iframe").contentWindow.mv.clearAllLines();
    }
}

function showMacroTree() {
    $("tree-view").removeAttribute("hidden");
    $("macro-view").setAttribute("hidden", "true");
}

function addLine(txt) {
    $("macro-iframe").contentWindow.mv.addLine(txt);
}

function highlightLine(line) {
    $("macro-iframe").contentWindow.mv.highlightLine(line);
}

function setStatLine(txt, type) {
    $("macro-iframe").contentWindow.mv.setStatLine(txt, type);
}

function removeLastLine() {
    $("macro-iframe").contentWindow.mv.removeLastLine();
}


var info_args = null;

function showInfo(args) {
    info_args = args;
    var info_div = $("info-div");
    info_div.removeAttribute("hidden");
    $("logo-and-links").setAttribute("hidden", "true");
    
    if (args.errorCode != 1) {
        $("info-area").setAttribute("type", "error");
        $("info-edit-button").removeAttribute("collapsed");
        $("info-help-button").removeAttribute("collapsed");
    } else {
        $("info-area").setAttribute("type", "message");
        $("info-edit-button").setAttribute("collapsed", "true");
        $("info-help-button").setAttribute("collapsed", "true");
    }

    $("info-area").textContent = args.message;
}

function onInfoClose() {
    $("info-div").setAttribute("hidden", "true");
    $("logo-and-links").removeAttribute("hidden");
}


function onInfoHelp() {
    var url = "http://www.iopus.com/imacros/home/cr/?error_id="+
        info_args.errorCode;
    var bg = chrome.extension.getBackgroundPage();
    bg.addTab(url, info_args.win_id);
}

function onInfoEdit() {
    // TODO: pass line number to editor
    // var line = 0;
    // if (/, line:\s*(\d+)(?:\s+\(.*\))?$/.test(info_args.message))
    //     line = parseInt(RegExp.$1);
    var bg = chrome.extension.getBackgroundPage();
    bg.edit(info_args.macro, true);
}

function onSaveAs() {
    if ($("saveas-button").getAttribute("disabled") == "true")
        return;
    var win_id = args.win_id;
    var bg = chrome.extension.getBackgroundPage();
    bg.context[win_id].recorder.saveAs();
}

function onCapture() {
    if ($("capture-button").getAttribute("disabled") == "true")
        return;
    var win_id = args.win_id;
    var bg = chrome.extension.getBackgroundPage();
    bg.context[win_id].recorder.capture();
}

function onLocalTest() {
    if ($("local-test-button").getAttribute("disabled") == "true")
        return;
    var btn = $("local-test-button");
    btn.setAttribute("disabled", "true");
    btn.setAttribute("waiting", "true");
    // $("play-tab").checked = true;
    __play(true, function(player) {
        btn.setAttribute("disabled", "false");
        btn.setAttribute("waiting", "false");
        if (player.errorCode == 1) {
            alert("This transaction passed all tests. As next step please run an online test from one of our remote locations.");
        }
    });
}

function __now_really_do_uploadMacro(usr, pwd, skip, macro_source) {
    var xargs = {accountName: usr,
                 accountPassword: pwd,
                 macro: macro_source,
                 browserType: "CR",
                 skipOnlineTest: skip};
    var btn = $(skip ? "af-upload-button" : "online-test-button");
    const wsdl_url = "https://my.alertfox.com/imu/AlertFoxManagementAPI.asmx";
    SOAPClient.invoke(wsdl_url, "UploadMacro", xargs, function(rv, err) {
        btn.setAttribute("disabled", "false");
        btn.setAttribute("waiting", "false");
        if (!rv) {
            alert("Unexcpected error occured while uploading macro: "+
                  err.message);
            return;
        }
        if (rv.errorMessage) {
            alert(rv.errorMessage);
            return;
        } 
        if (!/^https:\/\/my\.alertfox\.com/i.test(rv.UploadMacroResult)) {
            alert("Unexpected server response. URL value "+
                  rv.UploadMacroResult+
                  " does not refer to AlertFox service.");
            return;
        }
        link(rv.UploadMacroResult); 
    });
}

function __uploadMacro(usr, pwd, skip) {
    var win_id = args.win_id;
    var doc = window.frames["tree-iframe"].contentDocument;
    var container = doc.getElementById("imacros-macro-container");
    var div = doc.getElementById("imacros-bookmark-div");
    var macro_source = null;

    if (div.hasAttribute("file_id")) {
        var node = afio.openNode(div.getAttribute("file_id"));
        afio.readTextFile(node, function(macro_source, e) {
            if (e) {
                alert("Can not open "+container.value+
                      ", reason: "+e.toString());
                console.error(e);
                return;
            }
            __now_really_do_uploadMacro(usr, pwd, skip, macro_source);
        });
    } else if (div.hasAttribute("bookmark_id")) {
        macro_source = container.value;
        __now_really_do_uploadMacro(usr, pwd, skip, macro_source);
    } 
}


function uploadMacro(skipOnlineTest) {
    if (!Storage.isSet("af-username") || !Storage.isSet("af-password")) {
        // open login dialog
        var features = "titlebar=no,menubar=no,location=no,"+
            "resizable=yes,scrollbars=no,status=no,"+
            "height=250,width=380";
        var win = window.open("AlertFoxLoginDialog.html",
                              "AlertFox Login Dialog", features);
        win.args = {
            proceed: true,
            wind_id: args.win_id,
            skipOnlineTest: skipOnlineTest
        };
        return;
    }

    var uname = Storage.getChar("af-username");
    var pwd = Storage.getChar("af-password");
    
    // we should check login data first
    // NOTE: I hope one day UploadMacro() will be changed to return more
    // specific error message in case of incorrect credentials. Then there
    // will be no need calling CheckLogin() here
    var xargs = {accountName: uname, accountPassword: pwd};
    var wsdl_url = "https://my.alertfox.com/imu/AlertFoxManagementAPI.asmx";
    var btn = $(skipOnlineTest ? "af-upload-button" : "online-test-button");
    btn.setAttribute("disabled", "true");
    btn.setAttribute("waiting", "true");
    SOAPClient.invoke(wsdl_url, "CheckLogin", xargs, function(rv, err) {
        if (!rv) {
            btn.setAttribute("waiting", "false");
            btn.setAttribute("disabled", "false");
            alert("Error occured while checking credentials: "+
                  err.message);
            return;
        }
        if (rv.CheckLoginResult) {
            __uploadMacro(uname, pwd, skipOnlineTest);
        } else {
            btn.setAttribute("waiting", "false");
            btn.setAttribute("disabled", "false");
            var msg = "Either user name or password is incorrect. Please enter your credentials in the Settings dialog";
            if (confirm(msg)) {
                // open login dialog
                var features = "titlebar=no,menubar=no,location=no,"+
                    "resizable=yes,scrollbars=no,status=no,"+
                    "height=250,width=380";
                var win = window.open("AlertFoxLoginDialog.html",
                                      "AlertFox Login Dialog", features);
                win.args = {
                    proceed: true,
                    win_id: args.win_id,
                    skipOnlineTest: skipOnlineTest
                };
            }
        }
    });
}

function onAfUpload() {
    if ($("af-upload-button").getAttribute("disabled") == "true")
        return;
    uploadMacro(true);
}

function onOnlineTest() {
    if ($("online-test-button").getAttribute("disabled") == "true")
        return;
    uploadMacro(false);
}
