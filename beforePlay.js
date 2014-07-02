/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


function play() {
    var m = {
        source: args.source,
        name: args.name,
        bookmark_id: args.bookmark_id
    };
    var win_id = args.win_id;
    var showAgain = $("checkbox").checked;
    setTimeout( function () {
        window.opener.playMacro(m, win_id);
        opener.Storage.setBool("before-play-dialog", showAgain);
    }, 0);
    window.close();
}

function cancel() {
    opener.Storage.setBool("before-play-dialog", $("checkbox").checked);
    window.close();
}

function edit() {
    var m = {
        source: args.source,
        name: args.name,
        bookmark_id: args.bookmark_id
    };
    setTimeout(function () {window.opener.edit(m);}, 0);
    opener.Storage.setBool("before-play-dialog", $("checkbox").checked);
    window.close();
}

window.addEventListener("load", function(evt) {
    if (args) {
        var x = $("message").innerHTML;
        x = x.replace(/{{macroname}}/, args.name);
        $("message").innerHTML = x;
    }
    $("play-button").focus();
    $("checkbox").checked = opener.Storage.getBool("before-play-dialog");
    
    // add DOM event handlers
    $("play-button").addEventListener("click", play);
    $("edit-button").addEventListener("click", edit);
    $("cancel-button").addEventListener("click", cancel);

    resizeToContent(window, $('container'));
    // prevent right-click
    document.body.oncontextmenu = function(e) {
        e.preventDefault();
        return false;
    };
}, true);
