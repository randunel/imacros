//*<JasobNoObfs>*/
/*
(c) Copyright 2013 iOpus Software GmbH - http://www.iopus.com
*/
/*</JasobNoObfs>*/



var EXPORTED_SYMBOLS = ["SOAPClient"];

var SOAPClient = (function () {

    var WSDL_cache = new Object();

    var xmlns_schema="http://www.w3.org/2001/XMLSchema";
    var xmlns_wsdl="http://schemas.xmlsoap.org/wsdl/";

    
    function WSDLObject(url, xmlDoc) {
        this.url = url;
        this.doc = xmlDoc;
        // assume that all the namespace definitions are provided
        // in document element
        this.nsTable = new Object();
        this.reverseNsTable = new Object();
        var atts = this.doc.documentElement.attributes;
        for (var i = 0; i < atts.length; i++) {
            if (/^xmlns:(.*)$/.test(atts[i].name)) {
                this.nsTable[RegExp.$1] = atts[i].value;
                this.reverseNsTable[atts[i].value] = RegExp.$1;
            }
        }

        // query method names
        this.methods = new Object();
        
        var wsdl_prefix = this.reverseNsTable[xmlns_wsdl] ?
            this.reverseNsTable[xmlns_wsdl]+":" : "";
        var operations = this.doc.evaluate(
            "//"+wsdl_prefix+"portType/"+wsdl_prefix+"operation",
            this.doc, this.resolveNS.bind(this),
            // XPathResult.ORDERED_NODE_ITERATOR_TYPE
            5,
            null
        );

        var op = null;
        while (op = operations.iterateNext()) {
            if (!op.hasAttribute('name'))
                continue;       // unlikely but for peace of mind
            var op_name = op.getAttribute('name'); 
            this.methods[op_name] = {};
            // assume that the operation contains input/output specifiers which
            // is not always true as they can be specified in bindings 
            var input_tagName = wsdl_prefix+"input";
            var output_tagName = wsdl_prefix+"output";
            for(var i = 0; i < op.children.length; i++) {
                var tagName = op.children[i].tagName;
                if (tagName == input_tagName) {
                    if (op.children[i].hasAttribute('message')) {
                        var msg_name = op.children[i].getAttribute('message');
                        this.methods[op_name].input = {
                            typeObject: this.getType(msg_name)
                        };
                    }
                } else if (tagName == output_tagName) {
                    if (op.children[i].hasAttribute('message')) {
                        var msg_name = op.children[i].getAttribute('message');
                        this.methods[op_name].output = {
                            typeObject: this.getType(msg_name)
                        };
                    }
                }
            }
        }
        // __loginf("WSDLObject created, methods="+this.methods.toSource());
    };


    WSDLObject.prototype.getType = function(messageName) {
        var schema_prefix = this.reverseNsTable[xmlns_schema] ?
            this.reverseNsTable[xmlns_schema]+":" : "";
        var wsdl_prefix = this.reverseNsTable[xmlns_wsdl] ?
            this.reverseNsTable[xmlns_wsdl]+":" : "";
        
        // TODO: Here we assume that <wsdl:message>/<wsdl:part> refer to
        // Schema element containing type definition but the types can also
        // be defined using one or more <wsdl:part> elements with 'type'
        // attribute. We ignore such case.

        // NOTE: That part I don't really understand. operations in portType
        // refers to messages using prefixed names. In order to find
        // corresponding message I have to remove the prefix because
        // <wsdl:message> 'name' attributes do not use prefixes
        var msg_name = messageName.replace(/^\w+:/, "");
        var part_element = this.doc.evaluate(
            "//"+wsdl_prefix+"message[@name=\""+msg_name+"\"]/"+
                wsdl_prefix+"part",
            this.doc, this.resolveNS.bind(this),
            // XPathResult.FIRST_ORDERED_NODE_TYPE
            9, null
        ).singleNodeValue;
        
        if (!part_element) {
            throw new Error("No type definition for "+messageName);
        }
        // see above for that .replace
        var el_name = part_element.getAttribute("element").replace(/^\w+:/, "");
        var schema_element = this.doc.evaluate(
            "//"+schema_prefix+"element[@name=\""+el_name+"\"]",
            this.doc, this.resolveNS.bind(this),
            // XPathResult.FIRST_ORDERED_NODE_TYPE
            9, null
        ).singleNodeValue;

        if (!schema_element) {
            throw new Error("No type definition for "+messageName);
        }
        
        // NOTE: we use very simplistic approach here assuming that element is
        // of complex type consisting only of simple types and has no
        // additional complex members
        var typeObject = {};
        var nodes = this.doc.evaluate(
            "./"+schema_prefix+"complexType/"+schema_prefix+"sequence/"+
                schema_prefix+"element",
            schema_element, this.resolveNS.bind(this),
            /* XPathResult.ORDERED_NODE_ITERATOR_TYPE */ 5, null
        )
        var n = null;
        while(n = nodes.iterateNext()){
            // ignore Schema restriction and any other complexities here
            // just assume it is one of primitive types
            typeObject[n.getAttribute('name')] = {
                type: n.getAttribute('type').replace(
                    new RegExp("^"+schema_prefix), ""
                )
            };
        }

        return typeObject;
    };

    WSDLObject.prototype.resolveNS = function(ns) {
        var uri = this.nsTable[ns];
        if (!uri)
            throw Error("Unable to resolve namespace "+ns);
        return uri;
    };

    // assume that args is a plain JS object
    WSDLObject.prototype.argsToXML = function(method, args) {
        // __loginf("argsToXML, method="+method+", args="+args.toSource());
        var m = this.methods[method];
        if (!m || !m.input || !m.input.typeObject) {
            throw new Error("Input type not specified for method "+method);
        }
        var type_object = m.input.typeObject;
        var s = "";
        // TODO: from all the variety of XML Schema types
        // we use only three (which maybe too much of simplification)
        // __loginf("input type object="+type_object.toSource());
        var tns = this.doc.documentElement.getAttribute("targetNamespace");
        var prefix = this.reverseNsTable[tns] ?
            this.reverseNsTable[tns]+":" : "";
        
        for (var x in args) {
            if (type_object[x].type == "string" ) {
                s += "<"+prefix+x+">"+
                    args[x].replace(/&/g, "&amp;").
                    replace(/</g, "&lt;").
                    replace(/>/g, "&gt;")+
                    "</"+prefix+x+">";
            } else if (type_object[x].type == "boolean") {
                s += "<"+prefix+x+">"+
                    (args[x] ? "true" : "false")+
                    "</"+prefix+x+">";
            } else if (type_object[x].type == "integer") {
                s += "<"+prefix+x+">"+
                    args[x].toString()+
                    "</"+prefix+x+">";
            } else {
                throw new Error("Unsupported type "+type_object[x]);
            }
        }
        //__loginf("argsToXML result="+s);
        return s;
    };


    WSDLObject.prototype.makeSoapEnvelope = function(method, args) {
        var targetNamespace = this.doc.documentElement.
            getAttribute("targetNamespace");

        var env = "<?xml version=\"1.0\" encoding=\"utf-8\"?>"+
            "<soap-env:Envelope"+
            " xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\""+
            " xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\""+
            " xmlns:soap-env=\"http://www.w3.org/2003/05/soap-envelope\"";
        for (var x in this.nsTable) {
            env += " xmlns:"+x+"=\""+this.nsTable[x]+"\"";
        }
        env += ">";
        var prefix = this.reverseNsTable[targetNamespace] ?
            this.reverseNsTable[targetNamespace]+":" : "";
        var suffix = this.reverseNsTable[targetNamespace] ?
            ":"+this.reverseNsTable[targetNamespace] : "";
        env += "<soap-env:Body>"+
            "<"+prefix+method+" xmlns"+suffix+"=\""+targetNamespace+"\">"+
            this.argsToXML(method, args)+
            "</"+prefix+method+"></soap-env:Body>"+
            "</soap-env:Envelope>";

        return env;
    };
        
    WSDLObject.prototype.parseRetObject = function(method, xml) {
        var m = this.methods[method];
        if (!m || !m.output)
            return null;        // no response is assumed
        
        var type_object = m.output.typeObject;
        var rv = {};

        // var nsTable = new Object();
        // var reverseNsTable = new Object();
        // var atts = xml.documentElement.attributes;
        // for (var i = 0; i < atts.length; i++) {
        //     if (/^xmlns:(.*)$/.test(atts[i].name)) {
        //         nsTable[RegExp.$1] = atts[i].value;
        //         reverseNsTable[atts[i].value] = RegExp.$1;
        //     }
        // }
        
        // var resolveNS = function(prefix) {
        //     return nsTable[prefix];
        // };
        
        var tns = this.doc.documentElement.getAttribute("targetNamespace");
        for (var x in type_object) {
            var n = xml.getElementsByTagNameNS(tns, x);
            if (!n.length) {
                throw new Error("No value for parameter "+x+" in response");
            }
            var param = n[0];
            var value = param.textContent;
            if (type_object[x].type == "string") {
                rv[x] = value;
            } else if (type_object[x].type == "boolean") {
                rv[x] = /^\s*true\s*$/.test(value);
            } else if (type_object[x].type == "integer") {
                rv[x] = Number(value);
            } else {
                throw new Error("Data type "+type_object[x].type+
                                " is not supported");
            }
        }

        // __loginf("return value="+rv.toSource());
        return rv;
    };

    WSDLObject.prototype.invoke = function(method, args, callback) {
        // console.log("WSDLObject.invoke, method="+method+", args="+
        //             JSON.stringify(args));
        try {
            var m = this.methods[method];
            if (!m)
                throw Error("No "+method+" method found");

            var req = new XMLHttpRequest();
            req.open('POST', this.url, true);
            var self = this;
            req.onreadystatechange = function() {
                if (req.readyState == 4) {
                    if(req.status == 200) {
                        try {
                            // console.log("response="+req.responseText);
                            var rv = self.parseRetObject(
                                method, req.responseXML
                            );
                            callback(rv);
                        } catch(e) {
                            callback(null, e);
                        }
                    } else {
                        var err = new Error("Method "+method+" call failed"+
                                            ", status: "+req.statusText+
                                            " ("+req.status+")");
                        callback(null, err);
                    }
                }
            };
            var targetNamespace = this.doc.documentElement.
                getAttribute("targetNamespace");
            req.setRequestHeader("SOAPAction", targetNamespace+method);
            req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
            
            var env = this.makeSoapEnvelope(method, args);
            // __loginf("WSDLObject.invoke request="+env);
            req.send(env);
            
        } catch(e) {
            callback(null, e);
        }
    };
    

    function retrieveWSDL(ws_url, callback) {
        var url = ws_url;
        if (!/\?WSDL$/.test(url))
            url += "?WSDL";
        var req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                if(req.status == 200) {
                    try {
                        var wsdl = new WSDLObject(ws_url, req.responseXML);
                        WSDL_cache[ws_url] = wsdl;
                        callback(wsdl);
                    } catch(e) {
                        callback(null, e);
                    }
                } else {
                    var err = new Error("Request failed status: "+
                                        req.statusText+" ("+req.status+")");
                    callback(null, err);
                }
            }
        };

        req.send(null);
    }


    function SOAPClientImp(){}
    
    SOAPClientImp.prototype.invoke = function(ws_url, method, args, callback) {
        var wsdl = WSDL_cache[ws_url];
        if (!wsdl) {
            retrieveWSDL(ws_url, function(_wsdl, err) {
                if (!_wsdl && err) {
                    callback(null, err);
                } else {
                    _wsdl.invoke(method, args, callback);
                }
            });
        } else {
            wsdl.invoke(method, args, callback);
        }
    };

    return new SOAPClientImp();
}) ();
