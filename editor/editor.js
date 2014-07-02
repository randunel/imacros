/*
(c) Copyright 2006 iOpus Software GmbH - http://www.iopus.com
*/



//script for Integrated editor


var Editor = {
    init: function (file) {
        var doc = window.frames["editbox"].contentDocument;
        var bypass = doc.getElementById("bypass");
        if (!bypass || !bypass.hasAttribute("inited")) {
            setTimeout(function () { Editor.init(file); }, 100);
            return;
        }
        bypass.setAttribute("lang", "en");
        bypass.setAttribute("syntax", file.type || "imacro");
        var evt = doc.createEvent("Events");
        evt.initEvent("iMacrosEditorInitEvent", true, false);
        bypass.dispatchEvent(evt);

        if (file) {
            this.completeLoad(file);
        } 

        this.attachListeners();
    },

    completeLoad: function (file) {
        var doc = window.frames["editbox"].contentDocument;
        // send notification to EditArea
        var bypass = doc.getElementById("bypass");
        bypass.setAttribute("filename", file.name || "");
        bypass.setAttribute("bookmark_id", file.bookmark_id || "");
        bypass.setAttribute("file_id", file.file_id || "");
        bypass.setAttribute("content", file.source);
        bypass.setAttribute("syntax", file.type || "imacro");
        var evt = doc.createEvent("Events");
        evt.initEvent("iMacrosEditorLoadCompleteEvent", true, false);
        bypass.dispatchEvent(evt);
        // set title
        document.title = file.name+" - iMacros Editor";
        // save original source
        this.originalSource = file.source;
        this.win_id = file.win_id;
    },

    attachListeners: function () {
        document.addEventListener("iMacrosEditorSaveEvent",
                                  function(e) { Editor.listen(e); },
                                  false);
        document.addEventListener("iMacrosEditorLoadEvent",
                                  function(e) { Editor.listen(e); },
                                  false);
    },


    saveFile: function () {
        var bg = chrome.extension.getBackgroundPage();
        var r = this.getEditAreaData();
        if (!r.name) {
            r.name = prompt("Enter macro name:", "Unnamed Macro");
        }

        if (!r.name)
            return false;
        var save_data = {
            name: r.name,
            source: r.source,
            bookmark_id: r.bookmark_id,
            file_id: r.file_id,
            type: r.syntax,
            win_id: this.win_id
        };

        bg.save(save_data, /* overwrite = */ true); 
        this.originalSource = r.source;

        return true;
    },

    saveFileAs: function () {
        var features = "titlebar=no,menubar=no,location=no,"+
            "resizable=yes,scrollbars=no,status=no";

        var r = this.getEditAreaData();
        
        var save_data = {
            name: r.name,
            source: r.source,
            bookmark_id: "",
            file_id: r.file_id,
            type: r.syntax,
            win_id: this.win_id
        };

        var win = window.open("saveAsDialog.html",
                              null, features);
        
        win.args = {save_data: save_data};
        
        return true;
    },


    getEditAreaData: function () {
        var doc = window.frames["editbox"].contentDocument;
        // send notification to EditArea
        var bypass = doc.getElementById("bypass");
        var evt = doc.createEvent("Events");
        evt.initEvent("iMacrosEditorGetContentEvent", true, false);
        bypass.dispatchEvent(evt);
        var source = bypass.getAttribute("content");
        var name = bypass.getAttribute("filename");
        var bookmark_id = bypass.getAttribute("bookmark_id");
        var file_id = bypass.getAttribute("file_id");
        var syntax = bypass.getAttribute("syntax");

        return {source: source,
                name: name,
                bookmark_id: bookmark_id,
                file_id: file_id,
                syntax: syntax};
    },
    
    checkFileChanged: function () {
        var r = this.getEditAreaData();
        return this.originalSource != r.source;
    },


    checkPermissions: function(file) {
        // TODO: check if this is required
        return true;
    },


    loadFile: function () {
        console.log("loadFile, TODO: add real code here");
    },
    
    getSelection: function () {
        var doc = window.frames["editbox"].contentDocument;
        // send notification to EditArea
        var bypass = doc.getElementById("bypass");
        var evt = doc.createEvent("Events");
        evt.initEvent("iMacrosEditorGetSelection", true, false);
        bypass.dispatchEvent(evt);
        var selection = bypass.getAttribute("selection");
        return selection;
    },


    setSelection: function (text) {
        var doc = window.frames["editbox"].contentDocument;
        // send notification to EditArea
        var bypass = doc.getElementById("bypass");
        var evt = doc.createEvent("Events");
        evt.initEvent("iMacrosEditorSetSelection", true, false);
        bypass.setAttribute("selection", text);
        bypass.dispatchEvent(evt);
    },

    // context menu handler

    onContextShowing: function() {
        // TODO: add right-click menu
    },

    listen: function(evt) {
        if (evt.type == "iMacrosEditorSaveEvent") {
            var content = evt.target.getAttribute("content");
            this.saveFileAs(evt);
        } else if (evt.type == "iMacrosEditorLoadEvent") {
            this.loadFile(evt);
        }
    }
};


function cancel() {
    window.close();
}

function saveAndQuit() {
    if (Editor.saveFile())
        window.close();         
}


function timedClose() {
    setTimeout(function() { window.close(); }, 100);
}

function saveAsAndQuit() {
    Editor.saveFileAs();
}


window.addEventListener("load", function() {
    if (!args.overwrite)
        $("save-button").style.display = "none";
    Editor.init(args.macro);
    $("save-button").addEventListener("click", saveAndQuit);
    $("saveas-button").addEventListener("click", saveAsAndQuit);
    $("cancel-button").addEventListener("click", cancel);
});


window.addEventListener("beforeunload", function() {
    if (Editor.checkFileChanged()) {
        var msg = "File content was changed. Would you like to save changes?";
        if (window.confirm(msg))
            Editor.saveFile();
    }
    return null;
});
