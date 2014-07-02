/*
(c) Copyright 2009 iOpus Software GmbH - http://www.iopus.com
*/

// class names for tree functions in mktree.js
var treeClass = "tree";
var nodeClosedClass = "folderClosed";
var nodeOpenClass = "folderOpen";
var nodeBulletClass = "macro";
var nodeLinkClass = "bullet";


window.addEventListener("load", function (event) {
    // prevent right-click on tree
    $("tree").oncontextmenu = function() {return false;};
    TreeView.build();
    ContextMenu.init();
    
    // add context menu items listeners
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


    chrome.bookmarks.onChanged.addListener( function (id, x) {
        // TODO: listen to only iMacros descendants change
        window.location.reload();
    });
    chrome.bookmarks.onChildrenReordered.addListener( function (id, x) {
        // TODO: listen to only iMacros descendants change
        window.location.reload();
    });
    chrome.bookmarks.onCreated.addListener( function (id, x) {
        // TODO: listen to only iMacros descendants change
        window.location.reload();
    });
    chrome.bookmarks.onMoved.addListener( function (id, x) {
        // TODO: listen to only iMacros descendants change
        window.location.reload();
    });
    chrome.bookmarks.onRemoved.addListener( function (id, x) {
        // TODO: listen to only iMacros descendants change
        window.location.reload();
    });

    checkMacroSelected();

    // $("tree").oncontextmenu = function() {return false;};
}, true);


window.addEventListener("iMacrosRunMacro", function(evt) {
    $("imacros-bookmark-div").setAttribute("name", evt.detail.name);
    $("imacros-macro-container").value = evt.detail.source;
});

