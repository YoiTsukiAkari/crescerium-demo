//=============================================================================
// DungeonEscape_RandomTargetOnly.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステートを持つバトラーの「単体対象スキル」の狙う相手だけをランダム化するプラグイン Ver1.2.0
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
 * このステートを持つバトラーが「単体対象」のスキル・アイテムを
 * 使用する際、対象を自分で選べなくなります。
 *
 * ・敵単体への行動：敵の中からランダム
 * ・味方単体への行動：生存中の味方からランダム
 * ・戦闘不能の味方単体への行動：戦闘不能の味方からランダム
 * ・使用者自身が対象の行動：通常通り自分が対象
 * ・全体対象の行動：通常通り
 * ・<QuickSkill> / <ターン消費なし> / <ターン消費無し> のスキル：
 *   焦燥の影響を受けず、通常通り対象を選択可能
 *
 * 混乱(confusion)と違い、行動そのもの(選んだスキル)は一切変更しません。
 * あくまで「狙う相手」だけがランダムになります。
 * 対象選択画面も表示されません。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function hasRandomTargetOnly(battler) {
        return battler.states().some(s => s.meta.randomTargetOnly);
    }

    function isQuickSkill(action) {
        const item = action ? action.item() : null;
        return !!(
            item &&
            item.meta &&
            (
                item.meta.QuickSkill ||
                item.meta["ターン消費なし"] ||
                item.meta["ターン消費無し"]
            )
        );
    }

    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;

    Game_Action.prototype.makeTargets = function () {
        const subject = this.subject();

        if (
            !this._forcing &&
            subject &&
            this.isForOne() &&
            hasRandomTargetOnly(subject) &&
            !isQuickSkill(this)
        ) {
            // 敵単体：MZ標準のランダム対象処理を使う。
            if (this.isForOpponent()) {
                this.setTarget(-1);
            }

            // 味方単体：対象をランダム化する。
            // 「使用者自身」が対象のスキルは通常通り自分を対象にする。
            if (this.isForFriend() && !this.isForUser()) {
                const unit = this.friendsUnit();
                const members = this.isForDeadFriend()
                    ? unit.deadMembers()
                    : unit.aliveMembers();

                if (members.length > 0) {
                    return [members[Math.randomInt(members.length)]];
                }
                return [];
            }
        }

        return _Game_Action_makeTargets.call(this);
    };

    // 対象選択自体を出さないようにする(選んでも意味が無く紛らわしいため)
    const _Game_Action_needsSelection = Game_Action.prototype.needsSelection;

    Game_Action.prototype.needsSelection = function () {
        const subject = this.subject();

        if (
            subject &&
            this.isForOne() &&
            hasRandomTargetOnly(subject) &&
            !isQuickSkill(this) &&
            (
                this.isForOpponent() ||
                (this.isForFriend() && !this.isForUser())
            )
        ) {
            return false;
        }

        return _Game_Action_needsSelection.call(this);
    };
})();
