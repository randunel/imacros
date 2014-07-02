/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/


// a pattern to match a double quoted string or a non-whitespace char sequence
const im_strre = "(?:\"(?:[^\"\\\\]+|\\\\[0btnvfr\"\'\\\\])*\"|\\S*)";



var ClickHandler = {
    // check if the point is inside the element
    visibleElement: function(element) {
        return element.offsetWidth && element.offsetHeight;
    },


    withinElement: function(element, x, y) {
        var pos = this.getElementLUCorner(element);
        return (x >= pos.x && x <= pos.x+element.offsetWidth &&
                y >= pos.y && y <= pos.y+element.offsetHeight);

    },

    
    // find an innermost element which containts the point
    getInnermostElement: function(element, x, y) {
        var children = element.childNodes, tmp;

        for (var i = 0; i < children.length; i++) {
            if ( children[i].nodeType != Node.ELEMENT_NODE )
                continue;
            if ( this.visibleElement(children[i]) ) {
                if ( this.withinElement(children[i], x, y) ) {
                    return this.getInnermostElement(children[i], x, y);
                }
            } else {
                if ( children[i].childNodes.length ) {
                    tmp = this.getInnermostElement(children[i], x, y);
                    if ( tmp != children[i] )
                        return tmp;
                }
            }
        }

        return element;
    },


    // find an element specified by the coordinates
    getElementByXY: function (wnd, x, y) {
        throw new RuntimeError("getElementByXY is not supported in Chrome");
    },


    // find element offset relative to its window
    calculateOffset: function(element) {
        var x = 0, y = 0;
        while (element) {
            x += element.offsetLeft;
            y += element.offsetTop;
            element = element.offsetParent;
        }
        return {x: x, y: y};
    },


    // find element position in the current content window
    getElementLUCorner: function (element) {
        var rect = element.getBoundingClientRect();
        // window in cr is already reffering to element's frame
        // var win = element.ownerDocument.defaultView;
        var win = window;

        var doc = win.document;
        var doc_el = doc.documentElement;
        var body = doc.body;
        
        var clientTop = doc_el.clientTop ||
            (body && body.clientTop) || 0;

        var clientLeft = doc_el.clientLeft ||
            (body && body.clientLeft) || 0;

        var scrollX = win.scrollX || doc_el.scrollLeft ||
            (body && body.scrollLeft);

        var scrollY = win.scrollY || doc_el.scrollTop ||
            (body && body.scrollTop);

        var x = rect.left + scrollX - clientLeft;
        var y = rect.top  + scrollY - clientTop;

        return {x: Math.round(x), y: Math.round(y)};
    },

    // find center of an element
    findElementPosition: function(element) {
        var pos = this.getElementLUCorner(element);
        pos.x += Math.round(element.offsetWidth/2);
        pos.y += Math.round(element.offsetHeight/2);
        return pos;
    }

};


