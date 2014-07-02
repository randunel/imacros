/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


function CSRecorder() {
    connector.registerHandler("start-recording",
                              this.onStartRecording.bind(this));
    connector.registerHandler("stop-recording",
                              this.onStopRecording.bind(this));
    connector.postMessage("query-state", {},
                          this.onQueryStateCompleted.bind(this));
}


CSRecorder.prototype.saveAction = function(str) {
    console.info("saveAction, action="+str);
    connector.postMessage("record-action", {action: str});
};


CSRecorder.prototype.onStopRecording = function(data, callback) {
    if (callback)
        callback();
    if (this.recording)
        this.stop();
    var hl_div = document.getElementById("imacros-highlight-div");
    if (hl_div) {
        (hl_div.parentNode || hl_div.ownerDocument).
            removeChild(hl_div);
    }
};

CSRecorder.prototype.onStartRecording = function(data, callback) {
    if (callback)
        callback();
    this.start();
};


CSRecorder.prototype.onQueryStateCompleted = function(data) {
    // force recording after page load
    if (data.state == "recording" && !this.recording) {
        this.start();
    }
};


CSRecorder.prototype.start = function() {
    this.onChangeEvent = this.onChange.bind(this);
    this.onClickEvent = this.onClick.bind(this);
    //this.onMouseOverEvent = this.onMouseOver.bind(this);
    //this.onMouseDownEvent = this.onMouseDown.bind(this);
    this.onKeyPressEvent = this.onKeyPress.bind(this);
    this.onKeyDownEvent = this.onKeyDown.bind(this);
    window.addEventListener("change", this.onChangeEvent, true);
    window.addEventListener("click", this.onClickEvent, true);
    // window.addEventListener("mouseover", this.onMouseOverEvent, true);
    // window.addEventListener("mousedown", this.onMouseDownEvent, true);
    window.addEventListener("keypress", this.onKeyPressEvent, true);
    window.addEventListener("keydown", this.onKeyDownEvent, true);
    this.recording = true;
    // TODO: pass favorIds as parameter from bg page
    this.favorIds = true;
};


CSRecorder.prototype.stop = function() {
    window.removeEventListener("change", this.onChangeEvent, true);
    window.removeEventListener("click", this.onClickEvent, true);
    // window.removeEventListener("mouseover", this.onMouseOverEvent, true);
    // window.removeEventListener("mousedown", this.onMouseDownEvent, true);
    window.removeEventListener("keypress", this.onKeyPressEvent, true);
    window.removeEventListener("keydown", this.onKeyDownEvent, true);
    this.recording = false;
};






// helper function to parse ATTR=... string
CSRecorder.prototype.parseAtts = function(str) {
    if (!str || str == "*")
        return null;
    var arr = str.split(new RegExp("&&(?=[-\\w]+:"+im_strre+")"));
    var parsed_atts = new Object(), at, val, m;
    const re = new RegExp("^([-\\w]+):("+im_strre+")$");
    for (var i = 0; i < arr.length; i++) {
        if (!(m = re.exec(arr[i])))
            throw new BadParameter("incorrect ATTR or FORM specifier: "
                                   +arr[i]);
        at = m[1].toLowerCase();
        if (at.length) {
            val = imns.unwrap(m[2]);
            // While replaying:
            // 1. remove all leading/trailing whitespaces 
            // 2. remove all linebreaks in the target string
            val = imns.escapeTextContent(val);
            val = imns.escapeREChars(val);
            val = val.replace(/\*/g, '(?:\n|.)*');
            // 3. treat all <SP> as a one or more whitespaces
            val = val.replace(/ /g, "\\s+");
            parsed_atts[at] = "^\\s*"+val+"\\s*$";
        } else {
            parsed_atts[at] = "^$";
        }
    }
    for (var x in parsed_atts) 
        parsed_atts[x] = new RegExp(parsed_atts[x]);

    return parsed_atts;
};
    


CSRecorder.prototype.makeFormRecord = function(elem) {
    var form = "";
    if (elem.form) {
        if (elem.form.id && this.favorIds) {
            form = "ID:"+imns.wrap(elem.form.id);
        } else {
            // NOTE: workaround for Chrome bug: element.form.name
            // returns <input> element with id=name instead of form's name
            // attribute value 
            if (elem.form.hasAttribute('name')) {
                form = "NAME:"+imns.wrap(elem.form.getAttribute('name'));
            } else if (elem.form.action) {
                var x;
                if (!(x = elem.form.getAttribute("action")))
                    x = elem.form.action;
                form = "ACTION:"+imns.wrap(x);
            } else {
                form = "NAME:NoFormName";
            }
        }
    }

    return form;
};


