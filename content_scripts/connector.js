/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/



function Connector() {
    this.handlers = new Object();
    
    chrome.extension.onRequest.addListener(
        function(msg, sender, callback) {
            connector.handleMessage(msg, callback);
        }
    );
}


Connector.prototype.findFrameNumber = function (win, f, obj) {
    if (win.top == f)         // it is a topmost window
        return 0;
    for (var i = 0; i < win.frames.length; i++) {
        obj.num++;
        if ( win.frames[i] == f) {
            return obj.num;
        }
        var n = this.findFrameNumber(win.frames[i], f, obj);
        if (n != -1)
            return n;
    }
    return -1;
};



Connector.prototype.getFrameData = function() {
    var obj = {
        number: this.findFrameNumber(window.top, window, {num:0}),
        name: ""
    };
    try {
        // query 'name' field
        obj.name = (window.frameElement && window.frameElement.name) ?
            window.frameElement.name: "";
    } catch (e) {
        // in case of domain/protocol mismatch SecurityException is thrown
        // console.error(e);
    }

    return obj;
};


Connector.prototype.thisFrame = function(f) {
    var tf = this.getFrameData();
    return tf.number == f.number || (tf.name.length && tf.name == f.name);
};


// handle incoming messages
Connector.prototype.handleMessage = function(msg, callback) {
    if (msg._frame && !this.thisFrame(msg._frame)) 
        return;
    // console.log("handleMessage, msg=%O for frame %O", 
    //             msg, (msg._frame ? msg._frame : "all"));
    if (msg.topic in this.handlers)
        this.handlers[msg.topic].forEach( function(handler) {
            handler(msg.data, callback);
        });
};


// register handlers for specific messages
// callback's prototype is function(msg)
Connector.prototype.registerHandler = function(topic, handler) {
    if (!(topic in this.handlers))
        this.handlers[topic] = new Array();
    this.handlers[topic].push(handler);
};


// remove specified handler
Connector.prototype.unregisterHandler = function(topic, callback) {
    var i = this.handlers[topic].indexOf(handler);
    if ( i != -1 )
        this.handlers[topic].splice(i, 1);
};



// post message to extension script
Connector.prototype.postMessage = function(topic, data, callback) {
    if (data) {
        data._frame = this.getFrameData();
    } else {
        data = {_frame: this.getFrameData()}
    }

    // console.log("postMessage, topic=%s, data=%O", topic, data);
    if (callback)
        chrome.extension.sendRequest({topic: topic, data: data}, callback);
    else
        chrome.extension.sendRequest({topic: topic, data: data});
};


var connector = new Connector();