// An object to find and process elements specified by TAG command
var TagHandler = {
    
    // checks if the given node matches the atts
    match: function(node, atts) {
        var match = true;

        for (var at in atts) {
            if (at == "txt") {
                var txt = imns.escapeTextContent(node.textContent);
                if (!atts[at].exec(txt)) {
                    match = false; break;
                }
            } else {
                var atval = "", propval = "";
                // first check if the element has the <at> property 
                if (at in node) {
                    propval = node[at];
                } else if (at == "href" && "src" in node) {
                    // special case for old macros
                    // treat 'href' as 'src' 
                    propval = node.src;
                }
                // then check if the element has the <at> attribute
                if (node.hasAttribute(at)) {
                    atval = node.getAttribute(at);
                }
                // applay regexp to the values
                if (!(!!atts[at].exec(propval) || !!atts[at].exec(atval))) {
                    match = false; break;
                }
            } 
        }
        return match;
    },
    
    // find element (relatively) starting from root/lastNode
    // with tagName and atts
    find: function(doc, root, pos, relative, tagName, atts, form_atts) {
        var xpath = "descendant-or-self", ctx = root, nodes = new Array();
        // construct xpath expression to get a set of nodes
        if (relative) {         // is positioning relative?
            xpath = pos > 0 ? "following" : "preceding";
            if (!(ctx = this.lastNode) || ctx.ownerDocument != doc)
                return (this.lastNode = null);
        }
        xpath += "::"+tagName;
        // evaluate XPath
        var result = doc.evaluate(xpath, ctx, null,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE,
            null);
        var node = null;
        while (node = result.iterateNext()) {
            nodes.push(node);
        }
        
        // Set parameters for the search loop
        var count = 0, i, start, end, increment;
        if (pos > 0) {
            start = 0; end = nodes.length; increment = 1;
        } else if (pos < 0) {
            start = nodes.length-1; end = -1; increment = -1;
        } else {
            throw new BadParameter("POS=<number> or POS=R<number>"+
                                   " where <number> is a non-zero integer", 1);
        }

        // check for NoFormName
        if (form_atts && form_atts["name"] &&
            form_atts["name"].exec("NoFormName"))
            form_atts = null;

        // loop over nodes
        for (i = start; i != end; i += increment) {
            // First check that all atts matches
            // if !atts then match elements with any attributes
            var match = atts ? this.match(nodes[i], atts) : true;
            // then check that the element's form matches form_atts
            if (match && form_atts && nodes[i].form)
                match = this.match(nodes[i].form, form_atts);
            if (match && ++count == Math.abs(pos)) {
                // success! return the node found
                return (this.lastNode = nodes[i]);
            }
        }

        return (this.lastNode = null);
    },



    // find element by XPath starting from root
    findByXPath: function(doc, root, xpath) {
        var nodes = new Array();
        // evaluate XPath
        try {
            var result = doc.evaluate(xpath, root, null,
                                      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                                      null);
            var node = null;
            while (node = result.iterateNext()) {
                nodes.push(node);
            }
        } catch (e) {
            throw new RuntimeError("incorrect XPath expression: "+xpath, 981);
        }
        if (nodes.length > 1)
            throw new RuntimeError("ambiguous XPath expression: "+xpath, 982);
        if (nodes.length == 1)
            return nodes[0];

        return null;
    },
    

    // Find element's position (for TAG recording)
    findPosition: function(element, atts, form_atts) {
        var xpath = "descendant-or-self::"+element.tagName;
        var doc = element.ownerDocument;
        var ctx = doc.documentElement;
        var nodes = new Array(), count = 0;
        // evaluate XPath
        try {
            var res = doc.evaluate(xpath, ctx, null,
                                   XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                                   null);
            var node = null;
            while (node = res.iterateNext()) {
                nodes.push(node);
            }
        } catch (e) {
            console.error(e);
        }
    
        // check for NoFormName
        if (form_atts && form_atts["name"] &&
            form_atts["name"].exec("NoFormName"))
            form_atts = null;
        
        // loop over nodes
        for (var i = 0; i < nodes.length; i++) {
            // First check that all atts matches
            // if !atts then match elements with any attributes
            var match = atts ? this.match(nodes[i], atts) : true;
            // then check that the element's form matches form_atts
            if (match && form_atts && nodes[i].form)
                match = this.match(nodes[i].form, form_atts);
            if (match) 
                count++;
            if (nodes[i] == element)
                break;
        }

        return count;
    },


        
    // handles EXTRACT=TXT|TXTALL|HTM|ALT|HREF|TITLE|CHECKED
    onExtractParam: function(tagName, element, extract_type) {
        var tmp = "", i;
        if (/^(txt|txtall)$/i.test(extract_type)) {
            tmp = RegExp.$1.toLowerCase();
            switch (tagName) {
            case "input": case "textarea":
                return element.value;
            case "select":
                if (tmp == "txtall") {
                    var s = new Array(), options = element.options;
                    for (i = 0; i < options.length; i++) {
                        s.push(options[i].text);
                    }
                    return s.join("[OPTION]");
                } else {
                    // only first selected, this may be a bug
                    // there is no clear specs 
                    return element.value;
                }
            case "table":
                tmp = "";
                for ( i = 0; i < element.rows.length; i++) {
                    var row = element.rows[i], ar = new Array();
                    for (var j = 0; j < row.cells.length; j++)
                        ar.push(row.cells[j].textContent);
                    tmp += '"'+ar.join('","')+'"\n';
                }
                return tmp;
            default:
                return element.textContent;
            }
        } else if (/^htm$/i.test(extract_type)) {
            tmp = element.outerHTML;
            tmp = tmp.replace(/[\t\n\r]/g, " ");
            return tmp;
        } else if (/^href$/i.test(extract_type)) {
            if ("href" in element) 
                return element["href"];
            else if (element.hasAttribute("href"))
                return elem.getAttribute("href");
            else if ("src" in element)
                return element["src"];
            else if (element.hasAttribute("src"))
                return elem.getAttribute("src");
            else
                return "#EANF#";
        } else if (/^(title|alt)$/i.test(extract_type)) {
            tmp = RegExp.$1.toLowerCase();
            if (tmp in element)
                return element[tmp];
            else if (element.hasAttribute(tmp)) 
                return elem.getAttribute(tmp);
            else
                return "#EANF#";
        } else if (/^checked$/i.test(extract_type)) {
            if (!/^(?:checkbox|radio)$/i.test(element.type))
                throw new BadParameter("EXTRACT=CHECKED makes sense"+
                                       " only for check or radio boxes");
            return element.checked ? "YES" : "NO";
        } else {
            throw new BadParameter("EXTRACT=TXT|TXTALL|HTM|"+
                                   "TITLE|ALT|HREF|CHECKED", 5);
        }
    },


    // handles CONTENT=...
    onContentParam: function(tagName, element, args) {
        var tmp;
        // fire "focus" event
        this.htmlFocusEvent(element);
        
        switch (tagName) {
        case "select":
            // <select> element has special content semantic
            // so let the function handle it
            this.handleSelectElement(element, args);
            this.htmlChangeEvent(element);
            break;
        case "input":
            switch(element.type) {
            case "file":
                throw new Error("Sorry, upload functionality is currently not supported in iMacros for Chrome.");
                break;
            case "text": case "hidden": 
                // HTML5 types
            case "color": case "date": case "datetime":
            case "datetime-local": case "email": case "month":
            case "number": case "range": case "search":
            case "tel": case "time": case "url": case "week":
                element.value = args.txt;
                this.htmlChangeEvent(element);
                break;
            case "password":
                this.handlePasswordElement(element, args.txt);
                this.htmlChangeEvent(element);
                break;
            case "checkbox":
                if (/^(?:true|yes|on)$/i.test(args.txt)) {
                    if (!element.checked) 
                        element.click();
                } else {
                    if (element.checked)
                        element.click();
                }
                break;
            default:
                // click on button-like elements
                this.simulateClick(element);
            }
            break;
        case "button":
            this.simulateClick(element);
            break;
        case "textarea":
            element.value = args.txt;
            this.htmlChangeEvent(element);
            break;
        default:
            // there is not much to do with other elements
            // let's try to click it
            this.simulateClick(element);
        }
        // fire "blur" event
        this.htmlBlurEvent(element);
    },


    // process <select> element
    handleSelectElement: function(element, args) {
        var options = element.options;

        // remove selection if any
        if (element.multiple)
            element.options.selectedIndex = -1;
        
        if (args.cdata.type != "select")
            throw new RuntimeError(
                "Unable to select entry(ies) specified by: "+
                    args.rawdata, 725);

        if (args.cdata.seltype =="all") {
            // select all tags
            for (var j = 0; j < options.length; j++)
                options[j].selected = true;
            return;
        } 
        
        if (args.cdata.seltype == "multiple") // multiple selection
            element.multiple = true;

        for (var i = 0; i < args.cdata.opts.length; i++) {
            switch (args.cdata.opts[i].typ) {
                case "$": case "%":
                var re = new RegExp(args.cdata.opts[i].re_str, "i");
                for (var j = 0; j < options.length; j++) {
                    var o = options[j];
                    var s = (args.cdata.opts[i].typ == "$") ?
                        imns.escapeTextContent(o.text) : o.value;
                    if (re.exec(s)) {
                        found = true;
                        options[j].selected = true;
                        break;
                    }
                }
                if (!found) {
                    throw new RuntimeError(
                        "Entry ["+args.cdata.opts[i].str+"] not available"+
                            " [Box has "+options.length+" entries]", 924);
                }
                break;
            case "#": // index
                if (args.cdata.opts[i].idx > element.length)
                    throw new RuntimeError(
                        "Entry with index "+args.cdata.opts[i].idx+
                            " not available [Box has "+element.length+
                            " entries]", 724);
                options[args.cdata.opts[i].idx-1].selected = true;
                break;
            }
        }
    },

    // process <input type="password"/> element
    handlePasswordElement: function(element, content) {
        element.value = content;
    },

    // simulate mouse click on the element
    simulateClick: function(element) {
        if (typeof(element.click) == "function") {
            element.click();
        } else {
            var initEvent = function(e, d, typ) {
                e.initMouseEvent(typ, true, true, d.defaultView, 1, 0, 0, 0, 0,
                                 false, false, false, false, 0, null);
            };
            var stop = function (e) { e.stopPropagation(); };

            var doc = element.ownerDocument, x;
            var events = { "mouseover": null,
                "mousedown": null,
                "mouseup"  : null,
                "click"    : null };

            element.addEventListener("mouseover", stop, false);
            element.addEventListener("mouseout", stop, false);
            
            for (x in events) {
                events[x] = doc.createEvent("MouseEvent");
                initEvent(events[x], doc, x);
                element.dispatchEvent(events[x]);
            }
        }
    },

    // dispatch HTML "change" event to the element
    htmlChangeEvent: function(element) {
        if (!/^(?:input|select|textarea)$/i.test(element.tagName))
            return;
        var evt = element.ownerDocument.createEvent("Event");
        evt.initEvent("change", true, false);
        element.dispatchEvent(evt);
    },

    // dispatch HTML focus event
    htmlFocusEvent: function(element) {
        if (!/^(?:a|area|label|input|select|textarea|button)$/i.
            test(element.tagName))
            return;
        var evt = element.ownerDocument.createEvent("Event");
        evt.initEvent("focus", false, false);
        element.dispatchEvent(evt);
    },

    // dispatch HTML blur event
    htmlBlurEvent: function(element) {
        if (!/^(?:a|area|label|input|select|textarea|button)$/i.
            test(element.tagName))
            return;
        var evt = element.ownerDocument.createEvent("Event");
        evt.initEvent("blur", false, false);
        element.dispatchEvent(evt);
    }

};