CSRecorder.prototype.makeAttrRecord = function (elem) {
    // trancate text more than 60 chars long, fx #647
    var truncate = function(s) {
        s = s.toString();
        if (s.length > 60) {
            s = s.substring(0, 60);
            s = s.replace(/(?:<|<\w{0,2}|<\w{2}>)+$/, "");
            s += "*";
        } 
        return s;
    };

    var attr = "";

    if ("input" == elem.tagName.toLowerCase()) {
        if (this.favorIds && elem.id) {
            attr = "ID:"+imns.wrap(elem.id);
        } else {
            var arr = new Array();
            if (elem.name)
                arr.push("NAME:"+imns.wrap(elem.name));
            if (elem.src)
                arr.push("SRC:"+imns.wrap(elem.src));
            attr = arr.length ? arr.join("&&") : "*";
        }
    } else {
        var val = "";
        if (this.favorIds && elem.id) {
            val = "ID:"+imns.wrap(elem.id);
        } else if (elem.href) {
            // record txt content first for anchor elements
            if (elem.textContent) {
                val = "TXT:"+truncate(imns.wrap(
                    imns.escapeTextContent(elem.textContent)
                ));
            } else {
                val = "HREF:"+imns.wrap(elem.href);
            }
        } else {
            if (elem.src) {
                val = "SRC:"+imns.wrap(elem.src);
            } else if (elem.name) {
                val = "NAME:"+imns.wrap(elem.name);
            } else if (elem.alt) {
                val = "ALT:"+imns.wrap(elem.alt);
            } else if (elem.textContent) {
                val = "TXT:"+truncate(imns.wrap(
                    imns.escapeTextContent(elem.textContent)
                ));
            }
        }

        if (!val) {  //form attr string
            var x = elem.attributes, arr = new Array();
            for (var i = 0; i < x.length; i++) {
                if (/^style$/i.test(x[i].name))
                    continue;
                arr.push(x[i].name.toUpperCase()+":"+
                         imns.wrap(x[i].value));
            }

            arr.push("TXT:"+truncate(imns.wrap(
                imns.escapeTextContent(elem.textContent)
            )));

            val = arr.length ? arr.join("&&") : "*";
        }
        attr = val;
    }
    
    return attr;
};


function is_html5_input_type(type) {
    var t = type.toLowerCase();
    return t == "color" ||
        t == "date" ||
        t == "datetime" ||
        t == "datetime-local" ||
        t == "email" ||
        t == "month" ||
        t == "number" ||
        t == "range" ||
        t == "search" ||
        t == "tel" ||
        t == "time" ||
        t == "url" ||
        t == "week";
}


function is_html5_text_input_type(type) {
    var t = type.toLowerCase();
    return t == "email" ||
        t == "search" ||
        t == "tel" ||
        t == "url";
}


