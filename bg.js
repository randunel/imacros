/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


// old bookmarklet pattern

// function makeBookmarklet(name, content) {
//     var pattern = "(function() {"+
//         "try{"+
//         "var m64 = \"{{macro}}\", n = \"{{name}}\";"+
//         "if(!/Chrome\\/\\d+\\.\\d+\\.\\d+\\.\\d+/.test(navigator.userAgent)){"+
//         "alert('iMacros: The embedded macros work with iMacros for Chrome. Support for IE/Firefox is planned.');"+
//         "return;"+
//         "}"+
//         "if(!/^(?:chrome|https?|file)/.test(location)){"+
//         "alert('iMacros: To run a macro, you need to open a website first.');"+
//         "return;"+
//         "}"+
//         "var div = document.getElementById(\"imacros-bookmark-div\");"+
//         "if (!div){"+
//         "alert(\"Can not run macro, no iMacros div found\");"+
//         "return;"+
//         "}"+
//         "var ta = document.getElementById(\"imacros-macro-container\");"+
//         "ta.value = decodeURIComponent(atob(m64));"+
//         "div.setAttribute(\"name\", n);"+
//         "var evt = document.createEvent(\"Event\");"+
//         "evt.initEvent(\"iMacrosRunMacro\", true, true);"+
//         "div.dispatchEvent(evt);"+
//         "}catch(e){alert('Bookmarklet error: '+e.toString());}"+
//         "}) ();";
    
//     var macro_name = name || "Unnamed Macro", source = content;
//     macro_name = imns.escapeLine(macro_name);
//     pattern = pattern.replace("{{name}}", macro_name);
//     source = btoa(encodeURIComponent(source));
//     source = imns.escapeLine(source);
//     pattern = pattern.replace("{{macro}}", source);
    
//     var url = "javascript:" + pattern;

//     return url;
// }


// create bookmarklet of new type 
function makeBookmarklet(name, code) {
    var pattern = "(function() {"+
        "try{"+
        "var e_m64 = \"{{macro}}\", n64 = \"{{name}}\";"+
        "if(!/^(?:chrome|https?|file)/.test(location)){"+
        "alert('iMacros: Open webpage to run a macro.');"+
        "return;"+
        "}"+
        "var macro = {};"+
        "macro.source = decodeURIComponent(atob(e_m64));"+
        "macro.name = decodeURIComponent(atob(n64));"+
        "var evt = document.createEvent(\"CustomEvent\");"+
        "evt.initCustomEvent(\"iMacrosRunMacro\", true, true, macro);"+
        "window.dispatchEvent(evt);"+
        "}catch(e){alert('iMacros Bookmarklet error: '+e.toString());}"+
        "}) ();";
    
    var macro_name = name || "Unnamed Macro", source = code;
    macro_name = btoa(encodeURIComponent(name));
    macro_name = imns.escapeLine(macro_name);
    pattern = pattern.replace("{{name}}", macro_name);
    source = btoa(encodeURIComponent(source));
    source = imns.escapeLine(source);
    pattern = pattern.replace("{{macro}}", source);
    
    var url = "javascript:" + pattern;

    return url;
}


function ensureBookmarkFolderCreated(parent_id, name, callback) {
    chrome.bookmarks.getChildren( parent_id, function (result) {
        var found = false, id = null;

        for(var i = 0; i < result.length; i++) {
            if (result[i].title == name) {
                found = true;
                id = result[i].id;
                break;
            }
        };

        if (!found) {
            chrome.bookmarks.create(
                {
                    parentId: parent_id,
                    title: name
                },
                function (folder) {
                    // setTimeout(function() {callback(folder);}, 10);
                    if (callback)
                        callback(folder);
                }
            );
        } else {
            chrome.bookmarks.get(id, function(result) {
                // setTimeout(function() {callback(result[0]);}, 10);
                if (callback)
                    callback(result[0]);
            });
        }
    });
}


function ensureDirectoryExists(node, callback) {
    node.exists(function(exists, error) {
        if (error) {
            console.error(error);
            return;
        }
        if (!exists) {
            node.parent.exists(function(parent_exists, err) {
                if (err) {
                    console.error(err);
                    return;
                }
                if (parent_exists)
                    afio.makeDirectory(node, callback);
                else
                    ensureDirectoryExists(node.parent, callback);
            });
        } else {
            callback();
        }
    });
}