function CSPlayer() {
    this.registerHandler();
}


CSPlayer.prototype.registerHandler = function() {
    connector.registerHandler("tag-command",
                              this.handleTagCommand.bind(this) );
    connector.registerHandler("refresh-command",
                              this.handleRefreshCommand.bind(this) );
    connector.registerHandler("back-command",
                              this.handleBackCommand.bind(this) );
    connector.registerHandler("prompt-command",
                              this.handlePromptCommand.bind(this) );
    connector.registerHandler("saveas-command",
                              this.handleSaveAsCommand.bind(this));
    connector.registerHandler("search-command",
                              this.handleSearchCommand.bind(this));
    connector.registerHandler("image-search-command",
                              this.handleImageSearchCommand.bind(this));
    connector.registerHandler("frame-command",
                              this.handleFrameCommand.bind(this));
    connector.registerHandler("tab-command",
                              this.handleTabCommand.bind(this));
    connector.registerHandler("stop-replaying",
                              this.onStopReplaying.bind(this));

    window.addEventListener("error", function(err) {
        var obj = {
            name: "ScriptError",
            message: err.message+" on "+err.filename+":"+err.lineno
        }
        connector.postMessage("error-occurred", obj);
    });
};


CSPlayer.prototype.handleRefreshCommand = function(args, callback) {
    if (callback)
        callback();
    window.location.reload();
};