CSRecorder.prototype.onChange = function(e) {
    var elem = e.target;
    var tagName = elem.tagName;

    // debug("onChange, element="+elem.tagName+
    //       ", url="+window.location.toString());

    if (!/^(?:input|textarea|select)$/i.test(tagName) ||
        /^input$/i.test(tagName) &&
        !(is_html5_input_type(elem.type) ||
          /^(?:text|password|checkbox|file)$/i.test(elem.type))
       )
        return;

    var rec = "", type = "" , pos = 0, form = null, attr = "", content = "";

    // TYPE
    type = tagName;

    // CONTENT
    switch (tagName) {
    case "INPUT":
        type += ":"+elem.type.toUpperCase();
        if (is_html5_input_type(elem.type) ||
            /^(?:text|file)$/i.test(elem.type)) {
            content = imns.wrap(elem.value);
        } else if (elem.type == "password") {
            // password will be handled in mrecorder
            // no special handling here
            content = imns.wrap(elem.value);
        } else if (elem.type == "checkbox") {
            content = elem.checked ? "YES" : "NO";
        } 
        break;
    case "SELECT":
        for(var i=0; i < elem.length; i++) {
            var prefix, text;
            if(!elem[i].selected)
                continue;
            
            if (elem[i].value) {
                prefix = "%";
                text = elem[i].value;
            } else {
                prefix = "$";
                text = escapeTextContent(elem[i].textContent);
            }
            if (!content) 
                content = prefix + imns.wrap(text);
            else
                content += ":" + prefix + imns.wrap(text);
        }
        break;
    case "TEXTAREA":
        content = imns.wrap(elem.value);
        break;
    default:
        return;
    }

    // FORM
    form = this.makeFormRecord(elem);
    
    // ATTR
    attr = this.makeAttrRecord(elem);
    
    // POS
    var atts = this.parseAtts(attr), m;

    // special handling of INPUT elements
    if (/input/i.test(tagName)) { 
        if (!atts) atts = new Object();
        atts["type"] = new RegExp("^"+elem.type+"$");
    }
    
    var form_atts = form ? this.parseAtts(form) : null;

    if (!(pos = TagHandler.findPosition(elem, atts, form_atts))) {
        // TODO: add appropriate error handling
        console.error("Can't find element position, atts="+
                      atts.toSource());
        return;
    }

    // if (highlight)
    this.highlightElement(elem);

    // form new record
    rec = "TAG";
    rec += " POS="+pos;
    rec += " TYPE="+type;
    rec += form ? " FORM="+form : "";
    rec += " ATTR="+attr;
    rec += " CONTENT="+content;
    this.saveAction(rec);

    // if submitter is not null that means we have form submitted 
    // through Enter key.
    // we should make record for sumbitter in that case
    if (this.submitter) {
        tagName = this.submitter.tagName.toUpperCase();
        type = tagName;
        if (tagName == "INPUT")
            type += ":"+this.submitter.type.toUpperCase();
        form = this.makeFormRecord(this.submitter);
        attr = this.makeAttrRecord(this.submitter);

        // find POS value
        atts = this.parseAtts(attr);
        if (!atts) atts = new Object();
        atts["type"] = new RegExp("^"+this.submitter.type+"$");
        form_atts = form ? this.parseAtts(form) : null;
        pos = TagHandler.findPosition(this.submitter, atts, form_atts);
        if (!pos) {
            // TODO: add appropriate error handling
            console.error("Can't find element position, atts="+
                          atts.toSource());
            return;
        }
        // if (highlight)
        this.highlightElement(this.submitter);
        // form new record
        rec = "TAG";
        rec += " POS="+pos;
        rec += " TYPE="+type;
        rec += form ? " FORM="+form : "";
        rec += " ATTR="+attr;
        this.saveAction(rec);
        this.submitter = null;   
    }
};



CSRecorder.prototype.onKeyDown = function(e) {
    // check form submission through Enter key
    var elem = e.target;
    var tagName = elem.tagName;

    if (tagName.toLowerCase() != "input" ||
        !(is_html5_text_input_type(elem.type) || 
          /^(?:text|password)$/i.test(elem.type)))
        return;

    if (e.keyCode != 13 && e.keyCode != 14)
        return;
    
    if (elem.form) {
        for (var i = 0; i < elem.form.elements.length; i++) {
            if (/submit/i.test(elem.form.elements[i].type)) {
                // save the submitter element to record it
                // on "change" event at later point
                this.submitter = elem.form.elements[i];
                break;
            }
        }
    }
};


CSRecorder.prototype.onKeyPress = function(e) {
    var elem = e.target;
    var tagName = elem.tagName;

    // debug("onKeyPress, element="+elem.tagName+
    //       ", url="+window.location.toString());

    // record only text elements
    if (!/^(?:input|textarea)$/i.test(tagName))
        return;

    var is_html5_text_input_type = function(type) {
        var t = type.toLowerCase();
        return t == "email" ||
            t == "search" ||
            t == "tel" ||
            t == "url";
    };

    if (/^input$/i.test(tagName) &&
        !(is_html5_text_input_type(elem.type) || 
          /^(?:text|password)$/i.test(elem.type)))
        return;

    var val = e.charCode ? String.fromCharCode(e.charCode) : "";
    var rec = "TAG", type = "" , pos = 0, form = null,
    attr = "", content = "";

    // TYPE
    type = tagName;

    // CONTENT
    switch (tagName) {
    case "INPUT":
        type += ":"+elem.type.toUpperCase();
        if (is_html5_text_input_type(elem.type) ||
            elem.type.toLowerCase() == "text") {
            content = imns.wrap(elem.value+val);
        } else if (elem.type == "password") {
            // password will be handled in mrecorder
            // no special handling here
            content = imns.wrap(elem.value+val);
        } 
        break;
        
    case "TEXTAREA":
        content = imns.wrap(elem.value+val);
        break;
    default:
        return;
    }

    // FORM
    form = this.makeFormRecord(elem);

    // ATTR
    attr = this.makeAttrRecord(elem);

    // POS
    var atts = this.parseAtts(attr), m;

    // special handling of INPUT elements
    if (/input/i.test(tagName)) { 
        if (!atts) atts = new Object();
        atts["type"] = new RegExp("^"+elem.type+"$");
    }
    
    var form_atts = form ? this.parseAtts(form) : null;

    if (!(pos = TagHandler.findPosition(elem, atts, form_atts))) {
        // TODO: add appropriate error handling
        console.error("Can't find element position, atts="+
                      atts.toSource());
        return;
    }

    // if (highlight)
    this.highlightElement(elem);
    
    // form new record
    rec = "TAG";
    rec += " POS="+pos;
    rec += " TYPE="+type;
    rec += form ? " FORM="+form : "";
    rec += " ATTR="+attr;
    rec += " CONTENT="+content;
    this.saveAction(rec);

};



