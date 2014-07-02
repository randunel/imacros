/*
(c) Copyright 2010 iOpus Software GmbH - http://www.iopus.com
*/

function cancel() {
    window.close();
}


function choose() {
    var doc = window.frames["tree-iframe"].contentDocument;
    var path = doc.getElementById("path").value;
    if (!path)
        return;
    opener.savePath(args.which, path);
    window.close();
}

window.addEventListener("load", function() {
    $("button-ok").addEventListener("click", choose);
    $("button-cancel").addEventListener("click", cancel);
    resizeToContent(window, $('container'));
    // prevent right-click
    document.body.oncontextmenu = function(e) {
        e.preventDefault();
        return false;
    };
});
