//=============================================================================
// DungeonEscape_ExcludeTargetEnemy.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc スキルごとに、指定した敵キャラIDを単体対象候補から除外します Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ExcludeTargetEnemy.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * スキルのメモ欄に以下のタグを記述してください。
 *
 * <excludeTargetEnemyId:27>
 *
 * 指定した敵キャラIDは、そのスキルの単体対象候補から除外されます。
 *
 * 複数指定する場合:
 * <excludeTargetEnemyId:27,28,29>
 *
 * ------------------------------------------------------------------
 * ◆今回の用途
 * ------------------------------------------------------------------
 * 「先制の笛」「専守の笛」に
 *
 * <excludeTargetEnemyId:27>
 *
 * を記述すると、敵キャラID27（光のオーブ）は対象候補から外れます。
 * 光の角笛自身や、その他の生存中の従者は通常通り対象候補になります。
 *
 * ------------------------------------------------------------------
 * ◆仕様
 * ------------------------------------------------------------------
 * ・敵側の「味方単体」対象スキルに対応します。
 * ・対象候補から除外された敵は、ランダム抽選にも含まれません。
 * ・指定された対象しか存在しない場合、そのスキルは敵の行動候補から
 *   除外されます。
 * ・全体対象、自分自身対象、敵対対象のスキルには影響しません。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function excludedEnemyIds(action) {
        const item = action ? action.item() : null;
        const raw = item && item.meta ? item.meta.excludeTargetEnemyId : null;
        if (raw === undefined || raw === null || raw === true || raw === "") {
            return [];
        }

        return String(raw)
            .split(",")
            .map(value => Number(value.trim()))
            .filter(id => Number.isInteger(id) && id > 0);
    }

    function isExcludedEnemy(battler, excludedIds) {
        return battler instanceof Game_Enemy &&
            excludedIds.includes(battler.enemyId());
    }

    function validFriendTargets(action, excludedIds) {
        const unit = action.friendsUnit();
        if (!unit) return [];

        const members = action.isForDeadFriend()
            ? unit.deadMembers()
            : unit.aliveMembers();

        return members.filter(member =>
            !isExcludedEnemy(member, excludedIds)
        );
    }

    function randomTargetFrom(members) {
        if (members.length === 0) return null;

        const tgrSum = members.reduce((sum, member) => sum + member.tgr, 0);

        if (tgrSum <= 0) {
            return members[Math.randomInt(members.length)];
        }

        let value = Math.random() * tgrSum;
        for (const member of members) {
            value -= member.tgr;
            if (value <= 0) return member;
        }

        return members[members.length - 1];
    }

    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;
    Game_Action.prototype.makeTargets = function() {
        const excludedIds = excludedEnemyIds(this);

        if (
            excludedIds.length > 0 &&
            this.subject() instanceof Game_Enemy &&
            this.isForFriend() &&
            this.isForOne() &&
            !this.isForUser()
        ) {
            const candidates = validFriendTargets(this, excludedIds);
            const target = randomTargetFrom(candidates);
            return target ? [target] : [];
        }

        return _Game_Action_makeTargets.call(this);
    };

    const _Game_Enemy_isActionValid = Game_Enemy.prototype.isActionValid;
    Game_Enemy.prototype.isActionValid = function(action) {
        if (!_Game_Enemy_isActionValid.call(this, action)) return false;

        const skill = $dataSkills[action.skillId];
        if (!skill || !skill.meta.excludeTargetEnemyId) return true;

        const gameAction = new Game_Action(this);
        gameAction.setSkill(action.skillId);

        if (
            gameAction.isForFriend() &&
            gameAction.isForOne() &&
            !gameAction.isForUser()
        ) {
            const excludedIds = excludedEnemyIds(gameAction);
            return validFriendTargets(gameAction, excludedIds).length > 0;
        }

        return true;
    };
})();
