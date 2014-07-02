/*
(c) Copyright 2011 iOpus Software GmbH - http://www.iopus.com
*/


window.addEventListener("load", function() {
    var mc = $("main-container");
    var rc = mc.getBoundingClientRect();
    window.resizeTo(rc.width+30, rc.height+30);
    window.moveTo(window.opener.screenX+window.opener.outerWidth/2-100,
                  window.opener.screenY+window.opener.outerHeight/2-100);
    var macro_name = $("macro-name");
    macro_name.value = args.save_data.name || "Unnamed Macro";
    macro_name.select();
    macro_name.focus();
    macro_name.addEventListener("keypress", function(e) {
        if (e.which == 13) ok();
    });
    
    var file_type = !!args.save_data.file_id;
    if (file_type) {
        $("radio-files-tree").checked="yes";
    } else {
        $("radio-bookmarks-tree").checked="yes";
    }

    // add event listeners for buttons
    $("ok-button").addEventListener("click", ok);
    $("cancel-button").addEventListener("click", cancel);
    
    resizeToContent(window, $('main-container'));
    // TODO: add directory option
});


function ok() {
    var macro_name = $("macro-name");
    args.save_data.name = macro_name.value;

    var overwrite = false;

    if (!/\.iim$/.test(args.save_data.name)) // append .iim extension
        args.save_data.name += ".iim";

    var bg = chrome.extension.getBackgroundPage();
    if (!$("radio-files-tree").checked) {
        // save macro as bookmark
        if (args.save_data.file_id)
            args.save_data.file_id = "";
        bg.save(args.save_data, overwrite);
        window.opener.Editor.originalSource = args.save_data.source;
        window.opener.timedClose();
        window.close();
        return;
    }

    // otherwise save macro as a file
    args.save_data.bookmark_id = "";
    afio.isInstalled(function(installed) {
        if (!installed) {
            alert("Please install file support for iMacros "+
                  "to save macro as a file");
            return;
        }
        afio.getDefaultDir("savepath", function(node, err) {
            if (!args.save_data.file_id) {
                node.append(args.save_data.name);
                args.save_data.file_id = node.path;
            } else {
                node = afio.openNode(args.save_data.file_id);
                node = node.parent;
                node.append(args.save_data.name);
                args.save_data.file_id = node.path;
            }
            node.exists(function(exists, e) {
                if (e) {console.error(e); return;}
                if (exists) {
                    overwrite = confirm("Macro "+node.leafName+
                                        " already exists.\n"+
                                        "Do you want to overwrite it?");
                    if (!overwrite)
                        return;
                }
                bg.save(args.save_data, overwrite);
                window.opener.Editor.originalSource = args.save_data.source;
                window.opener.timedClose();
                window.close();
            });
        });
        
    });
}


function cancel() {
    window.close();
}
