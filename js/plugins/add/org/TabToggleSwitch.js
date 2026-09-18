/*:
 * @target MZ
 * @plugindesc Tabキーで指定スイッチをON/OFFし、ON中は何か操作があれば自動でOFFに戻す v1.2
 * 
 * @param ToggleSwitch
 * @text スイッチID
 * @desc Tabキーにより変更するスイッチID（0の場合無効）
 * @default 0
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "TabToggleSwitch";
    const p = PluginManager.parameters(PLUGIN_NAME);
    const TOGGLE_SWITCH = Number(p["ToggleSwitch"]);

    // ★ Tab を押した直後のフレームは「操作扱いしない」ためのフラグ
    let ignoreInputOnce = false;

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // ★ TabキーでON/OFF
        if (Input.isTriggered("tab")) {
            const current = $gameSwitches.value(TOGGLE_SWITCH);
            $gameSwitches.setValue(TOGGLE_SWITCH, !current);

            // Tab を押したフレームは操作扱いしない
            ignoreInputOnce = true;
            return;
        }

        // ★ スイッチON中は「何か操作」があればOFFに戻す
        if ($gameSwitches.value(TOGGLE_SWITCH)) {

            // Tab 押した直後のフレームは無視
            if (ignoreInputOnce) {
                ignoreInputOnce = false;
                return;
            }

            // キー入力があれば解除（Tab 以外）
            if (Input._latestButton && Input._latestButton !== "tab" && Input._latestButton !== "up" && Input._latestButton !== "down" && Input._latestButton !== "shift") {
                $gameSwitches.setValue(TOGGLE_SWITCH, false);
                return;
            }

            // マウスクリック・タップがあれば解除
            if (TouchInput.isTriggered() || TouchInput.isCancelled()) {
                $gameSwitches.setValue(TOGGLE_SWITCH, false);
                return;
            }
        }
    };

})();
