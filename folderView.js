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
    afio.isInstalled(function(installed) {
        if (!installed) {
            document.body.innerHTML = "<p style='color:red'>"+
                "Install file access support first"+
                "</p>";
        } else {
            TreeView.build(window.top.args ? window.top.args.path : null);
            checkFolderSelected();
        }
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
                if (x = l.localeCompare(r))
                    return x;
            }

            return la.length - lb.length; // longer string is greater
        };

        return node_compare(a, b);
    },

    // build tree from iMacros bookmarks folder
    build: function (root) {
        var tree = $("tree");
        // clear tree
        while (tree.firstChild)
            tree.removeChild(tree.firstChild);
        
        if (root == "My Computer") {
            var li = document.createElement("li");
            var span = document.createElement("span");
            span.className = "parentFolder MyComputer";
            span.innerHTML = "My Computer";
            li.appendChild(span);
            tree.appendChild(li);
            afio.getLogicalDrives(function(drives, err) {
                if (err) {console.error(err); alert(err); return;}
                for (var i = 0; i < drives.length; i++) {
                    li = document.createElement("li");
                    li.className = "Disk";
                    span = document.createElement("span");
                    span.className = "bullet";
                    span.innerHTML = drives[i].path+
                        (drives[i].path[drives[i].path.length-1] == __psep() ?
                         "": __psep());
                    span.setAttribute("file_id", drives[i].path);
                    span.addEventListener("click", function(evt) {
                        TreeView.selectItem(evt.target);
                    });

                    span.addEventListener("dblclick", function(evt) {
                        setTimeout(function() {
                            TreeView.build(evt.target.getAttribute("file_id"));
                        }, 100);
                    });
                    li.appendChild(span);
                    tree.appendChild(li);
                }
            });

            return;
        } 
        afio.getDefaultDir("savepath", function(savepath, err) {
            if (err) {console.error(err); alert(err); return;}
            var root_node = root ? afio.openNode(root) : savepath;
            // while (!root_node.exists) {
            //     root_node = afio.openNode(root_node.parent.path);
            // }

            // make "Up" element first
            var parent_path = /^[A-Z]:\\?$/.test(root) ?
                "My Computer" : root_node.parent.path;

            var li = document.createElement("li");
            li.setAttribute("title", parent_path);
            var span = document.createElement("span");
            span.className = "parentFolder";
            span.addEventListener("dblclick", function() {
                TreeView.build(parent_path);
            });
            span.innerHTML = "..";
            li.appendChild(span);
            tree.appendChild(li);
            
            afio.getNodesInDir(root_node, ":is_dir", function(nodes) {
                // We need to sort array
                nodes.sort(TreeView.sortPredicate);
                for (var x = 0; x < nodes.length; x++) {
                    li = document.createElement("li");
                    li.className = "folderClosed";
                    li.setAttribute("title", nodes[x].path);
                    span = document.createElement("span");
                    span.className = "bullet";
                    span.innerHTML = nodes[x].leafName;
                    span.setAttribute("file_id", nodes[x].path);
                    span.addEventListener("click", function(evt) {
                        TreeView.selectItem(evt.target);
                    });

                    span.addEventListener("dblclick", function(evt) {
                        setTimeout(function() {
                            TreeView.build(evt.target.getAttribute("file_id"));
                        }, 100)
                    });
                    li.appendChild(span);
                    tree.appendChild(li);
                }
            });
        });
    },

    selectItem: function (element) {
        try {                
            // evaluate XPath to find all elements
            // with attribute selected="true"
            var xpath = "id('tree')//span[@selected='true']";
            var result = document.evaluate(xpath, document, null,
                XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            var node = null;
            while (node = result.iterateNext()) {
                // remove selection
                node.removeAttribute("selected");
            }
        } catch (e) {
            console.error(e);
        }

        $("path").value = element.getAttribute("file_id");
        checkFolderSelected();
        element.setAttribute("selected", "true");
    }
    
};

function checkFolderSelected() {
    var count = 0;
    try {                
        // evaluate XPath to calculate all elements
        // with attribute selected="true"
        var xpath = "count(id('tree')//span[@selected='true'])";
        count = document.evaluate(xpath, document, null,
            XPathResult.NUMBER_TYPE, null);
        count = count.numberValue;
    } catch (e) {
        console.error(e);
    }
}