var TreeView = {
    // build tree from iMacros bookmarks folder
    build: function () {
        chrome.bookmarks.getTree( function (tree) {
            // first find iMacros subtree or create if not found
            // (code duplicates one in addToBookmarks(),
            // TODO: do something with that)
            var found = false,
                iMacrosFolderId = -1,
                bookmarksPanelId = tree[0].children[0].id;

            tree[0].children[0].children.forEach(function(child) {
                if (child.title == "iMacros") {
                    found = true;
                    iMacrosFolderId = child.id;
                }
            });

            if (!found) {
                chrome.bookmarks.create(
                    {
                        parentId: bookmarksPanelId,
                        title: "iMacros"
                    },
                    function (folder) {
                        iMacrosFolderId = folder.id;
                        TreeView.buildSubTree(iMacrosFolderId);
                    }
                );
            } else {
                TreeView.buildSubTree(iMacrosFolderId);
            }
        });
    },

    // macro tree builder
    buildSubTree: function (id, parent) {
        if (!parent) {
            parent = $("tree");
            parent.addEventListener("drop", 
                  TreeView.onDragDrop.bind(TreeView), false);
        }

        chrome.bookmarks.get(id, function (treeNodes) {
            var x = treeNodes[0];
            // skip non-macro bookmarks
            if (x.url && !/iMacrosRunMacro/.test(x.url))
                return;
                
            var span = document.createElement("span");
            var li = document.createElement("li");
            span.className = "bullet";
            li.appendChild(span);
            parent.appendChild(li);

            // drag and drop support
            span.setAttribute("draggable", "true");
            span.addEventListener("dragstart",
                     TreeView.onDragStart.bind(TreeView), false);
            span.addEventListener("dragover", 
                    TreeView.onDragOver.bind(TreeView), false);
            span.addEventListener("dragenter", 
                    TreeView.onDragEnter.bind(TreeView), false);
            span.addEventListener("dragleave", 
                    TreeView.onDragLeave.bind(TreeView), false);

            if (!x.url) {           // if x is folder
                li.className = parent.id == "tree" ?
                    "folderOpen" : "folderClosed";
                var ul = document.createElement("ul");
                li.appendChild(ul);
                span.setAttribute("type", "folder");
                span.addEventListener(
                    "dblclick", 
                    TreeView.onFolderDblClick.bind(TreeView)
                );
                span.addEventListener(
                    "mousedown",
                    TreeView.onFolderMouseDown.bind(TreeView)
                );
                span.innerHTML = x.title;
                span.setAttribute("bookmark_id", x.id);
                chrome.bookmarks.getChildren(x.id, function( children ) {
                    children.forEach( function (y) {
                        TreeView.buildSubTree(y.id, ul);
                    });
                });
            } else {                // x is macro
                li.className = "macro";
                span.setAttribute("type", "macro");
                span.setAttribute("bookmarklet", x.url);
                span.setAttribute("bookmark_id", x.id);
                span.innerHTML = x.title;

                span.addEventListener("click", function(evt) {
                    TreeView.selectItem(evt.target);
                    evt.preventDefault();
                }, true);

                span.addEventListener("dblclick", function(evt) {
                    setTimeout(function() { window.top.play(); }, 200);
                }, true);
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
            type: "macro"
        };
        var div = $("imacros-bookmark-div");
        if (div.hasAttribute("file_id"))
            div.removeAttribute("file_id");
        div.setAttribute("bookmark_id", element.getAttribute("bookmark_id"));
        div.setAttribute("name", element.textContent);
        var bookmarklet = element.getAttribute("bookmarklet");
        var m = /var e_m64 = "([^"]+)"/.exec(bookmarklet);
        if (!m) {
            console.error("Can not parse bookmarklet "+element.textContent);
            return;
        }
        $("imacros-macro-container").value = decodeURIComponent(atob(m[1]));
        checkMacroSelected();
    },


    onDragStart: function(event) {
        var dt = event.dataTransfer, el = event.target;
        // console.log("onDragStart, el="+el.localName);
        if (el.tagName.toLowerCase() != "span")
            return;

        if (el.getAttribute("type") == "macro") {
            var drag_data = {
                type: "macro",
                name: el.textContent,
                url: el.getAttribute("bookmarklet"),
                bookmark_id: el.getAttribute("bookmark_id")
            };
        } else if (el.getAttribute("type") == "folder") {
            var drag_data = {
                type: "folder",
                name: el.textContent,
                bookmark_id: el.getAttribute("bookmark_id")
            };
        }
        dt.setData("text/plain", JSON.stringify(drag_data));
        dt.effectAllowed = "move";
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
        // TODO: shall we close the folder when element is dragged out?
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
        // console.log("onDragDrop, el="+el.localName+", txt="+el.textContent);
        var drag_data = JSON.parse(dt.getData("text/plain"));
        el.removeAttribute("dragging_over");
        if (el.getAttribute("type") == "macro") {
            chrome.bookmarks.get(el.getAttribute("bookmark_id"), function(a) {
                chrome.bookmarks.move(
                    drag_data.bookmark_id,
                    { parentId: a[0].parentId, index: a[0].index+1 }
                );  
            });
        } else if (el.getAttribute("type") == "folder") {
            chrome.bookmarks.move(
                drag_data.bookmark_id,
                { parentId: el.getAttribute("bookmark_id"), index: 0 }
            );
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

    makedir: function() {
        this.hide();
        var new_name = prompt("Enter new folder name", "New folder");
        var root_id = $("tree").firstElementChild.firstElementChild.
            getAttribute("bookmark_id");
        chrome.bookmarks.getChildren(root_id, function(arr) {
            // add ...(n) to the folder name if such name already present
            var names = {}, count = 0, stop = false;
            for (var i = 0; i < arr.length; i++) {
                names[arr[i].title] = true;
            }
            while(!stop && count < arr.length+1) {
                if (names[new_name]) {
                    count++;
                    if (/\(\d+\)$/.test(new_name))
                        new_name = new_name.replace(/\(\d+\)$/, "("+count+")");
                    else
                        new_name += " ("+count+")";
                } else {
                    stop = true;
                }
            }
            chrome.bookmarks.create(
                {
                    parentId: root_id,
                    title: new_name
                },
                function (folder) {
                    TreeView.buildSubTree(folder.id);
                }
            );
        });
    },
    
    rename: function() {
        this.hide();
        var item = TreeView.selectedItem;
        if (!item) {
            alert("Error: no item selected"); // should never happen
            return;
        }
        var bookmark_id = item.element.getAttribute("bookmark_id");
        var old_name = item.element.textContent;
        var new_name = prompt("Enter new name", old_name);
        if (!new_name)
            return;
        if (item.type == "folder") {
            chrome.bookmarks.update(bookmark_id, {title: new_name});
        } else if(item.type == "macro") {
            chrome.bookmarks.get(bookmark_id, function (x) {
                var url = x[0].url;
                // change macro name in URL
                try {
                    var m = url.match(/, n = \"([^\"]+)\";/);
                    url = url.replace(/, n = \"[^\"]+\";/,
                        ", n = \""+encodeURIComponent(new_name)+"\";"
                    );
                } catch (e) {
                    console.error(e);
                }
                chrome.bookmarks.update(
                    bookmark_id, { title: new_name, url: url }
                );
            });
        }
    },

    remove: function() {
        this.hide();
        var item = TreeView.selectedItem;
        if (!item) {
            alert("Error: no item selected");
            return;
        }
        var bookmark_id = item.element.getAttribute("bookmark_id");
        if (!bookmark_id) {
            alert("Can not delete "+item.type+" "+item.element.textContent);
            return;
        }

        if (item.type == "macro") {
            chrome.bookmarks.remove(bookmark_id, function () {
                TreeView.selectedItem = null;
            });
        } else if (item.type == "folder") {
            var yes = confirm("Are you sure you want to remove folder "+
                              item.element.textContent+
                              " and all its contents?");
            if (yes)
                chrome.bookmarks.removeTree(bookmark_id, function() {
                    TreeView.selectedItem = null;
                });
        }
    },

    refresh: function() {
        window.location.reload();
    },
    
    hide: function() {
        this.showContext = false;
        this.menu.style.left = "0px";
        this.menu.style.top = "0px";
        this.menu.style.display = "none";
        this.menu.setAttribute("hidden", "true");
    },

    convert: function() {
        this.hide();
        window.top.convert();
    }
};
