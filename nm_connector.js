/*
(c) Copyright 2014 iOpus Software GmbH - http://www.iopus.com
*/


var nm_connector = {

    onInit: function(clientId, args) {
        if (clientId in this.clients) {
            this.sendResponse(clientId,
                              "Can not create new instance. Error: "+
                              "already inited (maybe two iimInit() calls?",
                              -20);
            return;
        }
        
        var cl_save = function(cli_id, win_id) {
            nm_connector.clients[cli_id] = new Object();
            nm_connector.clients[cli_id].win_id = win_id;
            nm_connector.sendResponse(cli_id, "OK", 1);
        };

        if (args.openNewBrowser) {
            if (args.launched) {
                // reuse the current window
                chrome.windows.getCurrent(function(win) {
                    cl_save(clientId, win.id);
                });
            } else {
                // open new
                chrome.windows.create(
                    {url: "about:blank"},
                    function(win) {
                        cl_save(clientId, win.id);     
                    }
                );
            }
        } else {            // reuse any of the "free" existing window
            chrome.windows.getAll(null, function(windows) {
                var i, j, saved = false;
                for (i = 0; i < windows.length; i++) {
                    var win = windows[i], found = false;
                    for (j in nm_connector.clients) {
                        if (nm_connector.clients[j].win_id == win.id) {
                            found = true; break;
                        }
                    }
                    if (!found) { // if win.id is not among windows in use
                        cl_save(clientId, win.id);
                        saved = true; break;
                    }
                }
                if (!saved) {   // if all the windows are in use
                    // then create new window
                    chrome.windows.create({url: "about:blank"}, function(win) {
                        cl_save(clientId, win.id);
                    });
                }
            });
        }
    },


    onCapture: function(clientId, args) {
        var win_id = nm_connector.clients[clientId].win_id;
        var type;
        if (/^.*\.(\w+)$/.test(args.path)) {
            if (RegExp.$1 == "jpg") {
                type = "jpeg";
            } else if (RegExp.$1 == "png") {
                type = "png";
            } else {
                nm_connector.sendResponse(clientId,
                                          "Unsupported type "+RegExp.$1, -1);
                return;
            }
        } else {
            // if no file extension is set than assume "png"
            type = "png";
            args.path += ".png";
        }

        afio.isInstalled(function(installed) {
            if (!installed) {
                nm_connector.sendResponse(
                    clientId,
                    "Can not instantiate file IO plugin", -1
                );
                return;
            }
            var f = null;
            if (__is_full_path(args.path)) {
                f = afio.openNode(args.path);
            } else {
                 // do not allow references to upper directories
                args.path = args.path.replace("..", "_");
                f = afio.openNode(localStorage["defdownpath"]);
                f.append(args.path);
            }
            chrome.tabs.captureVisibleTab(
                nm_connector.win_id, {format: type},
                function(data) {
                    var re = /data\:([\w-]+\/[\w-]+)?(?:;(base64))?,(.+)/;
                    var m = re.exec(data);
                    var imageData = {
                        image: m[3],
                        encoding: m[2],
                        mimeType: m[1]
                    };
                    afio.writeImageToFile(f, imageData, function(err) {
                        if (err) {
                            nm_connector.sendResponse(
                                clientId,
                                "Could not write to "+f.path, -2
                            );

                        } else {
                            nm_connector.sendResponse(clientId, "OK", 1);
                        }
                    });
                }
            );
            
        });
        
    },


    onPlay: function(clientId, args) {
        var x, win_id = this.clients[clientId].win_id;

        for (x in args.vars) { // save user vars if any
            context[win_id].mplayer.setUserVar(x, args.vars[x]);
        }

        if (args.use_profiler) {
            context[win_id].mplayer.profiler.si_enabled = true;
        }
        
        if (/^CODE:((?:\n|.)+)$/.test(args.source)) { // if macro is embedded
            var val = RegExp.$1;
            val = val.replace(/\[sp\]/ig, ' ');
            val = val.replace(/\[br\]/ig, '\n');
            val = val.replace(/\[lf\]/ig, '\r');
            //play macro
            context[win_id].mplayer.play(
                {
                    name: "__noname__.iim",
                    file_id: "",
                    source: val,
                    client_id: clientId
                }
            );
            return;
        }

        // try to load macro from file otherwise
        var name = args.source;
        if (!/(?:\.iim)$/i.test(name))
            name += ".iim";

        var file;
        if (__is_full_path(name)) {
            // full path is given
            file = afio.openNode(name);
        } else  {
            file = afio.openNode(localStorage["defsavepath"]);
            var nodes = name.split(__psep()).reverse();
            while (nodes.length)
                file.append(nodes.pop());
        }

        file.exists(function(exists, err) {
            if (err) {
                nm_connector.sendResponse(
                    clientId, "Can not open macro, error "+err.message, -931);
                return;
            }
            if (!exists) {
                nm_connector.sendResponse(
                    clientId, "Can not open macro "+name, -931);
                return;
            }

            afio.readTextFile(file, function(val, e) {
                if (e) {
                    nm_connector.sendResponse(
                        clientId, "Can not read macro, error "+e.message, -931);
                    return;
                }
                context[win_id].mplayer.play(
                    {
                        name: file.leafName,
                        file_id: file.path,
                        source: val,
                        client_id: clientId
                    }
                );
            });
        });
        
    },


    handleCommand: function(clientId, cmd) {
        try {
            // console.debug("handleCommand %s for clientId %d", cmd, clientId);
            var request = JSON.parse(cmd);
        } catch(e) {
            console.error(e);
            // should never happen
            this.sendResponse(clientId,
                              "Can not parse request \""+cmd+"\"", -1);
            return;
        }

        switch (request.type) {
        case "init":
            this.onInit(clientId, request.args);
            break;

        case "play":
            this.onPlay(clientId, request.args);
            break;

        case "exit":
            var win_id = this.clients[clientId].win_id;
            chrome.windows.getAll(null, function(windows) {
                if (windows.length == 1) {
                    // TODO: there should be a way to find out the pid
                    // There is chrome.procesess in the Chrome dev branch
                    // but it is not known when it moves to stable,
                    // so we try a workaround for now
                    var pid = -1;
                    nm_connector.sendResponse(clientId, "OK", 1,
                                             {waitForProcessId: pid});
                } else {
                    nm_connector.sendResponse(clientId, "OK", 1);
                }

                chrome.windows.remove(win_id, function() {
                    delete nm_connector.clients[clientId];
                });
            });

            break;

        case "show":
            var win_id = this.clients[clientId].win_id;
            var args = {
                message: request.args.message,
                errorCode: 1,
                win_id: win_id,
                macro: null
            };

            showInfo(args);
            this.sendResponse(clientId, "OK", 1);

            break;

        case "capture":
            this.onCapture(clientId, request.args);
            break;
        case "error":
            console.error("Got error from iMacros host: "+request.message);
            break;

        case "info":
            console.info("Got message from iMacros host: "+request.message);
            break;
        }
    },

    
    startServer: function(args) {
        const si_host = "com.iopus.imacros.host";
        this.clients = new Object();
        this.port = chrome.runtime.connectNative(si_host);
        this.port.onMessage.addListener(function(msg) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                setTimeout(function() {
                    nm_connector.handleCommand(msg.clientId, msg.request);
                }, 0);
            }
        });
        var init_msg = {type: 'init'};
        if (args)
            init_msg.ac_pipe = args;
        this.port.postMessage(init_msg);
    },

    stopServer: function() {
        if (this.port)
            this.port.disconnect();
    },


    sendResponse: function(clientId, message, errorCode, extra) {
        if (errorCode < 0 && !/error/i.test(message)) {
            message = "Error: "+message;
        }
        message += " ("+errorCode+")";
        
        var result = {
            status: message,
            errorCode: errorCode
        };

        if (extra) {
            if (extra.extractData) 
                result.extractData = extra.extractData.split("[EXTRACT]");
            if (extra.lastPerformance)
                result.lastPerformance = extra.lastPerformance;
            if (extra.waitForProcessId) 
                result.waitForProcessId = extra.waitForProcessId;
            if (extra.profilerData)
                result.profilerData = extra.profilerData;
        }

        // console.debug("Sending response %s for clientId %d",
        //               JSON.stringify(result), clientId);
        this.port.postMessage({type: "command_result",
                               clientId: clientId,
                               result: JSON.stringify(result)});
    }
};
