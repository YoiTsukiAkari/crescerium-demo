//=============================================================================
// DungeonEscape_PriestessHealAI.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定の敵が「回復対象の有無」で技を切り替えるプラグイン Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_PriestessHealAI.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 敵キャラ(データベースの「敵キャラ」本体)のメモ欄に、以下のタグを
 * 記述してください。
 *
 * <healPriority:単体回復スキルID,全体回復スキルID,バフスキルID>
 *
 * 例: <healPriority:272,273,274>
 *   → 272番(祈祷/単体回復)、273番(恩寵/全体回復)、274番(加護/バフ)
 *
 * このタグを持つ敵は、行動決定時に以下の判定を行います(確定1回行動)。
 *
 * ・トループ内(自分自身も含む)で、HPが最大値未満の生存メンバーが
 *   2体以上いる場合
 *     → 全体回復スキルを使用
 * ・HPが最大値未満の生存メンバーがちょうど1体だけの場合
 *     → 単体回復スキルを使用し、対象はそのHPが減っている1体に
 *       明示的に狙いを定める(AIの自動選択に任せず、確実にその対象を狙う)
 * ・誰もHPが減っていない場合
 *     → バフスキルを使用
 *
 * 通常の行動パターン(的中率・ターン条件等)は一切参照しません。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const _Game_Enemy_makeActions = Game_Enemy.prototype.makeActions;

    Game_Enemy.prototype.makeActions = function () {
        const tag = this.enemy().meta.healPriority;
        if (!tag) {
            _Game_Enemy_makeActions.call(this);
            return;
        }

        const parts = String(tag).split(",").map(s => Number(s.trim()));
        const singleHealId = parts[0];
        const groupHealId = parts[1];
        const buffId = parts[2];

        // HPが減っている生存メンバー(自分含む)を、HPが少ない順に列挙
        const damagedMembers = $gameTroop
            .members()
            .filter(m => m.isAlive() && m.hp < m.mhp)
            .sort((a, b) => a.hp - b.hp);

        this.clearActions();
        const action = new Game_Action(this);

        if (damagedMembers.length >= 2) {
            action.setSkill(groupHealId);
        } else if (damagedMembers.length === 1) {
            action.setSkill(singleHealId);
            action.setTarget(damagedMembers[0].index());
        } else {
            action.setSkill(buffId);
        }

        this._actions = [action];
    };
})();
