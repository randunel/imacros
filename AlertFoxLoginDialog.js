/*
(c) Copyright 2014 iOpus Software GmbH - http://www.iopus.com
*/

window.addEventListener("load", function() {
    var checkbox = $('save-credentials-checkbox');
    var usr = $("af-username");
    var pwd = $("af-password");
    if (Storage.getBool("af-save-credentials")) {
        checkbox.checked = true;
        if (Storage.isSet("af-username"))
            usr.value = Storage.getChar("af-username");
        if (Storage.isSet("af-password"))
            pwd.value = Storage.getChar("af-password");
    }

    $('check-credentials-button').addEventListener("click", onCheckCredentials);
    $('ok-button').addEventListener("click", onOk);
    $('cancel-button').addEventListener("click", onCancel);
    $('sign-up-link').addEventListener("click", function() {
        link("http://alertfox.com/create-account/");
    });
    usr.addEventListener("input", onCredentialsChanged);
    pwd.addEventListener("input", onCredentialsChanged);
    // prevent right-click
    document.body.oncontextmenu = function(e) {
        e.preventDefault();
        return false;
    };
});


function onCheckCredentials() {
    const wsdl_url = "https://my.alertfox.com/imu/AlertFoxManagementAPI.asmx";
    var btn = $("check-credentials-button");
    var usr = $("af-username").value;
    var pwd = $("af-password").value;
    var args = {accountName: usr, accountPassword: pwd};

    // change btn appearance
    btn.setAttribute("waiting", "true");
    SOAPClient.invoke(wsdl_url, "CheckLogin", args, function(rv, err) {
        btn.removeAttribute("waiting");
        if (!rv) {
            alert("Error occured while checking credentials: "+
                  err.message);
            return;
        }
        if (rv.CheckLoginResult) {
            btn.setAttribute("checked", "true");
        } else {
            alert("Either user name or password is incorrect");
        }
    });
}

function onCredentialsChanged() {
    var btn = $("check-credentials-button");
    btn.removeAttribute("checked");
}

function onOk() {
    var checkbox = $('save-credentials-checkbox');
    var usr = $("af-username");
    var pwd = $("af-password");
    if (checkbox.checked) {
        Storage.setBool("af-save-credentials", true)
        Storage.setChar("af-username", usr.value);
        Storage.setChar("af-password", pwd.value);
    }
    if (typeof args != "undefined" && args.proceed) {
        var bg = chrome.extension.getBackgroundPage();
        var panel = bg.context[args.win_id].panelWindow;
        if (panel && !panel.closed) {
            setTimeout(function() {
                panel.uploadMacro(args.skipOnlineTest);
            }, 0);
        }
    }
    window.close();
}

function onCancel() {
    // do nothing
    window.close();
}
