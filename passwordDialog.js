/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/

function handlePlayerCase() {
    var bg = chrome.extension.getBackgroundPage();
    var pwd = $("password").value;
    try {
        if (args.data) {
            // throws error if password does not match
            args.data.txt = bg.Rijndael.decryptString(args.data.txt, pwd);
            var query_data = {active: true, windowId: args.mplayer.win_id};
            chrome.tabs.query(query_data, function(tabs) {
                bg.communicator.postMessage(
                    "tag-command", args.data, tabs[0].id,
                    function(data) {
                        args.mplayer.onTagComplete(data)
                    },
                    args.mplayer.currentFrame
                );
            });
        } else {
            var cyphertext = args.mplayer.loginData.password;
            args.mplayer.loginData.password = 
                bg.Rijndael.decryptString(cyphertext, pwd);
        }

        bg.Rijndael.tempPassword = pwd;
        // continue replaying
        args.mplayer.waitingForPassword = false;
        args.mplayer.next("passwordDialog");
        window.close();
    } catch (e) {
        console.error(e);
        if (!confirm("Wrong password!\nWould you like to proceed?")) {
            cancel();
            return;
        }
        $("password").focus();
    }
}


function handleRecorderCase() {
    var bg = chrome.extension.getBackgroundPage();
    var pwd = $("password"), cyphertext;
    bg.Rijndael.tempPassword = pwd.value;
    // console.log("handleRecorderCase, password: "+pwd.value);
    cyphertext = bg.Rijndael.encryptString(args.plaintext, pwd.value);
    // console.log("handleRecorderCase, cyphertext: "+cyphertext);
    var cmd = args.cmd.replace(/(content)\s*=\S+\s*$/i, "$1="+cyphertext);
    // console.log("handleRecorderCase, cmd: "+args.cmd);
    args.recorder.recordAction(cmd);
    window.close();
}


function handleLoginDialogCase() {
    var bg = chrome.extension.getBackgroundPage();
    bg.Rijndael.tempPassword = $("password").value;
    args.callback({authCredentials: {username: "_dummy_", password: "none"}})
    window.close();
}

function ok() {
    var bg = chrome.extension.getBackgroundPage();
    var pwd = $("password");
    if (!args.shouldProceed) {
        bg.Rijndael.tempPassword = pwd.value;
        window.close();
        return;
    }
    if (args.type == "recorder") {
        handleRecorderCase();
    } else if (args.type == "player") {
        handlePlayerCase();
    } else if (args.type == "loginDialog") {
        handleLoginDialogCase();
    }
}

function cancel() {
    if (args.shouldProceed) {
        if (args.type == "player") {
            var e = new RuntimeError("Password input has been canceled", 943);
            args.mplayer.handleError(e);
        } else if (args.type == "recorder") {
            // TODO: what should be done here? cancel recording or just write
            // type NO?
        }
    }
    window.close();
}


window.addEventListener("load", function(evt) {
    $("password").focus();
    if (args) {
        // 
    }

    $("more-info-encryption").addEventListener("click", function() {
         link('http://wiki.imacros.net/!ENCRYPTION');
    });
    $("password").addEventListener("keypress", function(e) {
        if (e.which == 13) ok();
    });
    $("ok-button").addEventListener("click", ok);
    $("cancel-button").addEventListener("click", cancel);
    resizeToContent(window, $('container'));
    // prevent right-click
    document.body.oncontextmenu = function(e) {
        e.preventDefault();
        return false;
    };
}, true);