CSPlayer.prototype.handleBackCommand = function(args, callback) {
    if (callback)
        callback();
    history.back();
};


CSPlayer.prototype.handlePromptCommand = function(args, callback) {
    var retobj = {varnum: args.varnum, varname: args.varname};
    if (typeof(args.varnum) != "undefined" ||
        typeof(args.varname) != "undefined") {
        // TODO: check if input was cancelled
        retobj.value = prompt(args.text, args.defval);
    } else {
        alert(args.text);
    }
    callback(retobj);
};

CSPlayer.prototype.handleFrameCommand = function(args, callback) {
    // find frame by number
    var findFrame = function(win, obj) {
        var frames = win.frames, i, f;
        for (i = 0; i < frames.length; i++) {
            var dv = frames[i];
            if (--obj.num == 0) {
                return frames[i];
            } else if (f = findFrame(dv, obj))
                return f;
        }
        return null;
    };

    // find frame by name
    var findFrameByName = function(win, name) {
        var frames = win.frames, i;
        for (var i = 0; i < frames.length; i++) {
            var dv = frames[i];
            if (name.test(frames[i].name))
                return frames[i];
            else if (f = findFrameByName(dv, name))
                return f;
        }
        return null;
    };

    var f = null;
    if (typeof(args.number) == "number") {
        f = findFrame(window, {num: args.number});
    } else if (args.name) {
        var name_re = new RegExp("^"+args.name.replace(/\*/g, ".*")+"$");
        f = findFrameByName(window, name_re);
    }
    // console.log("handleFrame: args=%O, frame %s", args,
    //            (f? "found" : "not found"));
    callback( f? {frame: args} : {});
};

