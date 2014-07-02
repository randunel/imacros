/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/



// class names for tree functions in mktree.js
var treeClass = "tree";
var nodeClosedClass = "folderClosed";
var nodeOpenClass = "folderOpen";
var nodeBulletClass = "macro";
var nodeLinkClass = "bullet";


window.addEventListener("DOMContentLoaded", function (event) {
    // prevent right-click on tree
    $("tree").oncontextmenu = function() {return false;};
    
    ContextMenu.init();
    // add context menu item listeners
    $("context-edit").addEventListener("click", function() {
        ContextMenu.edit();
    });
    $("context-convert").addEventListener("click", function() {
        ContextMenu.convert();
    });
    $("context-makedir").addEventListener("click", function() {
        ContextMenu.makedir();
    });
    $("context-rename").addEventListener("click", function() {
        ContextMenu.rename();
    });
    $("context-delete").addEventListener("click", function() {
        ContextMenu.remove();
    });
    $("context-refresh").addEventListener("click", function() {
        ContextMenu.refresh();
    });

    $('afio-installer-link').addEventListener("click", function() {
        var bg = chrome.extension.getBackgroundPage();
        bg.link("http://wiki.imacros.net/iMacros_for_Chrome#Installation");
    });

    $('imacros-ie-link').addEventListener("click", function() {
        var bg = chrome.extension.getBackgroundPage();
        bg.link("http://imacros.net/download");
    });

    $('imacros-firefox-link').addEventListener("click", function() {
        var bg = chrome.extension.getBackgroundPage();
        bg.link("http://wiki.imacros.net/iMacros_for_Firefox");
    });
    
    afio.isInstalled(function(installed) {
        if (!installed) {
            $('no-file-io-message').removeAttribute("hidden");
            return;
        }
        var msg = $('loading_message');
        msg.removeAttribute('hidden');
        TreeView.build();
        msg.setAttribute('hidden', true);
        checkMacroSelected();
    });
    
}, true);