function createBookmark(folder_id, title, url, bookmark_id, overwrite, callback) {
    if (bookmark_id) {
        chrome.bookmarks.update(
            bookmark_id,
            {url: url, title: title},
            function() {
                if (callback && typeof(callback) == "function")
                    callback();
            }
        );
    } else {
        if (overwrite) {
            console.error("bg.save() - trying to overwrite "+title+
                          " while bokmark_id is not set");
            return;
        }

        // TODO: ask if user wants to overwrite the macro
        // if (confirm())...

        // look for the same name
        // append (\d) to title if macro with title already exists
        chrome.bookmarks.getChildren(folder_id, function (children) {
            var found = false, count = 0, name = title;
            for(;;) {
                for(var i = 0; i < children.length; i++) {
                    if (children[i].title == name && children[i].url) { // found 
                        found = true; count++; break;
                    }
                };
                if (found) {
                    found = false;
                    if (/\.iim$/.test(title)) {
                        name = title.replace(/\.iim$/, "$'("+count+").iim");
                    } else {
                        name = title+"("+count+")";
                    }
                    continue;
                } else {
                    break;
                }
            } 
            chrome.bookmarks.create({
                parentId: folder_id,
                title: name,
                url: url}, function() {
                    if (callback && typeof(callback) == "function")
                            callback();
                });
        });
    }
}


function save_file(save_data, overwrite, callback) {
    var node = afio.openNode(save_data.file_id);
    var update_tree = true;

    if (!/\.iim$/.test(save_data.name))
        save_data.name += ".iim";

    if (node.leafName != save_data.name) {
        node = node.parent;
        node.append(save_data.name);
    }

    node.exists(function(exists, err) {
        if (err) {console.error(err); return;};
        if (exists && !overwrite) {
            var yes = confirm("Are you sure you want to overwrite "+
                              node.path+"?");
            if (!yes)
                return;
        } 
        
        update_tree = !exists;
        

        afio.writeTextFile(node, save_data.source, function (e) {
            if (e) {console.error(e); return;};
            if (callback)
                callback(save_data);
            if (!update_tree)
                return;
            for (var x in context) { // update all panels
                var panel = context[x].panelWindow;
                if (panel && !panel.closed) {
                    var doc = panel.frames["tree-iframe"].contentDocument;
                    doc.defaultView.location.reload();
                }
            }
            
        });
    });
}



function save(save_data, overwrite, callback) {
    // TODO: for file version when file_id is not set "saveAs"
    // saves into file or bookmark
    if (save_data.file_id) {
        save_file(save_data, overwrite, callback);
    } else {
        var url = makeBookmarklet(save_data.name, save_data.source);
        
        chrome.bookmarks.getTree( function (tree) {
            var panelId = tree[0].children[0].id;

            ensureBookmarkFolderCreated(panelId, "iMacros", function(node) {
                var iMacrosDirId = node.id;
                if (overwrite && !save_data.bookmark_id) {
                    // we should check if "name" exists and if it does then
                    // find its bookmark_id
                    chrome.bookmarks.getChildren(iMacrosDirId, function(ar) {
                        for (var i = 0; i < ar.length; i++) {
                            if (ar[i].title == save_data.name) {
                                save_data.bookmark_id = ar[i].id;
                                createBookmark(
                                    iMacrosDirId, save_data.name, url,
                                    save_data.bookmark_id,
                                    overwrite,
                                    function() {
                                        if (callback) callback(save_data);
                                    }
                                );
                                return;
                            }
                        };
                        // no macro was found
                        createBookmark(
                            iMacrosDirId, save_data.name, url,
                            save_data.bookmark_id,
                            false, // so create a new one
                            function() {if (callback) callback(save_data);}
                        );
                    });
                } else {
                    createBookmark(
                        iMacrosDirId, save_data.name, url,
                        save_data.bookmark_id,
                        overwrite,
                        function() {if (callback) callback(save_data);}
                    );
                }
                
            });
        });
    }
}


