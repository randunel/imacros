/*
(c) Copyright 2011 iOpus Software GmbH - http://www.iopus.com
*/

var mv = {
    lineCounter: 0,

    showLines: function(code) {
        var lines = code.split(/\r?\n/);
        this.clearAllLines();   // just to make sure it's empty
        lines.forEach(function(line) {
            mv.addLine(line, true)
        });
    },


    addLine: function(txt, no_scroll) {
        this.lineCounter++;
        var tr = document.createElement("tr");

        // line number
        var num = document.createElement("td");
        num.setAttribute("class", "line-number");
        num.textContent = this.lineCounter;

        // text
        var line = document.createElement("td");
        line.setAttribute("class", "macro-line");
        if (/^\s*'/.test(txt))
            line.setAttribute("commented", "true");
        line.textContent = txt;
        
        // put that all together
        tr.appendChild(num);
        tr.appendChild(line);
        $("lines").appendChild(tr);

        if (!no_scroll) {
            this.ensureNodeIsVisible(tr);
        }
    },


    removeLastLine: function() {
        var lines = $("lines");
        lines.removeChild(lines.lastChild);
    },


    highlightLine: function(linum) {
        // evaluate XPath to find all elements
        // with attribute selected="true"
        var xpath = "id('lines')/tr[@selected='true']";
        try {
            var result = document.evaluate(xpath, document, null,
                            XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                            null);
            var node = null, nodes = new Array();
            while (node = result.iterateNext()) {
                nodes.push(node);
            }
            // remove selection
            nodes.forEach( function(x) {
                x.removeAttribute("selected");
            })
        } catch(e) {
            console.error(e);
        }
        // select the proper one
        xpath = "id('lines')//tr[position()="+parseInt(linum)+"]";
        try {
            result = document.evaluate(xpath, document, null,
                                       XPathResult.FIRST_ORDERED_NODE_TYPE,
                                       null);
            if (node = result.singleNodeValue) {
                this.ensureNodeIsVisible(node);
                node.setAttribute("selected", "true");
            }
        } catch(e) {
            console.error(e);
        }
    },


    clearAllLines: function() {
        $("lines").innerHTML = "";
        this.lineCounter = 0;
    },


    setStatLine: function(txt, type) {
        $("status-div").setAttribute("type", type);
        $("status").textContent = txt;
    },

    ensureNodeIsVisible: function(node) {
        var box = node.getBoundingClientRect();
        // console.log("ensureNodeIsVisible: box.top="+box.top+
        //             ", box.bottom="+box.bottom+
        //             ", window.pageYOffset="+window.pageYOffset+
        //             ", document.body.clientHeight="+document.body.clientHeight);
        if (box.bottom > document.body.clientHeight) {
            window.scrollTo(0, box.bottom+window.pageYOffset-
                            document.body.clientHeight+5);
        } else if (box.bottom < 0) {
            window.scrollTo(0, box.top+window.pageYOffset-5);
        }
    }
};