var TreeView = {
    
    // predicate for sorting nodes
    sortPredicate: function(a, b) {
        // string compare function to sort nodes
        var node_compare = function (a, b) {
            var la = a.leafName.toLowerCase(),
                lb = b.leafName.toLowerCase();
            var bound = Math.min(la.length, lb.length);
            for (var i = 0; i < bound; i++) {
                var l = la.charAt(i), r = lb.charAt(i), x;
                if (l == r)
                    continue;
                // '#'-symbol preceeds others
                if (l == "#")
                    return -1;
                else if (r == "#")
                    return 1;
                else if (x = l.localeCompare(r))
                    return x;
            }
            return la.length - lb.length; // longer string is greater
        };
        if (a.is_dir && !b.is_dir) {
	    return -1; 		// a dir always preceeds a file
        } else if (!a.is_dir && b.is_dir) {
	    return 1;
        } else {
	    return node_compare(a, b);
        }
    },

    // build tree from iMacros Macros folder
    build: function () {
        var tree = $("tree");
        // clear tree
        while (tree.firstChild)
            tree.removeChild(tree.firstChild);
        afio.getDefaultDir("savepath", function(root, err) {
            if (err) {console.error(err); return;}
            TreeView.buildSubTree(root);
        });
    },

    // macro tree builder
    buildSubTree: function (root_node, parent, callback) {
        if (!parent) {
            parent = $("tree");
            // drag and drop support
            parent.addEventListener("drop", 
                            TreeView.onDragDrop.bind(TreeView), false);
        }
        var span = document.createElement("span");
        var li = document.createElement("li");
        
        span.className = "bullet";
        li.appendChild(span);
        parent.appendChild(li);

        // drag and drop support
        span.addEventListener("dragstart",
                              TreeView.onDragStart.bind(TreeView), false);
        span.addEventListener("dragover", 
                              TreeView.onDragOver.bind(TreeView), false);
        span.addEventListener("dragenter", 
                              TreeView.onDragEnter.bind(TreeView), false);
        span.addEventListener("dragleave", 
                              TreeView.onDragLeave.bind(TreeView), false);

        span.setAttribute("draggable", "true");
        
        root_node.isDir( function(is_dir, err) {  // if node is folder
            if (err) {console.error(err); return;}
            if (is_dir) {
                li.className = parent.id == "tree" ?
                    "folderOpen" : "folderClosed";
                span.setAttribute("type", "folder");
                var ul = document.createElement("ul");
                li.appendChild(ul);
                span.addEventListener(
                    "dblclick", 
                    TreeView.onFolderDblClick.bind(TreeView)
                );
                span.addEventListener(
                    "mousedown",
                    TreeView.onFolderMouseDown.bind(TreeView)
                );
                span.innerHTML = root_node.leafName;
                span.setAttribute("file_id", root_node.path);

                afio.getNodesInDir(root_node, "*.iim", function(nodes, err) {
                    if (err) {console.error(err); return;}
                    // We need to sort array
                    nodes.sort(TreeView.sortPredicate);

                    for (var x = 0; x < nodes.length; x++)
                        TreeView.buildSubTree(nodes[x], ul);
                });
                if (callback) callback(li);
            } else {                // node is macro
                li.className = "macro";
                span.setAttribute("type", "macro");
                span.innerHTML = root_node.leafName;
                span.setAttribute("file_id", root_node.path);
                span.addEventListener("click", function(evt) {
                    TreeView.selectItem(evt.target);
                    evt.preventDefault();
                    evt.stopPropagation();
                }, true);
                span.addEventListener("dblclick", function(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    setTimeout(function() { window.top.play(); }, 200);
                }, true);

                if (callback) callback(li);
            }
        });
    },


    onFolderDblClick: function(event) {
        var el = event.target;
        el.parentNode.className =
            (el.parentNode.className == nodeOpenClass) ?
            nodeClosedClass : nodeOpenClass;
        return false;
    },

    onFolderMouseDown: function(event) {
        this.selectedItem = {
            element: event.target,
            li: event.target.parentNode,
            type: "folder"
        };
    },

    selectItem: function (element) {
        var bg = chrome.extension.getBackgroundPage();
        try {                
            // evaluate XPath to find all elements
            // with attribute selected="true"
            var xpath = "id('tree')//span[@selected='true']";
            var result = document.evaluate(xpath, document, null,
                XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            var node = null, nodes = new Array();
            while (node = result.iterateNext()) {
                nodes.push(node);
            }
            nodes.forEach(function(x) {
                // remove selection
                x.removeAttribute("selected");
            });
        } catch (e) {
            console.error(e);
        }
        
        element.setAttribute("selected", true);
        this.selectedItem = {
            element: element,
            li: element.parentNode,
            type: element.getAttribute("type")
        };
        if (this.selectedItem.type == "macro") {
            var div = $("imacros-bookmark-div");
            if (div.hasAttribute("bookmark_id"))
                div.removeAttribute("bookmark_id");
            div.setAttribute("file_id", element.getAttribute("file_id"));
            div.setAttribute("name", element.textContent);
            checkMacroSelected();
        }
    },

    onDragStart: function(event) {
        var dt = event.dataTransfer, el = event.target;
        if (el.tagName.toLowerCase() != "span")
            return;
        var drag_data = {
            type: el.parentNode.className == "macro"? "macro" : "folder",
            name: el.textContent,
            file_id: el.getAttribute("file_id")
        };

        dt.setData("text/plain", JSON.stringify(drag_data));
        dt.effectAllowed = "move";
        // console.log("onDragStart, data="+JSON.stringify(drag_data));
    },

    onDragOver: function(event) {
        event.preventDefault();
    },

    onDragEnter: function(event) {
        var dt = event.dataTransfer, el = event.target;
        var li = el.parentElement;
        el.setAttribute("dragging_over", "true");

        if (li.className == "folderClosed" &&
            !li.hasAttribute("drag_opening"))
        {
            li.setAttribute("drag_opening", "true");
            if (this.openTimeout) {
                clearTimeout(this.openTimeout);
                this.openTimeout = null;
            }
            this.openTimeout = setTimeout(function() {
                li.className = "folderOpen";
                li.removeAttribute("drag_opening");
                li.setAttribute("drag_open", "true");
            }, 700);
        } 
        event.preventDefault();
    },

    onDragLeave: function(event) {
        var dt = event.dataTransfer, el = event.target;
        var li = el.parentElement;
        el.removeAttribute("dragging_over");
        if (li.hasAttribute("drag_opening")) {
            if (this.openTimeout) {
                clearTimeout(this.openTimeout);
                li.removeAttribute("drag_opening");
                this.openTimeout = null;
            }
        }
        event.preventDefault();
    },

    onDragDrop: function(event) {
        var el = event.target, dt = event.dataTransfer;
        var li = el.parentElement;

        // if (li.hasAttribute("drag_opening")) {
        //     li.removeAttribute("drag_opening");
        // }
        // if (li.hasAttribute("drag_open")) {
        //     if (li.className == "folderOpen")
        //         li.className = "folderClosed";
        //     li.removeAttribute("drag_open");
        // }
        // if (this.openTimeout) {
        //     clearTimeout(this.openTimeout);
        //     this.openTimeout = null;
        // }
        el.removeAttribute("dragging_over");
        if (!el.hasAttribute("file_id"))
            el = el.firstElementChild;
        var drag_data = JSON.parse(dt.getData("text/plain"));
        try {
            // console.log("drag_data.file_id="+drag_data.file_id+
            //             ", el.file_id="+el.getAttribute("file_id"));
            var src = afio.openNode(drag_data.file_id);
            var dst = afio.openNode(el.getAttribute("file_id"));
            if (dst.isDir) {
                src.moveTo(dst);
            } else {
                src.moveTo(dst.parent);
            }
            this.build();
        } catch (e) {
            console.error(e);
        }
        event.preventDefault();

        return false;
    }
};





// simulate left mouse click on element
// TODO: code duplicates method in content_script/player.js
function simulateClick(element) {
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
}

function checkMacroSelected() {
    var count = 0;
    try {                
        // evaluate XPath to calculate all elements
        // with attribute selected="true"
        var xpath = "count(id('tree')//span[@selected='true' and @type='macro'])";
        count = document.evaluate(xpath, document, null,
            XPathResult.NUMBER_TYPE, null);
        count = count.numberValue;
    } catch (e) {
        console.error(e);
    }
    window.top.onSelectionChanged(count != 0);
}


// context menu handler
var ContextMenu = {
    mouseover: false,
    init: function() {
        this.menu = $("context-menu");
        this.onMouseOver = function(e) { this.mouseOverContext = true };
        this.onMouseOut = function(e) { this.mouseOverContext = false };
        this.menu.addEventListener("mouseover", this.onMouseOver.bind(this));
        this.menu.addEventListener("mouseout", this.onMouseOut.bind(this));
        document.body.onmousedown = this.onMouseDown.bind(this);
        document.body.oncontextmenu = this.onContextMenu.bind(this);
    },

    onMouseDown: function(event) {
        if (this.mouseOverContext)
            return;
        var applicable = event.target.tagName.toLowerCase() == "span";
        if (event.button == 2 && applicable) {
            var element = event.target, type = "";
            if (element.parentElement.tagName.toLowerCase() == "li") {
                type = element.getAttribute("type");
            } else {
                console.error("onMouseDown, span outside of tree structure");
                return;         // should never happen
            }
            this.adjustMenu(element, type);
            this.showContext = true;
        } else if (!this.mouseOverContext) {
            this.menu.style.display = "none";
        }
    },
    
    adjustMenu: function(element, type) {
        if (type == "macro") {
            $("context-edit").style.display = "block";
            $("context-convert").style.display = "block";
                    simulateClick(element);
        } else if (type == "folder") {
            $("context-edit").style.display = "none";
            $("context-convert").style.display = "none";
        }
    },

    onContextMenu: function(event) {
          if (!this.showContext)
            return true;    // TODO: return false if not in debug mode

        this.menu.style.left = "0px";
        this.menu.style.top = "0px";
        this.menu.removeAttribute("hidden");
        this.menu.style.display = "block";

        // calculate context menu position
        var clientWidth = document.body.clientWidth;
        var clientHeight = document.body.clientHeight;
        var scrollLeft = document.body.scrollLeft;
        var scrollTop = document.body.scrollTop;
        
        var rect = this.menu.getBoundingClientRect();
        var menuWidth = rect.width;
        var menuHeight = rect.height;
        var contextLeft = event.pageX - 20;
        var contextTop = event.pageY - 10;


        if (contextLeft+menuWidth > scrollLeft+clientWidth)
            contextLeft = scrollLeft+clientWidth-menuWidth;

        if (contextLeft < scrollLeft) 
            contextLeft = scrollLeft;

        if (contextTop+menuHeight > scrollTop+clientHeight)
            contextTop = scrollTop+clientHeight-menuHeight;

        if (contextTop < scrollTop)
            contextTop = scrollTop;
        
        this.menu.style.left = contextLeft.toString()+"px";
        this.menu.style.top = contextTop.toString()+"px";
        
        this.showContext = false;
        
        return false;
    },
      
    edit: function() {
        this.hide();
        window.top.edit();
    },

    _makedir_checkname: function(count, node, name) {
        var self = this;
        var dir = node.clone();
        dir.append(name+" ("+count+")");
        dir.exists(function(exists) {
            if (exists) {
                self._makedir_checkname(++count, node, name);
            } else {
                afio.makeDirectory(dir, function(err) {
                    if (err) {console.error(err); return;}
                    TreeView.build();
                });
            }
        });
    },

    makedir: function() {
        this.hide();
        var new_name = prompt("Enter new folder name", "New folder");
        var self = this;
        afio.getDefaultDir("savepath", function(node) {
            var dir = node.clone();
            dir.append(new_name);
            dir.exists(function(exists) {
                if (exists) {
                    self._makedir_checkname(1, node, new_name);
                } else {
                    afio.makeDirectory(dir, function(err) {
                        if (err) {console.error(err); return;}
                        TreeView.build();
                    });
                }
            });
        });
    },

    rename: function() {
        this.hide();
        var item = TreeView.selectedItem;
        if (!item) {
            alert("Error: no item selected"); // should never happen
            return;
        }
        var file_id = item.element.getAttribute("file_id");
        var old_name = item.element.textContent;
        var new_name = prompt("Enter new name", old_name);
        if (!new_name)
            return;
        if (item.type != "folder" && !/\.iim$/.test(new_name))
            new_name += ".iim";
        var node = afio.openNode(file_id);
        var new_node = node.parent;
        new_node.append(new_name);
        node.moveTo(new_node, function(err) {
            if (err) {console.error(err); alert(err); return;}
            // TODO: rebuild tree?
            if (item.type == "folder") {
                var parent = item.li.parentNode;
                parent.removeChild(item.li);
                TreeView.buildSubTree(new_node, parent, function(new_li) {
                    // we should find a new place for the folder
                    new_li = parent.removeChild(new_li);
                    var childNodes = parent.childNodes, referenceNode = null;
                    for (var i = 0; i < childNodes.length; i++) {
                        var name = childNodes[i].firstChild.textContent;
                        if (/^folder/.test(childNodes[i].className)) {
                            if (new_name < name) {
                                // should be inserted before that
                                referenceNode = childNodes[i];
                                break;
                            }
                        } else {    // if not folder li
                            referenceNode = childNodes[i];
                            break;
                        }
                    }
                    parent.insertBefore(new_li, referenceNode);
                });
            } else {
                item.element.innerHTML = new_name;
                item.element.setAttribute("file_id", new_node.path);
                TreeView.selectItem(item.element);
            }
        });
    },

    remove: function() {
        this.hide();
        var item = TreeView.selectedItem;
        if (!item) {
            alert("Error: no item selected");
            return;
        }
        var file_id = item.element.getAttribute("file_id");
        if (!file_id) {
            alert("Can not delete "+item.type+" "+item.element.textContent);
            return;
        }
        var yes = confirm("Are you sure you want to remove "+item.type+" "+
                          item.element.textContent+"?");
        if (!yes)
            return;

        var node = afio.openNode(file_id);
        node.remove(function(err) {
            if (err) {console.error(err); alert(err); return;}
            var parentNode = item.li.parentNode;
            parentNode.removeChild(item.li);
            TreeView.selectedItem = null;
        });
    },

    refresh: function() {
        this.hide();
        TreeView.build();
    },

    hide: function() {
        this.showContext = false;
        this.menu.style.display = "none";
        this.menu.setAttribute("hidden", "true");
    },

    convert: function() {
        this.hide();
        window.top.convert();
    }
};