// currently the main purpouse of the handler is remove
// highlight div if present
CSPlayer.prototype.handleTabCommand = function(args, callback) {
    if (callback)
        callback();
    var hl_div = document.getElementById("imacros-highlight-div");
    if (hl_div) {
        (hl_div.parentNode || hl_div.ownerDocument).
            removeChild(hl_div);
    }
};

// currently the main purpouse of the handler is remove
// highlight div if present
CSPlayer.prototype.onStopReplaying = function(args, callback) {
    if (callback)
        callback();
    var hl_div = document.getElementById("imacros-highlight-div");
    if (hl_div) {
        (hl_div.parentNode || hl_div.ownerDocument).
            removeChild(hl_div);
    }
};


CSPlayer.prototype.highlightElement = function(element) {
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

    return hl_div;
};


CSPlayer.prototype.handleTagCommand = function(args, callback) {
    var doc = window.document;
    var root = doc.documentElement;
    var element;

    var retobj = {
        found: false,       // element found
        extract: "",        // extract string if any
        error: null         // error message or code
    };
    // console.info("playing tag comand args=%O on page=%s", args,
    //              window.location.toString());
    try {
        // compile regexps for atts and form
        if (args.atts)
            for (var x in args.atts) 
                args.atts[x] = new RegExp(args.atts[x], "i");
        if (args.form)
            for (var x in args.form) 
                args.form[x] = new RegExp(args.form[x], "i");

        if (args.xpath)
            element = TagHandler.findByXPath(doc, root, args.xpath);
        else 
            element = TagHandler.find(doc, root, args.pos, args.relative,
                                      args.tagName, args.atts, args.form);
        if (!element) {
            var msg = "element "+args.tagName.toUpperCase()+
                " specified by "+args.atts_str+
                " was not found";
            if (args.type == "extract") {
                retobj.extract = "#EANF#";
            } else {
                retobj.error = normalize_error(new RuntimeError(msg));
            }
            callback(retobj);
            return;
        }
        retobj.found = true;
        // scroll to the element
        if (args.scroll) {
            var pos = ClickHandler.findElementPosition(element);
            window.scrollTo(pos.x-100, pos.y-100);
        }

        // make it blue
        if (args.highlight) {
            this.highlightElement(element);
        }

        if (args.tagName == "*" || args.tagName == "")
            args.tagName = element.tagName.toLowerCase();
        // extract
        if (args.type == "extract") {
            retobj.extract =
                TagHandler.onExtractParam(args.tagName, element, args.txt);
        } else if (args.type == "content") {
            if (args.cdata.type == "event") {
                switch(args.cdata.etype) {
                case "saveitem": case "savepictureas":
                case "savetargetas": case "savetarget":
                    retobj.error = "Event type "+args.cdata.etype+
                        " not supported";
                    break;
                case "mouseover":
                    var evt = doc.createEvent("MouseEvent");
                    evt.initMouseEvent("mouseover", true, true,
                                       doc.defaultView, 0, 0, 0, 0, 0,
                                       false, false, false, false, 0, null);
                    element.dispatchEvent(evt);
                    break;
                case "fail_if_found":
                    retobj.error = "FAIL_IF_FOUND event";
                    break;
                default:
                    retobj.error = "Unknown event type "+args.cdata.etype+
                        " for tag command";
                }
            } else {
                TagHandler.onContentParam(args.tagName, element, args);
            }
        } else {
            TagHandler.onContentParam(args.tagName, element);
        }
    } catch (e) {
        retobj.error = normalize_error(e);
        console.error(e);
    } finally {
        // console.log("handleTagCommand, retobj=%O", retobj);
        callback(retobj);
    }
};


