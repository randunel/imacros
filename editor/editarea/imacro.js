
window.addEventListener("load", function() {
    var bypass = document.getElementById("bypass");
    bypass.addEventListener("iMacrosEditorInitEvent",
                             initEditArea, true);
    bypass.addEventListener("iMacrosEditorLoadCompleteEvent",
                             onLoadComplete, true);
    bypass.addEventListener("iMacrosEditorGetContentEvent",
                             onGetContent, true);
    bypass.addEventListener("iMacrosEditorGetSelection",
                             onGetSelection, true);
    bypass.addEventListener("iMacrosEditorSetSelection",
                             onSetSelection, true);
    bypass.setAttribute("inited", "true");    
});


function initEditArea() {
    var bypass = document.getElementById("bypass");

    if (!bypass.hasAttribute("lang") || !bypass.hasAttribute("syntax")) {
        alert("Can not initiate iMacros Editor");
        return;
    }
    
    var config = {
        id: "textarea",
        syntax: bypass.getAttribute("syntax"),
        start_highlight: true,
        allow_toggle: false,
        toolbar: "save, |, undo, redo, |, search, |, select_font, syntax_selection",
        syntax_selection_allow: "imacro",
        language: bypass.getAttribute("lang"),
        allow_resize: "no",
        // load_callback: "onLoadFile",
        save_callback: "onSaveFile"
    };
    editAreaLoader.init(config);
}
    

function onSaveFile(id, content) {
    var bypass = document.getElementById("bypass");
    var evt = document.createEvent("Events");
    evt.initEvent("iMacrosEditorSaveEvent", true, false);
    bypass.setAttribute("content", content);
    bypass.dispatchEvent(evt);
}


function onLoadFile(id) {
    var bypass = document.getElementById("bypass");
    var evt = document.createEvent("Events");
    evt.initEvent("iMacrosEditorLoadEvent", true, false);
    bypass.dispatchEvent(evt);
}


function onLoadComplete() {
    var bypass = document.getElementById("bypass");
    var content = bypass.getAttribute("content");
    editAreaLoader.setValue("textarea", content);
    editAreaLoader.execCommand("textarea",
              "change_syntax", bypass.getAttribute("syntax"));
}

function onGetContent() {
    var bypass = document.getElementById("bypass");
    bypass.setAttribute("content",
          editAreaLoader.getValue("textarea"));
}

function onGetSelection() {
    var bypass = document.getElementById("bypass");
    bypass.setAttribute("selection",
                        editAreaLoader.getSelectedText("textarea"));
}

function onSetSelection() {
    var bypass = document.getElementById("bypass");
    var selection = bypass.getAttribute("selection");
    editAreaLoader.setSelectedText("textarea", selection);
}
