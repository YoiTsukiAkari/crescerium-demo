//=============================================================================
// DungeonEscape_GladiatorDuel.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 光の剣闘士専用：指定アクターとの一騎打ちルールを実装します Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_GladiatorDuel.js
 *
 * ============================================================================
 * ■概要
 * ============================================================================
 * 光の剣闘士の「クレイだけを狙い、クレイの攻撃だけが通る」という
 * 一騎打ちルールを実装します。
 *
 * DungeonEscape_LightPartyAI.js で使用しているタグをそのまま利用します。
 *
 * 敵キャラ（光の剣闘士）のメモ欄：
 *
 *   <lightGladiatorTargetActor:アクターID>
 *
 * 例：クレイのアクターIDが1の場合
 *
 *   <lightGladiatorTargetActor:1>
 *
 * ============================================================================
 * ■効果
 * ============================================================================
 * 1. 剣闘士の敵対行動は、指定アクターだけを対象にします。
 *
 *    ・指定アクターが生存中 → 必ずそのアクターを狙う
 *    ・指定アクターが戦闘不能 → 他のアクターへ狙いを変えず不発
 *
 *    通常攻撃だけでなく、今後別の敵対スキルを追加した場合も対象になります。
 *
 * 2. 指定アクター以外が剣闘士へ行った敵対象行動を無効化します。
 *
 *    ・HP/MPダメージ
 *    ・ステート付与／解除
 *    ・能力変化
 *    ・その他、通常のGame_Action.applyで処理される効果
 *
 *    はすべて発生しません。
 *
 *    そのため、セラの攻撃魔法・デバフ・テネブラなども剣闘士には
 *    効果がありません。
 *
 *    一方、セラがクレイへ行う回復・補助などは通常どおり有効です。
 *
 * 3. 指定アクター本人の敵対象行動は通常どおり有効です。
 *
 *    物理攻撃だけでなく、指定アクター本人が使用した敵対象スキルなら
 *    属性付きの技なども通ります。
 *
 * ============================================================================
 * ■Coverとの併用
 * ============================================================================
 * 光のオーブへの攻撃が <guardEnemyId:...> 等で剣闘士へ肩代わりされた場合も、
 * 実際の適用対象が剣闘士になった時点で判定します。
 *
 * そのため、セラの攻撃が剣闘士へ肩代わりされた場合は無効化されます。
 *
 * ============================================================================
 * ■表示
 * ============================================================================
 * 無効化された行動はRPGツクールMZ標準の「効果がなかった」扱いになります。
 *
 * ============================================================================
 * ■推奨読み込み順
 * ============================================================================
 * DungeonEscape_LightPartyAI.js より下に置くことを推奨します。
 * ただし、LightPartyAI側のクレイ固定対象処理とも競合しないよう実装しています。
 *
 * 利用規約：このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const TAG_NAME = "lightGladiatorTargetActor";

    //-------------------------------------------------------------------------
    // Utilities
    //-------------------------------------------------------------------------

    function duelActorIdFromEnemy(enemy) {
        if (!enemy || !enemy.isEnemy || !enemy.isEnemy()) return 0;
        const data = enemy.enemy && enemy.enemy();
        if (!data || !data.meta) return 0;

        const id = Number(data.meta[TAG_NAME] || 0);
        return Number.isFinite(id) && id > 0 ? Math.floor(id) : 0;
    }

    function duelActorForEnemy(enemy) {
        const actorId = duelActorIdFromEnemy(enemy);
        if (actorId <= 0) return null;

        const actor = $gameActors.actor(actorId);
        if (!actor) return null;
        if (!$gameParty.battleMembers().includes(actor)) return null;

        return actor;
    }

    function isBlockedPlayerAction(action, target) {
        if (!target || !target.isEnemy || !target.isEnemy()) return false;

        const actorId = duelActorIdFromEnemy(target);
        if (actorId <= 0) return false;

        const subject = action.subject();
        if (!subject || !subject.isActor || !subject.isActor()) return false;

        // 敵対象行動だけを一騎打ち制限の対象にする。
        // 味方対象行動や特殊な内部処理には干渉しない。
        if (!action.isForOpponent || !action.isForOpponent()) return false;

        return subject.actorId() !== actorId;
    }

    //-------------------------------------------------------------------------
    // Gladiator target restriction
    //-------------------------------------------------------------------------

    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;

    Game_Action.prototype.makeTargets = function() {
        const subject = this.subject();

        if (
            subject &&
            subject.isEnemy &&
            subject.isEnemy() &&
            this.isForOpponent &&
            this.isForOpponent()
        ) {
            const actorId = duelActorIdFromEnemy(subject);

            if (actorId > 0) {
                const actor = duelActorForEnemy(subject);

                // クレイが倒れている場合、セラへ自動リターゲットしない。
                if (!actor || !actor.isAlive()) {
                    return [];
                }

                // 一騎打ちなので、敵対行動の対象は常に指定アクターのみ。
                return [actor];
            }
        }

        return _Game_Action_makeTargets.call(this);
    };

    //-------------------------------------------------------------------------
    // Only the designated actor can affect the gladiator
    //-------------------------------------------------------------------------

    const _Game_Action_apply = Game_Action.prototype.apply;

    Game_Action.prototype.apply = function(target) {
        if (isBlockedPlayerAction(this, target)) {
            const result = target.result();

            // 標準の「効かなかった」表示を使えるよう、
            // 命中はしたが効果は成功しなかった状態にする。
            result.clear();
            result.used = true;
            result.missed = false;
            result.evaded = false;
            result.physical = this.isPhysical();
            result.drain = this.isDrain();
            result.critical = false;
            result.success = false;

            return;
        }

        _Game_Action_apply.call(this, target);
    };
})();
