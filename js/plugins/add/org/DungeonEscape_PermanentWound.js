//=============================================================================
// DungeonEscape_PermanentWound.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグで、命中した対象の最大HPと現在HPを恒久的に減少させるプラグイン Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_PermanentWound.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * スキルのメモ欄に以下のタグを記述してください。
 *
 * <permanentWound:X>
 *
 * 例: <permanentWound:30>
 *
 * このタグを持つスキルが命中すると、対象の**最大HP・現在HPの両方を
 * Xだけ恒久的に減少**させます（戦闘不能になっていなければ発動）。
 *
 * ------------------------------------------------------------------
 * ◆背景
 * ------------------------------------------------------------------
 * 以前はコモンイベント側のスクリプトで、$gameTemp.lastActionData(4)
 * （直近の行動対象のアクターID）を参照する形で実装されていましたが、
 * これはツクールMZの内部処理上、「使用効果→コモンイベントの呼び出し」
 * 自体が、命中判定・対象の確定(updateLastTarget)より**前**に予約される
 * ため、参照するタイミングによっては1つ前の行動の対象を誤って
 * 拾ってしまう、という原理的なタイミング事故がありました。
 *
 * このプラグインは、`DungeonEscape_HuntersMark.js`と同じ考え方で、
 * 対象が完全に確定した後のタイミング(displayActionResults)で発動する
 * ため、このタイミング事故が起きません。庇い等で対象が入れ替わった
 * 場合も、実際に攻撃を受けた本人に正しく適用されます。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const _Window_BattleLog_displayActionResults =
        Window_BattleLog.prototype.displayActionResults;

    Window_BattleLog.prototype.displayActionResults = function (subject, target) {
        _Window_BattleLog_displayActionResults.call(this, subject, target);

        const result = target.result();
        if (!result.isHit()) return;

        const action = BattleManager._action;
        const item = action && action.item();
        if (!item || !item.meta.permanentWound) return;

        if (!target.isAlive()) return;

        const amount = Number(item.meta.permanentWound);
        target.addParam(0, -amount); // paramId 0 = 最大HP
        target.gainHp(-amount);
    };
})();