function edit(macro, overwrite) {
    var features = "titlebar=no,menubar=no,location=no,"+
        "resizable=yes,scrollbars=yes,status=no,"+
        "width=640,height=480";
    // var win = window.open("editor/simple_editor.html",
    //     null, features);
    console.info("Edit macro: %O", macro);
    var win = window.open("editor/editor.html",
        null, features);
    
    win.args = {macro: macro, overwrite: overwrite};
}


function playMacro(macro, win_id) {
    if (context[win_id]) {
        context[win_id].mplayer.play(macro);
    } else {
        console.error("No context for windowId="+win_id);
    }
}

function dockPanel(win_id) {
    var panel = context[win_id].panelWindow;
    if (!panel || panel.closed) {
        clearInterval(context[win_id].dockInterval);
        return;
    }
    if (!Storage.getBool("dock-panel"))
        return;

    chrome.windows.get(win_id, function(w) {
	var new_x = w.left - panel.outerWidth;
	if (new_x < 0)
            new_x = 0;

	var updateInfo = {
            height: w.height,
	    width: Math.round(panel.outerWidth),
            left: new_x,
            top: w.top
	};

	chrome.windows.update(context[win_id].panelId, updateInfo);
    });
}

function openPanel(win_id) {
    chrome.windows.get(win_id, function(win) {
        var panelBox = Storage.getObject("panel-box");
        if (!panelBox) {
            panelBox = new Object();
            panelBox.width = 210;
            if (Storage.getBool("dock-panel"))
                panelBox.height = win.height;
            else
                panelBox.height = 600;
            panelBox.top = win.top;
            panelBox.left = win.left-panelBox.width;
            if (panelBox.left < 0)
                panelBox.left = 0;
        }

        var createData = {
            url: "panel.html", type: "popup",
            top: panelBox.top, left: panelBox.left,
            width: panelBox.width, height: panelBox.height
        };

        chrome.windows.create(createData, function(w) {
            context[win_id].panelId = w.id;
            var v = chrome.extension.getViews(
                {windowId: w.id}
            )[0];
            // set win_id if DOM has already been constructed
            // otherwise it will be set in onPanelLoaded; 
            if (v) {
                v.args = {win_id: win_id};
                context[win_id].panelWindow = v;
            }
            context[win_id].dockInterval = setInterval(function() {
                dockPanel(win.id);
            }, 500);
        });
    });
}

// called from panel
// we use it to find and set win_id for that panel
// NOTE: unfortnunately, it seems there is no more straightforward way
// because on Windows chrome.windows.onCreated is fired too early for
// panel's DOM window be fully constructed
function onPanelLoaded(panel) {
    for (var win_id in context) {
        win_id = parseInt(win_id);
        if (!isNaN(win_id)) {
            // var v = chrome.extension.getViews(
            //     {windowId: context[win_id].panelId}
            // )[0];
            // NOTE: looks like getViews() buggy on Mac OS X
            // and does not return the correct window using
            // specified windowId
            var views = chrome.extension.getViews();
            for(var i = 0; i < views.length; i++) {
                if (views[i] == panel) {
                    context[win_id].panelWindow = panel;
                    return win_id;
                }
            };
        }
    }

    console.error("Can not find windowId for panel %O", panel);
    throw new Error("Can not find windowId for panel!");
}


// browser action button onclick handler
chrome.browserAction.onClicked.addListener(function(tab) {
    var win_id = tab.windowId;
    if (Storage.getBool("show-updated-badge")) {
        doAfterUpdateAction();
        return;
    }
    
    if (!context[win_id]) {
        console.error("No context for window "+win_id);
    }

    var mplayer = context[win_id].mplayer;
    var recorder = context[win_id].recorder;

    if (context[win_id].state == "idle") {
        var panel = context[win_id].panelWindow;
        if (!panel || panel.closed) {
            openPanel(win_id);
        } else {
            panel.close();
            delete context[win_id].panelId;
            delete context[win_id].panelWindow;
        }
    } else if (context[win_id].state == "paused") {
        if (mplayer.paused) {
            mplayer.unpause();
        }
    } else {
        if (mplayer.playing) {
            mplayer.stop();
        } else if (recorder.recording) {
            recorder.stop();
            var recorded_macro = recorder.actions.join("\n");
            var macro = {source: recorded_macro, win_id: win_id,
                         name: "#Current.iim"};
            
            if (Storage.getChar("tree-type") == "files") {
                afio.isInstalled(function(installed) {
                    if (installed) {
                        afio.getDefaultDir("savepath", function(node, e) {
                            if (e) {console.error(e); return;}
                            node.append("#Current.iim");
                            macro.file_id = node.path;
                            edit(macro, /* overwrite */ true);
                        });
                    } else {            // no file access
                        edit(macro, true);
                    }
                });
            } else {
                edit(macro, true);
            }
        }
    }
});


