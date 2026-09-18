/*:
 * @target MZ
 * @plugindesc 戦闘コマンドカスタム（攻撃・防御削除）
 * @author Claude
 * @version 1.2.0
 *
 * @help DungeonEscape_BattleCustom.js
 *
 * 戦闘コマンドから「攻撃」と「防御」を削除します。
 * スキルとアイテムのみが表示されます。
 */

(() => {
    'use strict';

    // 攻撃・防御コマンドの削除
    Window_ActorCommand.prototype.makeCommandList = function() {
        if (this._actor) {
            this.addSkillCommands();
            this.addItemCommand();
        }
    };

})();
