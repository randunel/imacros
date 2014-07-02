
/*
(C) Copyright 2014 iOpus Software GmbH - http://www.iopus.com
*/


// Provides access to files using Native Messaging Host technology


var afio = (function () {
    const fio_host = "com.iopus.imacros.fio";

    function NodeObject(transferrable_node) {
        if (!transferrable_node || !transferrable_node._path)
            throw new Error("NodeObject can not be constructed");
        this._path = transferrable_node._path;
        if (typeof(transferrable_node._is_dir_int) != "undefined")
            this._is_dir_int = transferrable_node._is_dir_int;
    };

    NodeObject.prototype.__defineGetter__("path", function() {
        return this._path;
    });

    NodeObject.prototype.__defineGetter__("leafName", function() {
        // special treatment of root dir or drive letters
        if (__is_windows()) {
            if (/^[a-z]:\\?$/i.test(this._path))
                return "";
        } else {
            if (this._path == "/")
                return "";
        }
        
        return this._path.split(__psep()).pop();
    });

    NodeObject.prototype.__defineGetter__("parent", function() {
        // special treatment of root dir or drive letters
        // return the node itself
        if (__is_windows()) {
            if (/^[a-z]:\\?$/i.test(this._path))
                return new NodeObject(this);
        } else {
            if (this._path == "/")
                return new NodeObject(this);
        }

        var a = this._path.split(__psep()); a.pop();

        return new NodeObject({_path: a.join(__psep())});
    });

    NodeObject.prototype.__defineGetter__("isDirCached", function() {
        return typeof(this._is_dir_int) != "undefined";
    });

    NodeObject.prototype.__defineGetter__("is_dir", function() {
        return this._is_dir_int;
    });

    // callback(boolean result, [optional] Error e)
    NodeObject.prototype.exists = function(callback) {
        var req = {method: "node_exists", node: this};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;

            if (chrome.runtime.lastError)
                callback(false, chrome.runtime.lastError);
            else
                callback(result.exists);
        });
    };

    
    // callback(boolean result, [optional] Error e)
    NodeObject.prototype.isDir = function(callback) {
        if (this.isDirCached) {
            callback(this.is_dir);
            return;
        }
        var req = {method: "node_isDir", node: this};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;

            if (chrome.runtime.lastError)
                callback(false, chrome.runtime.lastError);
            else
                callback(result.isDir);
        });
    };

    // callback(boolean result, [optional] Error e)
    NodeObject.prototype.isWritable = function(callback) {
        var req = {method: "node_isWritable", node: this};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;

            if (chrome.runtime.lastError)
                callback(false, chrome.runtime.lastError);
            else
                callback(result.isWritable);
        });
    };

    // callback(boolean result, [optional] Error e)
    NodeObject.prototype.isReadable = function(callback) {
        var req = {method: "node_isReadable", node: this};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;

            if (chrome.runtime.lastError)
                callback(false, chrome.runtime.lastError);
            else
                callback(result.isReadable);
        });
    };


    // append part of the name
    NodeObject.prototype.append = function(bit) {
        while (bit[0] == __psep())
            bit = bit.substring(1);
        this._path += this._path[this._path.legnth-1] == __psep() ?
            bit : __psep()+bit;
    };

    NodeObject.prototype.clone = function() {
        return new NodeObject(this);
    };

    // copyTo(NodeObject dest)
    // callback([optional] Error e)
    NodeObject.prototype.copyTo = function(node, callback) {
        if (!node) {
            callback(new Error("NodeObject.copyTo() no dest node provided"));
            return;
        }
        var req = {method: "node_copyTo", src: this, dst: node};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;

            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }

            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }

            callback();
        });
    };


    // moveTo(NodeObject dest)
    // callback([optional] Error e)
    NodeObject.prototype.moveTo = function(node, callback) {
        if (!node) {
            callback(new Error("NodeObject.moveTo() no dest node provided"));
            return;
        }
        var req = {method: "node_moveTo", src: this, dst: node};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;

            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }

            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }

            callback();
        });
    };


    // remove()
    // callback([optional] Error e)
    NodeObject.prototype.remove = function(callback) {
        var req = {method: "node_remove", node: this};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }

            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }

            callback();
        });
    };



    // afio implementation
    var obj = {};

    /* Quick test for the availability of the host */
    obj.isInstalled = function(callback) {
        var req = {method: "isInstalled"};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError)
                callback(false, chrome.runtime.lastError);
            else
                callback(true);
        });
    };


    /*
      openNode(String path)
    */
    obj.openNode = function(path) {
        if (!path) throw new Error("afio.openNode() no path provided");
        return new NodeObject({_path: path});
    };


    /*
      readTextFile(NodeObject node, readTextFileCallback callback)
        returns the content of for the given node object or error in case file
        can not be read.

      readTextFileCallback is a function with the following signature
        function(String data, [optional] Error err)
    */
    obj.readTextFile = function(node, callback) {
        if (!node) {
            callback(undefined,
                     new Error("afio.readTextFile() no file node provided"));
            return;
        }
        var req = {method: "readTextFile", node: node};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }

            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }
            
            callback(result.data);
        });
    };


    /*
     writeTextFile(NodeObject node, String data, writeTextFileCallback callback)
        calls callback with no arguments on success

      writeTextFileCallback is a function with the following signature
        function([optional] Error err)
    */

    obj.writeTextFile = function(node, data, callback) {
        if (!node) {
            callback(new Error("afio.writeTextFile() no file node provided"));
            return;
        }
        var req = {method: "writeTextFile", node: node, data: (data || "")};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }

            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }
            
            callback();
        });
    };

    /*
      appendTextFile(NodeObject node, String data,
                     appendTextFileCallback callback)
        calls callback with no arguments on success

      appendTextFileCallback is a function with the following signature
        function([optional] Error err)
    */

    obj.appendTextFile = function(node, data, callback) {
        if (!node) {
            callback(new Error("afio.appendTextFile() no file node provided"));
            return;
        }
        var req = {method: "appendTextFile", node: node, data: (data || "")};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;

            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }

            if (result.error) {
                if (!callback || typeof callback != "function")
                    return;
                callback(undefined, new Error(result.error));
                return;
            }
            
            callback();
        });
    };


    /*
     getNodesIndir(NodeObject node, [optional] String filter,
                   getNodesInDirCallback callback)
        returns an array of nodes representing directory listing.

      getNodesInDirCallback is a function with the following signature
        function(array of NodeObject nodes, [optional] Error err)
    */
    obj.getNodesInDir = function(node, filter, callback) {
        if (!node) {
            callback(undefined,
                     new Error("afio.getNodesInDir() no file node provided"));
            return;
        }
        node.isDir(function(is_dir) {
            if (!is_dir) {
                callback(
                    undefined,
                    Error("afio.getNodesInDir() node is not a directory")
                );
                return;
            }
            var req = {method: "getNodesInDir", node: node};
            if (typeof filter == "string")
                req.filter = filter;
            else if (typeof filter == "function")
                callback = filter;
            chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
                if (!callback || typeof callback != "function")
                    return;

                if (chrome.runtime.lastError) {
                    callback(undefined, chrome.runtime.lastError);
                    return;
                }

                if (result.error) {
                    if (!callback || typeof callback != "function")
                        return;
                    callback(undefined, new Error(result.error));
                    return;
                }
                callback(result.nodes.map(function(x) {
                    return new NodeObject(x);
                }));
            });

        });
    };

    /*
     getLogicalDrives(getLogicalDrivesCallback callback)
        returns an array of nodes representing root logical drives on Windows
        or just an array containing single element "/" for *nix system.

      getLogicalDrivesCallback is a function with the following signature
        function(array of NodeObject nodes, [optional] Error err)
    */
    obj.getLogicalDrives = function(callback) {
        var req = {method: "getLogicalDrives"};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }

            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }
            
            callback(result.nodes.map(function(x) {return new NodeObject(x);}));
        });
    };


    /*
     getDefaultDir(String name, getDefaultDirCallback callback)
        returns a node for the corresponding default dir or null if
        it hasn't been set yet.
     getDefaultDirCallback(NodeObject node, [optional] Error err)
    */
    obj.getDefaultDir = function(name, callback) {
        if (!/^(?:downpath|datapath|logpath|savepath)$/.test(name)) {
            if (!callback || typeof callback != "function")
                return;
            callback(undefined,
                     new Error("afio.getDefaultDir() wrong dir name "+name));
            return;
        }

        if (localStorage["def"+name]) {
            if (!callback || typeof callback != "function")
                return;
            callback(this.openNode(localStorage["def"+name]));
            return;
        }

        // not initialized yet, so we have to ask host to do that
        var req = {method: "getDefaultDir", name: name};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }
            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }
            callback(new NodeObject(result.node));
        });
    };

    /*
     makeDirectory(NodeObject node, makeDirectoryCallback callback)
        calls callback with no arguments on success
     makeDirectoryCallback([optional] Error err)
    */
    obj.makeDirectory = function(node, callback) {
        if (!node) {
            if (!callback || typeof callback != "function")
                return;
            callback(
                new Error("afio.makeDirectory() node is not provided")
            );
            return;
        }

        var req = {method: "makeDirectory", node: node};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError) {
                callback(undefined, chrome.runtime.lastError);
                return;
            }
            
            if (result.error) {
                callback(undefined, new Error(result.error));
                return;
            }
            
            callback();
        });
    };

    /*
     writeImageToFile(NodeObject node, imageDataType imageData,
                      writeImageToFileCallback callback)
     imageDataType is
       {
        image: <base64 encoded string>,
        encoding: <encoding type, now only base64 supported>,
        mimeType: <image MIME type>
       };
     calls callback with no arguments on success
     writeImageToFileCallback([optional] Error err)
    */
    obj.writeImageToFile = function(node, data, callback) {
        if (!node) {
            if (!callback || typeof callback != "function")
                return;
            callback(
                new Error("afio.writeImageToFile() node is not provided")
            );
            return;
        }

        if (!data || !data.image || !data.encoding || !data.mimeType) {
            if (!callback || typeof callback != "function")
                return;
            callback(
                new Error("afio.writeImageToFile() imageData is "+
                          "not provided or has wrong type")
            );
            return;
        }

        var req = {method: "writeImageToFile", node: node, imageData: data};
        chrome.runtime.sendNativeMessage(fio_host, req, function(result) {
            if (!callback || typeof callback != "function")
                return;
            if (chrome.runtime.lastError) {
                callback(chrome.runtime.lastError);
                return;
            }
            
            callback();
        });
    };


    return obj;
}) ();
