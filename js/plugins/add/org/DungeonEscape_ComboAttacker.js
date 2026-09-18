//=============================================================================
// DungeonEscape_ComboAttacker.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定の敵が「仲間生存時のみ連携技、それ以外は通常攻撃」を1回行動で使い分けるプラグイン Ver2.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ComboAttacker.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 敵キャラ(データベースの「敵キャラ」本体)のメモ欄に、以下のタグを
 * 記述してください。
 *
 * <comboAttacker:連携スキルID,通常攻撃スキルID>
 *
 * 例: <comboAttacker:270,271>
 *   → 270番のスキル(連携)、271番のスキル(通常攻撃)
 *
 * このタグを持つ敵は、行動決定時に以下の判定を行います(確定1回行動)。
 *
 * ・トループ内に自分以外の生存メンバーが2体以上いる場合
 *     → 連携スキルを使用する
 * ・自分以外の生存メンバーが1体以下の場合
 *     → 通常攻撃スキルを使用する
 *
 * 行動は常に1回のみなので、各スキルのデータベース上の「速度補正」が
 * そのまま普通に機能します(連携スキルの速度補正を高くしておけば、
 * 素直に先制で発動します)。通常の行動パターン(的中率・ターン条件等)
 * は一切参照しません。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const _Game_Enemy_makeActions = Game_Enemy.prototype.makeActions;

    Game_Enemy.prototype.makeActions = function () {
        const tag = this.enemy().meta.comboAttacker;
        if (!tag) {
            _Game_Enemy_makeActions.call(this);
            return;
        }

        const parts = String(tag).split(",").map(s => Number(s.trim()));
        const comboSkillId = parts[0];
        const attackSkillId = parts[1];

        const otherAliveCount = $gameTroop.members().filter(
            m => m !== this && m.isAlive()
        ).length;

        this.clearActions();
        const action = new Game_Action(this);
        action.setSkill(otherAliveCount >= 2 ? comboSkillId : attackSkillId);
        this._actions = [action];
    };
})();
