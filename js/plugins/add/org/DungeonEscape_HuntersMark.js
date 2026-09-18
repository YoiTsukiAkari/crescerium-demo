//=============================================================================
// DungeonEscape_HuntersMark.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステート(マーク)を持つ対象が被弾するたびに追加ダメージを発生させるプラグイン Ver1.4.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_HuntersMark.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <huntersMark:追加ダメージ量>
 *
 * 例: <huntersMark:80>
 *
 * このステートを持つバトラーが、何らかの攻撃でHPダメージを受けた
 * 直後、そのダメージとは別に追加ダメージ(固定値)が発生します。
 * 誰の攻撃で本体のダメージが発生したかは問いません(このステートを
 * 付与した本人以外の攻撃でも発生します)。多段ヒットするスキルで
 * 本体を殴った場合、ヒットごとに何度でも発生します。
 *
 * 追加ダメージ自体には属性・命中判定・防御力計算は一切適用されません
 * (常に指定した固定値がそのまま入ります)。
 *
 * このステートを付与した本人が戦闘不能になっている場合、追加ダメージは
 * 発生しません(誰が付与したかを内部的に記憶しています)。
 *
 * ------------------------------------------------------------------
 * ◆バトルログの表示(任意)
 * ------------------------------------------------------------------
 * <huntersMarkMessage1:文言>  バトルログ1行目に表示したい場合のみ指定(省略時は非表示)。
 * <huntersMarkMessage2:文言>  バトルログ2行目に表示したい場合のみ指定(省略時は非表示)。
 *                              どちらも%1=対象名、%2=追加ダメージ量に置き換わります。
 *
 * 例:
 * <huntersMark:80>
 * <huntersMarkMessage1:獲物の刻印が疼く……！>
 * <huntersMarkMessage2:%1に%2の追撃ダメージ！>
 *   → 2行に分けてバトルログに表示される
 *
 * ------------------------------------------------------------------
 * ◆Ver1.4.0での変更点(重要な修正)
 * ------------------------------------------------------------------
 * Ver1.2.0までは、ダメージ計算処理(executeHpDamage)の中で追撃処理を
 * 直接実行していたため、元の攻撃のダメージ表示(ポップアップ)用データを
 * 追撃側が上書きしてしまい、元の攻撃の表示が消えたり、追撃自体が
 * 正しく表示されないことがあった。
 *
 * Ver1.4.0では、元の攻撃の表示処理(displayActionResults)が完全に
 * キューに積まれた直後に追撃処理を差し込む形に変更し、表示の競合を
 * 解消した。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    // ステート付与が成功した瞬間、「誰が付与したか」を対象側に覚えさせる
    const _Game_Action_itemEffectAddNormalState =
        Game_Action.prototype.itemEffectAddNormalState;

    Game_Action.prototype.itemEffectAddNormalState = function (target, effect) {
        const stateData = $dataStates[effect.dataId];
        const isMark = !!(stateData && stateData.meta.huntersMark);

        _Game_Action_itemEffectAddNormalState.call(this, target, effect);

        if (isMark && target.isStateAffected(effect.dataId)) {
            if (!target._huntersMarkCasters) {
                target._huntersMarkCasters = {};
            }
            target._huntersMarkCasters[effect.dataId] = this.subject();
        }
    };

    // 元の攻撃の表示がキューに積まれた直後に、追撃ぶんを追加でキューに積む
    const _Window_BattleLog_displayActionResults =
        Window_BattleLog.prototype.displayActionResults;

    Window_BattleLog.prototype.displayActionResults = function (subject, target) {
        _Window_BattleLog_displayActionResults.call(this, subject, target);

        const result = target.result();
        if (!result.hpAffected || result.hpDamage <= 0) return;

        const markStates = target.states().filter(s => s.meta.huntersMark);
        for (const state of markStates) {
            const bonus = Number(state.meta.huntersMark);
            if (!bonus) continue;

            const caster =
                target._huntersMarkCasters &&
                target._huntersMarkCasters[state.id];
            if (caster && !caster.isAlive()) continue;

            const format = tagName => {
                const raw = state.meta[tagName];
                return raw
                    ? raw.replace("%1", target.name()).replace("%2", bonus)
                    : null;
            };
            const line1 = format("huntersMarkMessage1");
            const line2 = format("huntersMarkMessage2");

            this.push("applyHuntersMark", target, bonus, line1, line2);
        }
    };

    // 実際に追撃ダメージを適用し、表示する(キュー経由で呼ばれる想定)
    Window_BattleLog.prototype.applyHuntersMark = function (
        target,
        bonus,
        line1,
        line2
    ) {
        if (!target.isAlive()) return;

        target.result().clear();
        target.result().hpAffected = true;
        target.result().hpDamage = bonus;
        target.gainHp(-bonus);
        if (target.hp === 0) {
            target.performCollapse();
        }
        if (target.shouldPopupDamage()) {
            target.startDamagePopup();
        }

        if (line1) this.addText(line1);
        if (line2) this.addText(line2);
        if (line1 || line2) {
            this.push("wait");
            this.push("clear");
        }
    };
})();