CSPlayer.prototype.handleSaveAsCommand = function(args, callback) {
    if (args.type == "htm") {
        callback(document.documentElement.outerHTML);
    } else if (args.type == "txt") {
        callback(document.documentElement.innerText);
    }
};



CSPlayer.prototype.handleSearchCommand = function(args, callback) {
    var search_re, retobj = {found: false}, query = args.query;
    try {
        switch (args.type) {
        case "txt":
            // escape all chars which are of special meaning in regexp
            query = imns.escapeREChars(query);
            // replace * by 'match everything' regexp
            query = query.replace(/\*/g, '(?:[\r\n]|.)*');
            // treat all <SP> as a one or more whitespaces
            query = query.replace(/ /g, "\\s+");
            search_re = new RegExp(query, args.ignore_case);
            break;
        case "regexp":
            try {
                search_re = new RegExp(query, args.ignore_case);
            } catch(e) {
                console.error(e);
                throw new RuntimeError("Can not compile regular expression: "
                                       +query);
            }
            break;
        }
        
        var root = window.document.documentElement;
        var found = search_re.exec(root.innerHTML);
        if (!found) {
            throw new RuntimeError(
                "Source does not match to "+args.type.toUpperCase()+"='"+
                    args.query+"'", 726
            );
        }
        retobj.found = true;
        if (args.extract) {
            retobj.extract = args.extract.
                replace(/\$(\d{1,2})/g, function (match_str, x) {
                    return found[x];
                });
        }
    } catch(e) {
        retobj.error = normalize_error(e);
        console.error(e);
    } finally {
        callback(retobj);
    }
};



CSPlayer.prototype.handleImageSearchCommand = function(args, callback) {
    var div = document.createElement("div");
    div.style.width = args.width+"px";
    div.style.height = args.height+"px";
    div.style.border = "1px solid #9bff9b";
    div.style.zIndex = "100";
    div.style.position = "absolute";
    div.style.left = Math.floor(args.x-args.width/2)+"px";
    div.style.top = Math.floor(args.y-args.height/2)+"px";
    document.body.appendChild(div);
    callback();
};



var player = new CSPlayer();


