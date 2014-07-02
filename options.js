/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/



function on_BP_change() {
    var bpbox = $("show-before-play-dialog");
    Storage.setBool("before-play-dialog", bpbox.checked);
}


function onPasswordChange() {
    var pwd = $("stored-password").value;
    pwd = btoa(encodeURIComponent(pwd));
    Storage.setChar("stored-password", pwd);
    $("stored-password").blur();
}

function setSecurityLevel() {
    if (!Storage.isSet("encryption-type"))
        Storage.setChar("encryption-type", "no");
    var type = Storage.getChar("encryption-type");
    if (!/^(?:no|stored|tmpkey)$/.test(type))
        type = "no";
    $("stored-password").value = Storage.getChar("stored-password");
    if ($("stored-password").value) {
        $("stored-password").value =
            decodeURIComponent(atob($("stored-password").value));
    }
    switch(type) {
    case "no":
        $("type_no").click();
        $("stored-password").disabled = true;
        break;
    case "stored":
        $("type_stored").click();
        $("stored-password").disabled = null;
        break;
    case "tmpkey":
        $("type_tmpkey").click();
        $("stored-password").disabled = true;
        break;
    }
}

function onSecurityChage(e) {
    var type = e.target.id.substring(5);
    switch(type) {
    case "no":
        $("stored-password").disabled = true;
        break;
    case "stored":
        $("stored-password").disabled = null;
        $("stored-password").focus();
        $("stored-password").select();
        break;
    case "tmpkey":
        $("stored-password").disabled = true;
        break;
    }
    Storage.setChar("encryption-type", type);
}


function enterTempKey() {
    var features = "titlebar=no,menubar=no,location=no,"+
        "resizable=yes,scrollbars=no,status=no,"+
        "height=170,width=350";
    var win = window.open("passwordDialog.html",
                          "iMacros Password Dialog", features);
    win.args = {
        shouldProceed: false    // no need to execute next action
    };
    $("stored-password").disabled = true;
    Storage.setChar("encryption-type", "tmpkey");
    $('type_tmpkey').checked = true;
}


function onPathChange(which) {
    Storage.setChar(which, $(which).value);
}


function choosePath(which) {
    var features = "titlebar=no,menubar=no,location=no,"+
        "resizable=yes,scrollbars=no,status=no,"+
        "width=200,height=300";
    var win = window.open("browse.html", "iMacros_browse_dialog", features);
    
    win.args = {path: Storage.getChar(which), which: which};
}

function savePath(which, path) {
    Storage.setChar(which, path);
    $(which).value = path;
}


function onDockPanel() {
    var dockbox = $("dock-panel");
    Storage.setBool("dock-panel", dockbox.checked);
}


function onEnableProfiler() {
    var box = $("enable-profiler");
    Storage.setBool("profiler-enabled", box.checked);
}


function onAFLoginButton() {
    var features = "titlebar=no,menubar=no,location=no,"+
        "resizable=yes,scrollbars=no,status=no,"+
        "height=250,width=380";
    var win = window.open("AlertFoxLoginDialog.html",
                          "AlertFox Login Dialog", features);

}

window.addEventListener("load", function () {
    var bpbox = $("show-before-play-dialog");
    bpbox.checked = Storage.getBool("before-play-dialog");
    var dockbox = $("dock-panel");
    dockbox.checked = Storage.getBool("dock-panel");
    setSecurityLevel();
    // paths
    $("defsavepath").value = Storage.getChar("defsavepath");
    $("defdatapath").value = Storage.getChar("defdatapath");
    $("defdownpath").value = Storage.getChar("defdownpath");
    // $("deflogpath").value = Storage.getChar("deflogpath");

    // profiler
    $("enable-profiler").checked = Storage.getBool("profiler-enabled");
    // add DOM event handlers
    $("dock-panel").addEventListener("change", onDockPanel);
    $("show-before-play-dialog").addEventListener("change", on_BP_change);
    $("enable-profiler").addEventListener("change", onEnableProfiler);
    
    $("defsavepath").addEventListener("change", function() {
        onPathChange('defsavepath');
    });
    $("defsavepath-browse").addEventListener("click", function() {
        choosePath('defsavepath');
    });
    $("defdatapath").addEventListener("change", function() {
        onPathChange('defdatapath');
    });
    $("defdatapath-browse").addEventListener("click", function() {
        choosePath('defdatapath');
    });
    $("defdownpath").addEventListener("change", function() {
        onPathChange('defdownpath');
    });
    $("defdownpath-browse").addEventListener("click", function() {
        choosePath('defdownpath');
    });
    
    $("type_no").addEventListener("change", onSecurityChage);
    $("type_stored").addEventListener("change", onSecurityChage);
    $("type_tmpkey").addEventListener("change", onSecurityChage);
    $("stored-password").addEventListener("change", onPasswordChange);
    $("tmpkey-button").addEventListener("click", enterTempKey);
    $("af-login-button").addEventListener("click", onAFLoginButton);
    // links
    $("more-info-bp").addEventListener("click", function() {
        link('http://wiki.imacros.net/iMacros_for_Chrome#iMacros_as_Bookmarklets');
    });
    $("more-info-profiler").addEventListener("click", function() {
       link('http://www.iopus.com/imacros/home/cr/rd.asp?helpid=profiler');
    });
    $("password-tool-page").addEventListener("click", function() {
        link('http://www.iopus.com/imacros/support/passwordtool2/');
    });
    $("more-info-encryption").addEventListener("click", function() {
        link('http://wiki.imacros.net/!ENCRYPTION');
    });
    $('whatis-af').addEventListener("click", function() {
        link('http://imacros.net/about/alertfox');
    });
});
