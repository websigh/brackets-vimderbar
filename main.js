/* 
 * Permission is hereby granted, free of charge, to any person 
 * obtaining a copy of this software and associated documentation 
 * files (the "Software"), to deal in the Software without 
 * restriction, including without limitation the rights to use, copy, 
 * modify, merge, publish, distribute, sublicense, and/or sell copies 
 * of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be 
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. 
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY 
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
 * OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache, localStorage */

define(function (require, exports, module) {
    "use strict";
    // Brackets modules
    var CommandManager      = brackets.getModule("command/CommandManager"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        Menus               = brackets.getModule("command/Menus"),
        AppInit             = brackets.getModule("utils/AppInit"),
        panelHtml           = require("text!templates/bottom-panel.html"),
        VimFix              = require('./src/VimFix'),
        CommandDialog       = require("./src/CommandDialog"),
        TOGGLE_VIMDERBAR_ID = "fontface.show-vimderbar.view.vimderbar",
        vimActive           = false,
        oldKeys,
        $vimderbar;

    /**
     * Initialize Vimderbar plugin; setup menu, load vim.js from CodeMirror, 
     * setup css and html, hook Document change, apply VimFix, and init CommandDialog
     */
    function init() {
        // Register function as command
        CommandManager.register("Enable Vimderbar", TOGGLE_VIMDERBAR_ID, toggleActive);
        // Add command to View menu, if it exists
        var view_menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        if (view_menu) {
            view_menu.addMenuItem(TOGGLE_VIMDERBAR_ID);
        }
        CommandManager.get(TOGGLE_VIMDERBAR_ID).setChecked(false);

        // import vim keymap from brackets source.
        brackets.libRequire(["thirdparty/CodeMirror2/keymap/vim"], function () {
            ExtensionUtils.loadStyleSheet(module, "styles/vimderbar.css");
            // Add the HTML UI
            $(".content").append(Mustache.render(panelHtml));
            // keep vimderbar off by default
            $vimderbar = $("#vimderbar");
            $vimderbar.hide();

            var activeEditor = EditorManager.getActiveEditor();
            if (activeEditor) {
                var cm = activeEditor._codeMirror;
                CommandDialog.init(cm);
                VimFix.init(cm, CommandDialog, {
                    enable: _enableVimderbar,
                    disable: _disableVimderbar
                });
                if (localStorage.getItem('vimderbarOn') === "true") {
                    _handleShowHideVimderbar();
                    CommandManager.get(TOGGLE_VIMDERBAR_ID).setChecked(true);
                }
            }

            // keep an eye on document changing so that the vim keyMap will apply to all files in the window
            // $(DocumentManager).on("currentDocumentChange", _handleShowHideVimderbar);
            $(EditorManager).on("activeEditorChange", _handleShowHideVimderbar);
        });
    }
    /**
     * @private
     * Set CodeMirror options to enable Vim.
     * @param {CodeMirror} cm Current CodeMirror editor instance.
     */
    function _enableVimderbar(cm) {
        // I know that _codeMirror is deprecated, but I couldn't get
        // this to work in any other way. Will continue to investigate.
        cm.setOption("extraKeys", null);
        cm.setOption("showCursorWhenSelecting", true);
        cm.setOption("keyMap", "vim");
    }
    /**
     * @private
     * Set CodeMirror options back to default.
     * @param {CodeMirror} cm Current CodeMirror editor instance.
     */
    function _disableVimderbar(cm) {
        cm.setOption("extraKeys", oldKeys);
        cm.setOption("showCursorWhenSelecting", false);
        cm.setOption("keyMap", "default");
    }
    /**
     * @private
     * Show Vimderbar status, enable Vimderbar on current CodeMirror instance.
     * @param {CodeMirror} cm Current CodeMirror editor instance.
     */
    function _showVimderbar(cm) {
        $vimderbar.show();
        CommandManager.get(TOGGLE_VIMDERBAR_ID).setChecked(true);
        VimFix.changeDocument(cm);
        CommandDialog.changeDocument(cm);
        cm.updateVimStatus("Normal");
        _enableVimderbar(cm);
        vimActive = true;
        localStorage.setItem("vimderbarOn", true);
    }
    /**
     * @private
     * Hide Vimderbar status, disable Vimderbar.
     * @param {CodeMirror} cm Current CodeMirror editor instance.
     */
    function _hideVimderbar(cm) {
        $vimderbar.hide();
        CommandManager.get(TOGGLE_VIMDERBAR_ID).setChecked(false);
        _disableVimderbar(cm);
        vimActive = false;
        localStorage.setItem("vimderbarOn", false);
        $(EditorManager).trigger({type: "vimderbarDisabled"});
    }
    /**
     * @private
     * Hide or show Vimderbar on active editor window based on localStorage
     */
    function _handleShowHideVimderbar() {
        var activeEditor = EditorManager.getActiveEditor();
        if (activeEditor) {
            var cm = activeEditor._codeMirror;
            if (cm !== null) {
                if (localStorage.getItem("vimderbarOn") === "true") {
                    _showVimderbar(cm);
                } else {
                    _hideVimderbar(cm);
                }
            }
        }
        EditorManager.resizeEditor();
    }
    /**
     * Toggle Vimderbar on and off.
     */
    function toggleActive() {
        if (localStorage.getItem("vimderbarOn") === "true") {
            localStorage.setItem("vimderbarOn", false);
        } else {
            localStorage.setItem("vimderbarOn", true);
        }
        _handleShowHideVimderbar();
    }
    AppInit.appReady(function () {
        init();
        oldKeys = EditorManager.getActiveEditor()._codeMirror.getOption("extraKeys");
    });
});
