/*:
 * @target MZ
 * @plugindesc 「凍結」など指定ステートが敵に付与された瞬間、その敵に紐づく灼熱カウント用ゲーム変数を0へ戻します Ver1.2.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_HeatCountReset.js
 *
 * ------------------------------------------------------------------
 * ◆目的
 * ------------------------------------------------------------------
 * 奈落のデーモンの「灼熱」カウントをゲーム変数で管理し、
 * 凍結が成立した瞬間にそのカウントを0へ戻すためのプラグインです。
 *
 * DungeonEscape_PartialRestrict.js では、複数回行動する敵に凍結・怯み等が
 * 入った場合、行動1回分を消費したあと、その制約ステートを即座に解除します。
 * そのため「あとから凍結中かどうかを確認する」方式では取りこぼす可能性があります。
 *
 * このプラグインは Game_Battler.addState() の呼び出し時点で
 * 「そのステートが付与可能だったか」を確認し、元の addState() 処理の直後に
 * 変数をリセットします。
 *
 * PartialRestrict 側でステートが同じ addState() 呼び出し中に即解除されても、
 * リセット処理は実行されます。
 *
 * ------------------------------------------------------------------
 * ◆設定
 * ------------------------------------------------------------------
 *
 * 1. 奈落のデーモンの「敵キャラ」メモ欄に、
 *    灼熱カウントとして使うゲーム変数IDを指定してください。
 *
 *    <heatCountVariable:20>
 *
 *    ↑ 例ではゲーム変数20番を灼熱カウントとして使用します。
 *
 *
 * 2. 「凍結」ステートのメモ欄に、以下を記述してください。
 *
 *    <resetHeatCount>
 *
 *
 * これだけで、そのステートが対象の敵に付与された瞬間、
 * 指定されたゲーム変数が0になります。
 *
 * ------------------------------------------------------------------
 * ◆例
 * ------------------------------------------------------------------
 *
 * 奈落のデーモン：
 *   <heatCountVariable:20>
 *
 * 凍結ステート：
 *   <resetHeatCount>
 *
 * → デーモンに凍結が成立
 * → ゲーム変数20番 = 0
 * → PartialRestrict によって凍結がすぐ解除されても問題なし
 *
 * ------------------------------------------------------------------
 * ◆補足
 * ------------------------------------------------------------------
 *
 * ・このプラグインは「灼熱カウントを増やす処理」自体は行いません。
 *   「灼熱」スキル側のコモンイベント等で、
 *   指定ゲーム変数を +1 してください。
 *
 * ・対象敵に <heatCountVariable:...> が無い場合は何もしません。
 *
 * ・<resetHeatCount> の無いステートでは何もしません。
 *
 * ・敵専用です。味方に同じステートが付いても変数は変更しません。
 *
 * ・灼熱カウントが1以上から0になった場合のみ、
 *   標準の「凍結した！」等のステート付与ログの直後に、
 *   「奈落のデーモンの熱が収まった！」と表示します。
 *   すでに0の場合はログを表示しません。
 *
 * ・複数の敵が同じゲーム変数を共有する用途は想定していません。
 *   今回のような単独ボス専用ギミック向けです。
 */

(() => {
  "use strict";

  const _Game_Battler_addState = Game_Battler.prototype.addState;

  Game_Battler.prototype.addState = function(stateId) {
    // addState() 内で PartialRestrict によってステートが即解除される可能性があるため、
    // 元処理を呼ぶ前に「このステートを付与できる状態か」を記録しておく。
    const isEnemy = this.isEnemy && this.isEnemy();
    const state = $dataStates[stateId];
    const shouldReset =
      isEnemy &&
      state &&
      Object.prototype.hasOwnProperty.call(state.meta, "resetHeatCount") &&
      this.isStateAddable(stateId);

    _Game_Battler_addState.call(this, stateId);

    if (!shouldReset) return;

    const enemyData = this.enemy && this.enemy();
    if (!enemyData) return;

    const variableId = Number(enemyData.meta.heatCountVariable || 0);
    if (!Number.isInteger(variableId) || variableId <= 0) return;

    const currentValue = Number($gameVariables.value(variableId) || 0);
    if (currentValue <= 0) return;

    $gameVariables.setValue(variableId, 0);

    // 標準の「凍結した！」等のステート付与ログが表示された後に
    // 熱リセットのログを出すため、ここでは即表示せず保留する。
    this._pendingHeatResetLog = true;
  };

  // 標準の「○○は凍結した！」等が出た後に、熱リセットのログを表示する。
  const _Window_BattleLog_displayAddedStates =
    Window_BattleLog.prototype.displayAddedStates;

  Window_BattleLog.prototype.displayAddedStates = function(target) {
    _Window_BattleLog_displayAddedStates.call(this, target);

    if (target && target._pendingHeatResetLog) {
      target._pendingHeatResetLog = false;
      this.push("addText", "奈落のデーモンの熱が収まった！");
      this.push("wait");
      this.push("clear");
    }
  };
})();
