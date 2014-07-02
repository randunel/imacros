/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


// incapsulates all content scripts-extensions communications
function Communicator() {
    this.handlers = new Object();
    this.addListeners();
}

// add listener for extension events
Communicator.prototype.addListeners = function() {
    // listen to requests from content-scripts
    chrome.extension.onRequest.addListener(
        function(msg, sender, callback) {
            if (!sender.tab)
                return;
            communicator.handleMessage(msg, sender.tab.id, callback);
        }
    );
    
    chrome.windows.onRemoved.addListener(function(win_id) {
        // remove all handlers bind to the window
        for (var topic in communicator.handlers) {
            var len = communicator.handlers[topic].length, i;
            var junk = new Array();
            for (i = 0; i < len; i++) {
                if (communicator.handlers[topic][i].win_id == win_id) {
                    junk.push(communicator.handlers[topic][i].handler);
                }
            }
            for (i = 0; i < junk.length; i++) {
                communicator.unregisterHandler(topic, junk[i]);
            }
        }
    });
};



// register handlers for specific content script messages
Communicator.prototype.registerHandler = function(topic, handler, win_id) {
    if (!(topic in this.handlers))
        this.handlers[topic] = new Array();
    this.handlers[topic].push({handler: handler, win_id: win_id});
};

Communicator.prototype.unregisterHandler = function(topic, handler) {
    if (!(topic in this.handlers))
        return;
    for (var i = 0; i < this.handlers[topic].length; i++) {
        if (this.handlers[topic][i].handler == handler) {
            this.handlers[topic].splice(i, 1);
            break;
        }
    }
};

// handle message from script
Communicator.prototype.handleMessage = function(msg, tab_id, callback) {
    if (msg.topic in this.handlers) {
        chrome.tabs.get(tab_id, function(tab) {
            if (!tab)
                return;
            communicator.handlers[msg.topic].forEach( function(x) {
                if (x.win_id && x.win_id == tab.windowId) {
                    // if win_id is set then call callback only if
                    // it is set for the win_id the message came from
                    x.handler(msg.data, tab_id, callback);
                    // assume we have only one handler per window
                    // and callback is called inside the handler
                    return;
                } else {
                    // browser-wide message handler
                    // currently we have only run-macro topic for
                    // ookmarklet macros
                    x.handler(msg.data, tab_id);
                    if (callback)
                        callback();
                    return;
                }
            });
        });
    } else {
        console.warn("Communicator: unknown topic "+msg.topic);
    }
};


// send message to specific tab
Communicator.prototype.postMessage =
    function(topic, data, tab_id, callback, frame)
{
    chrome.tabs.sendRequest(
        tab_id,
        {topic: topic, data: data, _frame: frame},
        callback
    );
};


// broadcast message
Communicator.prototype.broadcastMessage = function(topic, data, win_id) {
    if (win_id) {
        chrome.tabs.getAllInWindow(win_id, function(tabs) {
            if (!tabs)
                return;
            tabs.forEach( function(tab) {
                chrome.tabs.sendRequest(tab.id, {topic: topic, data: data},
                                        function () {});
            });
        });
    } else {
        chrome.windows.getLastFocused(function (win) {
            win.tabs.forEach( function(tab) {
                chrome.tabs.sendRequest(tab.id, {topic: topic, data: data},
                                        function () {});
            });
        });
    }
};


var communicator = new Communicator();