function addSampleMacro(name, parentId, content, callback) {
    // bookmarks
    chrome.bookmarks.getChildren(parentId, function(a) {
        if (name == "Loop-Csv-2-Web.iim") // do not copy that to bookmarklets
            return;
        // we should check if "name" exists
        var found = false;
        for (var i = 0; i < a.length; i++) {
            if (a[i].title == name) {
                // TODO: maybe we should ask user if he or she
                // wants to override that sample macro?
                // now just overwrite it silently
                found = true;
                createBookmark(
                    parentId, name, makeBookmarklet(name, content),
                    a[i].id,
                    true,
                    callback
                );
                return; 
            }
        }
        // no macro was found, create a new one
        createBookmark(
            parentId, name, makeBookmarklet(name, content), null,
            false,
            callback
        );
    });


    // Files
    afio.isInstalled( function(installed) {
        if (!installed)
            return;
        afio.getDefaultDir("savepath", function(node, err) {
            if (err) {console.error(err); return;}
            node.append("Demo-Chrome");
            ensureDirectoryExists(node, function() {
                var macro = node.clone();
                macro.append(name);
                afio.writeTextFile(macro, content, function(e) {
                    if (e) {console.error(e); return;}
                    if (callback && typeof(callback) == "function")
                        callback();
                });
            });
        });
    });
}


function readFileFromSamples(name, callback) {
    var url = chrome.extension.getURL("samples/"+name);
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType("text/plain;charset=utf-8");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (callback) callback(xhr.response, name);
        }
    }
    xhr.onerror = function(e) {
        console.error(e);
    }
    xhr.open('GET', url, true);
    xhr.send(null);
};



function copyProfilerXsl() {
    readFileFromSamples("Profiler.xsl", function(content) {
        afio.getDefaultDir("downpath", function(node, error) {
            if (error) {console.error(error); return;}
            ensureDirectoryExists(node, function(err) {
                if (err) {console.error(err); return;}
                node.append("Profiler.xsl");
                afio.writeTextFile(node, content, function(e) {
                    if (e) {console.error(e); return;}
                });
            });
        })
    });
}

function copyAddressCsv() {
    readFileFromSamples("Address.csv", function(content) {
        afio.getDefaultDir("datapath", function(node, err) {
            ensureDirectoryExists(node, function() {
                node.append("Address.csv");
                afio.writeTextFile(node, content, function(e) {
                    if (e) console.error(e);
                });
            });
        })
    });
}


function copySampleMacros() {
    var names = [
        "ArchivePage.iim",
        "Eval.iim",
        "Extract.iim",
        "ExtractAndFill.iim",
        "ExtractRelative.iim",
        "ExtractTable.iim",
        "ExtractURL.iim",
        "FillForm-XPath.iim",
        "FillForm.iim",
        "Frame.iim",
        "Loop-Csv-2-Web.iim",
        "Open6Tabs.iim",
        "SaveAs.iim",
        "SlideShow.iim",
        "Stopwatch.iim",
        "TagPosition.iim"
    ];

    chrome.bookmarks.getTree( function (tree) {
        var panelId = tree[0].children[0].id;
        ensureBookmarkFolderCreated(panelId, "iMacros", function(im) {
            ensureBookmarkFolderCreated(im.id, "Demo-Chrome", function(node) {
                for (var i = 0; i < names.length; i++) {
                    readFileFromSamples(names[i], function(content, nam) {
                        addSampleMacro(nam, node.id, content, function() {});
                    });
                }
            });
        });
    });
}


// function onJsRequest(details) {
//     console.log("onJsRequest %O", details);
// }


