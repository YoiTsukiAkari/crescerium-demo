//=============================================================================
// DungeonEscape_Taunt.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステートを持つ敵が、単体攻撃で必ず指定したアクターを狙うようにするプラグイン Ver2.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_Taunt.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <taunted:X>   Xは狙わせたいアクターのアクターID
 *
 * 例: <taunted:9>   → クレイ(アクターID9)を必ず狙う
 *
 * このステートを持つ敵が、**単体対象**のスキル・アイテムを使う時、
 * 本来選ばれるはずだった対象に関わらず、必ず指定したアクターを
 * 狙うようになります。
 *
 * このステートを持たない他の敵の狙いには一切影響しません。また、
 * 全体攻撃・複数対象のスキルにも影響しません(通常通りパーティ
 * 全員が対象になります)。
 *
 * ------------------------------------------------------------------
 * ◆使い方の例
 * ------------------------------------------------------------------
 * 「狙われ」ステート(継続ターン数はお好みで)のメモ欄に
 * <taunted:9>を記述し、クレイの「一閃」の使用効果で、命中した
 * 対象(敵)にこのステートを付与してください。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;

    Game_Action.prototype.makeTargets = function () {
        if (
            !this._forcing &&
            this.subject().isEnemy() &&
            this.isForOpponent() &&
            this.isForOne()
        ) {
            const tauntState = this.subject()
                .states()
                .find(s => s.meta.taunted);
            if (tauntState) {
                const actorId = Number(tauntState.meta.taunted);
                const actor = $gameParty
                    .members()
                    .find(m => m.actorId() === actorId && m.isAlive());
                if (actor) {
                    this.setTarget(actor.index());
                }
            }
        }
        return _Game_Action_makeTargets.call(this);
    };
})();