CSRecorder.prototype.onClick = function(e) {
    var elem = e.target;
    if (e.button != 0) {
        return;                 // record only left mouse click
    }
    
    var tagName = elem.tagName.toUpperCase();

    // debug("onClick, element="+elem.tagName+
    //       ", url="+window.location.toString());
    
    if (/^(?:select|option|textarea|form|html|body)$/i.test(tagName))
        return;
    else if (/^input$/i.test(tagName) &&
             !/^(?:button|submit|radio|image)$/i.test(elem.type))
        return;


    var rec = "", type = "" , pos = 0, content = "";
    
    type = tagName;
    if (/^input$/i.test(tagName)) {
        type += ":"+elem.type.toUpperCase();
    }

    var form = this.makeFormRecord(elem);
    var attr = this.makeAttrRecord(elem);

    // find POS value
    var atts = this.parseAtts(attr);
    // special handling of INPUT elements
    if (/input/i.test(tagName)) { 
        if (!atts) atts = new Object();
        atts["type"] = new RegExp("^"+elem.type+"$");
    }

    var form_atts = form ? this.parseAtts(form) : null;
    if (!(pos = TagHandler.findPosition(elem, atts, form_atts))) {
        // TODO: add appropriate error handling
        console.error("Can't find element position, atts="+atts.toSource());
        return;
    }

    // if (highlight)
    this.highlightElement(elem);
    
    // form new record
    rec = "TAG";
    rec += " POS="+pos;
    rec += " TYPE="+type;
    rec += form ? " FORM="+form : "";
    rec += " ATTR="+attr;
    rec += content ? " CONTENT="+content : "";
    this.saveAction(rec);
};


// CSRecorder.prototype.onMouseOver = function(e) {
// };


CSRecorder.prototype.highlightElement = function(element) {
    var doc = element.ownerDocument;
    var hl_div = doc.getElementById("imacros-highlight-div");
    var hl_img = null;
    if (!hl_div) {
        // TODO: maybe move that into CSS file and inject that file
        // onto page dynamically?
        hl_div = doc.createElement("div");
        hl_div.id = "imacros-highlight-div";
        hl_div.style.position = "absolute";
        hl_div.style.zIndex = 1000;
        hl_div.style.border = "1px solid blue";
        hl_div.style.borderRadius = "2px";
        hl_img = doc.createElement("div");
        hl_img.style.display="block";
        hl_img.style.width = "24px";
        hl_img.style.height = "24px";
        hl_img.style.backgroundImage =
            "url('"+chrome.extension.getURL("skin/logo24.png")+"')";
        hl_div.appendChild(hl_img);
        doc.body.appendChild(hl_div);
    } else {
        hl_img = hl_div.firstChild;
    }
    var rect = element.getBoundingClientRect();
    var scrollX = doc.defaultView.scrollX;
    var scrollY = doc.defaultView.scrollY;
    hl_div.style.left = Math.round(rect.left-1+scrollX)+"px";
    hl_div.style.top = Math.round(rect.top-1+scrollY)+"px";
    hl_div.style.width = Math.round(rect.width)+"px";
    hl_div.style.height = Math.round(rect.height)+"px";
    // position image 
    if (rect.top > 26) {
        hl_img.style.marginLeft = "4px";
        hl_img.style.marginTop = "-26px";
    } else if (rect.bottom+26 < doc.body.clientHeight) {
        hl_img.style.marginLeft = "4px";
        hl_img.style.marginBottom = "-26px";
    } else if (rect.left > 26) {
        hl_img.style.marginLeft = "-26px";
        hl_img.style.marginTop = "4px";
    } else if (rect.right+26 < doc.body.clientWidth) {
        hl_img.style.marginRight = "-26px";
        hl_img.style.marginTop = "4px";
    } else {
        hl_img.style.marginLeft = "0px";
        hl_img.style.marginTop = "0px";
    }

    doc.defaultView.setTimeout(function() {
        (hl_div.parentNode || hl_div.ownerDocument).
            removeChild(hl_div);
    }, 300);
    
    return hl_div;
};

// CSRecorder.prototype.onMouseDown = function(e) {
// };


var recorder = new CSRecorder();