// regexp to update bookmarked macros to newer version (e_m64)
var im_strre = "(?:[^\"\\\\]|\\\\[0btnvfr\"\'\\\\])+";
var bm_update_re = new RegExp('^javascript\\:\\(function\\(\\) '+
                              '\\{try\\{var ((?:e_)?m(?:64)?) = "('+im_strre+')"'+
                              ', (n(?:64)?) = "('+im_strre+')";'+
                             '.+;evt\.initEvent');
// recursive function which walks through bookmarks tree
function updateBookmarksTree(tree) {
    if (!tree)
        return;
        
    tree.forEach(function(x) {
        if (x.url) {
            var match = bm_update_re.exec(x.url);
            if (match) {
                var source, name;
                switch(match[1]) {
                case "m":
                    source = decodeURIComponent(imns.unwrap(match[2]));
                    break;
                case "m64": case "e_m64":
                    source = decodeURIComponent(atob(match[2]));
                    break;
                }
                if (match[3] == "n") {
                    name = decodeURIComponent(match[4]);
                } else if (match[3] == "n64") {
                    name = decodeURIComponent(atob(match[4]));
                }
                chrome.bookmarks.update(
                    x.id, {url: makeBookmarklet(name, source)}
                );
            }
        } else {
            updateBookmarksTree(x.children);
        }
    });
}


function doAfterUpdateAction() {
    Storage.setBool("show-updated-badge", false);
    chrome.windows.getAll({populate: false}, function(ws) {
        ws.forEach(function(win) {
            badge.clearText(win.id);
        });
    });
    // open update page
    link("http://www.iopus.com/imacros/home/cr/quicktour/");
    var yes = confirm("Do you want to install the latest versions of the demo macros (Old sample macros will be overwritten)?");
    if (!yes)
        return;
    // update bookmarked macros for newer version if any
    chrome.bookmarks.getTree( function (tree) {
        updateBookmarksTree(tree);
    });
    copySampleMacros();
    afio.isInstalled(function(installed) {
        if (installed) {
            copyProfilerXsl();
            copyAddressCsv();
        }
    });
}

function onUpdate() {
    Storage.setBool("show-updated-badge", true);
    chrome.windows.getAll({populate: false}, function(ws) {
        ws.forEach(function(win) {
            badge.setText(win.id, "New");
        });
    });
}

