editAreaLoader.load_syntax["imacro"] = {
    COMMENT_SINGLE: {"1": "'"},
    COMMENT_MULTI: {},
    QUOTEMARKS: {"1": '"'},
    KEYWORD_CASE_SENSITIVE: false,
    KEYWORDS: {},
    OPERATORS: ["=", "&&", ":", "%", "$", "*"],
    DELIMITERS: ["{{", "}}"],
    REGEXPS: {
        command: {
            search: "(^\\s*)((?:add|back|clear|click|cmdline|disconnect|ds|extract|filedelete|filter|frame|imageclick|imagesearch|oncertificatedialog|ondialog|ondownload|onerrordialog|onlogin|onprint|onsecuritydialog|onwebpagedialog|pause|print|prompt|proxy|redial|refresh|saveas|set|size|stopwatch|tab|tag|url|version|wait|winclick|saveitem))(\\s*)",
            "class": "command",
            modifiers: "igm",
            execute: "before"
        },
        parameters: {
            search: "(\\s+)(x|y|content|name|type|status|t|pos|button|folder|file|wait|continue|user|password|id|form|attr|extract|goto|build|recorder|seconds|xpath)(\\s*=)",
            "class": "parameters",
            modifiers: "ig",
            execute: "before"
        },
        atts: {
            search: "((?:=\\s*|&&))([-\\w]+:)((?:\"(?:[^\"\\\\]+|\\\\[0btnvfr\"\'\\\\])*\"|\\S*))",
            "class": "atts",
            modifiers: "ig",
            execute: "before"
        },
        builtin_vars: {
            search: "(\\s*)(!(?:var[1-3]|encryption|imagefilter|downloadpdf|useragent|loop|extract|extractadd|extract_test_popup|errorignore|filestopwatch|datasource(?:_line|_columns)?|col\\d+|timeout|replayspeed|slow|medium|fast|singlestep))(\\b)",
            "class": "builtin_vars",
            modifiers: "ig",
            execute: "before"
        },
        escape_sequence: {
            search: "()(\\<(?:br|lf|sp)\\>)()",
            "class": "escape_sequence",
            modifiers: "ig",
            execute: "before"
        },
        constants: {
            search: "(=|\\s+)(yes|no|ok|cancel|storedkey|tmpkey|slow|medium|fast|images|cpl|mht|htm|txt|extract|png|jpeg|close|closeallothers|open|new)(\\b)",
            "class": "constants",
            modifiers: "ig",
            execute: "before"
        }
    },
    STYLES : {
        COMMENTS: 'color: #008000;',
        QUOTESMARKS: 'color: #6381F8;',
        KEYWORDS: {},
        OPERATORS: 'color: #FF00FF;',
        DELIMITERS: 'color: #0038E1;',
        REGEXPS: {
            builtin_vars: 'color: #8000FF;',
            command: 'color: #0000FF;',
            parameters: 'color: #800000;',
            escape_sequence: 'color: #2B60FF;',
            constants : 'color: #EE0000;'
        }	
    }
};
