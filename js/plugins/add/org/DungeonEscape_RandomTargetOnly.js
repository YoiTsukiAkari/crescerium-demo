//=============================================================================
// DungeonEscape_RandomTargetOnly.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステートを持つバトラーの「単体対象スキル」の狙う相手だけをランダム化するプラグイン Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_RandomTargetOnly.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <randomTargetOnly>
 *
 * このステートを持つバトラーが、敵単体を対象にしたスキル・アイテムを
 * 使用する際、プレイヤー(または味方AI)がどの対象を選んでいても、
 * 実際に狙う相手だけをランダムに上書きします。
 *
 * 混乱(confusion)と違い、行動そのもの(選んだスキル)は一切変更しません。
 * あくまで「狙う相手」だけがランダムになります。対象選択の画面自体も
 * 表示されなくなります(選んでも上書きされてしまうため)。
 *
 * ツクールMZの標準仕様上、単体対象スキルは対象指定が無い(-1)場合に
 * 自動的にランダムな相手を狙う仕組みになっているため、このプラグインは
 * 対象指定を明示的に無効化しているだけです。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function hasRandomTargetOnly(battler) {
        return battler.states().some(s => s.meta.randomTargetOnly);
    }

    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;

    Game_Action.prototype.makeTargets = function () {
        if (
            !this._forcing &&
            this.isForOpponent() &&
            this.isForOne() &&
            hasRandomTargetOnly(this.subject())
        ) {
            this.setTarget(-1);
        }
        return _Game_Action_makeTargets.call(this);
    };

    // 対象選択自体を出さないようにする(選んでも意味が無く紛らわしいため)
    const _Game_Action_needsSelection = Game_Action.prototype.needsSelection;

    Game_Action.prototype.needsSelection = function () {
        if (
            this.isForOpponent() &&
            this.isForOne() &&
            this.subject() &&
            hasRandomTargetOnly(this.subject())
        ) {
            return false;
        }
        return _Game_Action_needsSelection.call(this);
    };
})();