window.addEventListener("load", function (event) {
    // initialize context
    chrome.windows.getLastFocused(function (w) {
        context.init(w.id);
    });

    // listen to javascript:// urls to catch our bookmarklets
    // chrome.webRequest.onBeforeRequest.addListener(
    //     onJsRequest,
    //     {urls: ["<all_urls>"]} //,
    //     // ["blocking"]
    // );

    // chrome.webNavigation.onCommitted.addListener(onJsRequest);
        
    // listen to run-macro command from content script 
    communicator.registerHandler("run-macro", function (data, tab_id) {
        chrome.tabs.get(tab_id, function(t) {
            var w_id = t.windowId;
            if (!context[w_id]) {
                console.error("No context for window "+w_id);
                return;
            }
            if (Storage.getBool("before-play-dialog")) {
                var features = "titlebar=no,menubar=no,location=no,"+
                    "resizable=yes,scrollbars=yes,status=no,"+
                    "width=400, height=140";
                var win = window.open("beforePlay.html", null, features);
                win.args = data;
                win.args.win_id = w_id;
            } else {
                setTimeout(function () {
                    context[w_id].mplayer.play(data);
                }, 0);
            }
        });
    });
    
    // check if it is the first run
    if (!Storage.getBool("already-installed")) {
        // make initial settings
        Storage.setBool("already-installed", true);
        Storage.setBool("before-play-dialog", true);
        Storage.setBool("dock-panel", true);
        Storage.setBool("default-dirs-set", false);
        // get version number
        var xhr = new XMLHttpRequest();
        xhr.onload = function(event) {
            var version = JSON.parse(event.target.response).version;
            Storage.setChar("version", version);
        };
        xhr.open("GET", chrome.extension.getURL("manifest.json"));
        xhr.send(null);
        copySampleMacros();
        afio.isInstalled(function(installed) {
            if (installed) {
                copyProfilerXsl();
                copyAddressCsv();
            }
        });
        // open welcome page
        chrome.tabs.create({
            url: "http://www.iopus.com/imacros/home/cr/welcome.htm"
        }, function() {});
    } else {
        // get version number
        var xhr = new XMLHttpRequest();
        xhr.onload = function(event) {
            var version = JSON.parse(event.target.response).version;
            // check if macro was updated
            if (version != Storage.getChar("version")) {
                Storage.setChar("version", version);
                onUpdate();
            }
        };
        xhr.open("GET", chrome.extension.getURL("manifest.json"));
        xhr.send(null);
    }

    // set default directories
    if (!Storage.getBool("default-dirs-set")) {
        afio.isInstalled(function(installed) {
            if (!installed)
                return;
            var dirs = ["datapath", "savepath", "downpath", "logpath"];
            dirs.forEach (function(d) {
                afio.getDefaultDir(d, function(node, err) {
                    if (err) {console.error(err); return;}
                    if (!Storage.isSet("def"+d)) {
                        Storage.setChar("def"+d, node.path);
                    }
                    ensureDirectoryExists(node, function(e) {
                        if (e) console.error(e);
                    }) ;
                });
            });
            copySampleMacros();
            copyProfilerXsl();
            copyAddressCsv();
            Storage.setBool("default-dirs-set", true);
        });
    }
    
    // TODO: check somehow if we need to start SI server
    // if (start_SI_server)
    nm_connector.startServer();

    // listen to restart-server command from content script
    // (fires after t.html?pipe=<pipe> page is loaded)
    chrome.extension.onRequest.addListener(
        function (req, sender, sendResponse) {
            // clean up request
            if (req.command == "restart-server") {
                // TODO: avoid possible double-restart somehow
                sendResponse({status: "OK"});
                if (nm_connector.currentPipe != req.pipe) {
                    nm_connector.stopServer();
                    console.info("Restarting server, pipe="+req.pipe);
                    nm_connector.startServer(req.pipe);
                    nm_connector.currentPipe = req.pipe;
                }
            }
        }
    );
    
}, true);


function addTab(url, win_id) {
    var args = {url: url};
    if (win_id)
        args.windowId = parseInt(win_id);
    
    chrome.tabs.create(args, function (tab) {});
}


function showInfo(args) {
    var win_id = args.win_id;
    context[win_id].info_args = args;
    var panel = context[win_id].panelWindow;
    if (panel && !panel.closed) {
        panel.showInfo(args);
    } else {
        // var notification = webkitNotifications.
        //     createHTMLNotification("errorDialog.html?win_id="+win_id);
        // notification.show();
        // setTimeout(function() {
        //     notification.cancel();
        // }, 5000);       // remove it after 5s

        // since createHTMLNotification is not supported anymore we have to
        // use chrome.notifications API to have something more than plain
        // text messages
        var opt = {
            type: "basic",
            title: (args.errorCode == 1 ? "iMacros" : "iMacros Error"),
            message: args.message,
            iconUrl: "skin/logo48.png",
            isClickable: true

            // NOTE: buttons looks really weird so they commented out
            // , buttons: [
            //     {title: "Edit", iconUrl: "skin/edit.png"},
            //     {title: "Help", iconUrl: "skin/help.png"}
            // ]
        };
        chrome.notifications.create(win_id.toString(), opt, function(n_id) {
            // not much to do here
        });

        chrome.notifications.onClicked.addListener(function(n_id) {
            var w_id = parseInt(n_id);
            if (isNaN(w_id) || !context[w_id] || !context[w_id].info_args)
                return;
            var info = context[w_id].info_args;
            if (info.errorCode == 1) 
                return;    // we have plain Info message; nothing to do

            // for error messages since we have only one 'button'
            // we most probably want look at macro code,
            edit(info.macro, true);
        });
    }
}


window.addEventListener("unload", function(event) {
    nm_connector.stopServer();
});

// remove panel when its parent window is closed
chrome.windows.onRemoved.addListener(function(win_id) {
    if (!context[win_id])
        return;
    var panel = context[win_id].panelWindow;
    if (panel && !panel.closed) {
        panel.close();
    }
});


