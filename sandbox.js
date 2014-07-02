/*
(c) Copyright 2012 iOpus Software GmbH - http://www.iopus.com
*/

function EvalException(msg, num) {
    this.message = msg;
    if (typeof num != "undefined")
        this.errnum = num;
    this.name = "MacroError";
}

function MacroError(txt) {
    throw new EvalException(txt, -1340);
}

window.addEventListener("message", function(event) {
    var response = {id: event.data.id};
    try {
        response.result = eval(event.data.expression);
    } catch(e) {
        console.error(e);
        response.error = {
            name: e.name,
            message: e.message,
            errnum: e.errnum
        };
    }
    
    event.source.postMessage(response, event.origin);
});