/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, Mustache */

// Handles status bar interactions 
define(function (require, exports) {
    "use strict";
    
    var CommandManager = brackets.getModule("command/CommandManager"),
        CodeMirror     = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        ExCommandHistory = require("./ExCommandHistory"),
        cm,
        callback,
        $dialog,
        $input,
        inHistory;
    
    /**     
     * Setup Vim status bar, hook events and setup ExCommand history.
     * @param {CodeMirror} _cm The current CodeMirror instance.
     */
    function init(_cm) {
        cm = _cm;
        _attachVimderbar(cm);
        $dialog = $("#vimderbar");
        $input = $dialog.children("#command");
        $input.on("keydown", function (e) {
            var keyName = CodeMirror.keyName(e);
            var commandVal = $input.val();
            if (keyName === "Up" || keyName === "Down") {
                if (!inHistory && commandVal !== "") {
                    // stash current command if exists so you can get back to it
                    ExCommandHistory.add(commandVal);
                }
                if (keyName === "Up") {
                    $input.val(ExCommandHistory.getPrevHistoryItem());
                } else {
                    $input.val(ExCommandHistory.getNextHistoryItem());
                }
                inHistory = true;
            } else if (e.keyCode === 13 || keyName === "Enter") {
                CodeMirror.e_stop(e);
                ExCommandHistory.add(commandVal);
                cm.focus();
                callback(commandVal);
            } else if (keyName === "Esc" || keyName === "Ctrl-C" || keyName === "Ctrl-[") {
                CodeMirror.e_stop(e);
                $input.blur();
                cm.focus();
            }
        });
        $input.on("blur", function () {
            $input.val("");
            $input.hide();
            $dialog.children("#command-sign").text("");
            $dialog.children("#command-info").text("");
            if (!$dialog.children("#confirm").is(":visible")) { // if #confirm hidden, show mode
                $dialog.children("#mode").show();
            }
            inHistory = false;
            ExCommandHistory.exitHistory();
            cm.focus();
        });
        ExCommandHistory.init();
    }
    /**     
     * Wipe out project command history.
     */
    function resetHistory() {
        // TODO: clean out localStorage
        ExCommandHistory.resetHistory();
    }
    /**     
     * Attach Vim functions to current CodeMirror instance,
     * add watch for mode changes on current instance.
     * @param {CodeMirror} _cm The current CodeMirror instance.
     */
    function _attachVimderbar(cm) {
        // this should use CodeMirror.defineExtension but
        // we're too late to change the prototype when Dialog is loaded
        cm.openDialog = CodeMirror.openDialog;
        cm.updateVimStatus = CodeMirror.updateVimStatus;
        cm.clearVimCommandKeys = CodeMirror.clearVimCommandKeys;
        cm.updateVimCommandKeys = CodeMirror.updateVimCommandKeys;
        
        cm.on("vim-mode-change", function (event) {
            var mode = event.mode;
            CodeMirror.updateVimStatus(mode);
        });
    }
    /**     
     * Change current editor instance to cm.
     * @param {CodeMirror} _cm The current CodeMirror instance.
     */
    function changeDocument(cm) {
        if (cm) {
            _attachVimderbar(cm);
        }
    }
    /**     
     * Open command dialog overlay in status bar.
     * @param {String} template Template HTML for dialog, generated by CodeMirror Dialog.
     */
    function openDialog(template, _callback) {
        callback = _callback;
        // grab shortText out of the provided template
        // TODO: this could be brittle, is the template format going to change?
        var shortText = $(Mustache.render(template))[0].innerHTML;
        if (shortText === null) { // dealing with Macros
            $dialog.children("#mode").html(template);
            return function (closing) {
                if (closing) {
                    return false;
                } else {
                    return true;
                }
            };
        } else if (shortText[0] === "/") {
            // "/" and "?" search used to be integrated with the Vim.js file and
            // the status bar, but I think the native Brackets search is much more
            // efficient. @ff.
            CommandManager.execute("edit.find");
            return;
        }
        var closed = false;
        function close() {
            if (closed) {
                return;
            }
            closed = true;
            // dialog.something;
        }
        $input.show();
        $input.focus();
        $dialog.children("#command-sign").text(shortText[0]);
        $dialog.children("#mode").hide();
        $dialog.children("#confirm").hide();
        return close;
    }
    /**
     * Change mode in status bar.
     * @param {String} mode Current Vim mode.
     */
    function updateVimStatus(mode) {
        if ($dialog) {
            $dialog.children("#mode").show();
            $dialog.children("#confirm").hide();
            $dialog.children("#mode").text("-- " + mode + " --");
        }
    }
    /**
     * Add key to command status so user knows what they are typing.
     * @param {String} key Text to be appended to current command.
     */
    function updateVimCommandKeys(key) {
        if (key !== "?") {
            $dialog.children("#command-keys").append(key);
        }
    }
    /**
     * Clear current command from status bar.
     */
    function clearVimCommandKeys() {
        $dialog.children("#command-keys").text("");
    }
    
    CodeMirror.openDialog = openDialog;
    CodeMirror.updateVimStatus = updateVimStatus;
    CodeMirror.updateVimCommandKeys = updateVimCommandKeys;
    CodeMirror.clearVimCommandKeys = clearVimCommandKeys;
    
    exports.init = init;
    exports.changeDocument = changeDocument;
    exports.resetHistory = resetHistory;
});
