/*
(c) Copyright 2012 iOpus Software GmbH - http://www.iopus.com
*/

function ok() {
    var bg = chrome.extension.getBackgroundPage();

    var user = $("username").value;
    var pwd = $("password").value;

    var response = {
        authCredentials: {
            username: $("username").value,
            password: $("password").value
        }
    };
    if (args.cypherData.encrypt) {
        pwd = bg.Rijndael.encryptString(pwd, args.cypherData.key);
    }

    var rec = "ONLOGIN USER="+user+" PASSWORD="+pwd;
    // remove previously recorded ONLOGIN command
    var l = args.recorder.actions.length;
    var match_part = "ONLOGIN USER=";
    if (l && args.recorder.actions[l-1].indexOf(match_part) == 0) {
        args.recorder.actions.pop();
        var panel = bg.context[args.recorder.win_id].panelWindow; 
        if (panel && !panel.closed) {
            panel.removeLastLine();
        }
    }
    args.recorder.recordAction(rec);
    args.callback(response);
    window.close();
}


function cancel() {
    args.callback({cancel: true})
    window.close();
}

window.addEventListener("load", function(evt) {
    var message = args.details.challenger.host+":"+
        args.details.challenger.port+" requires authentication.";
    if (args.details.realm)
        message += " Server message: "+args.details.realm;
    $("message").innerText = message;
    // window.moveTo(window.opener.screenX+window.opener.outerWidth/2-170,
    //               window.opener.screenY+window.opener.outerHeight/2-100);
    $("username").addEventListener("keypress", function(e) {
        if (e.which == 13) ok();
    });
    $("password").addEventListener("keypress", function(e) {
        if (e.which == 13) ok();
    });
    $("ok-button").addEventListener("click", ok);
    $("cancel-button").addEventListener("click", cancel);
    resizeToContent(window, $('container'));
});
