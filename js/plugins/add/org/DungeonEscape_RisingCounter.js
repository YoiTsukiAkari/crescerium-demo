/*:
 * @target MZ
 * @plugindesc 指定したスキルで指定回数ヒットさせないと解除できないステートを
 * 実装する汎用プラグイン Ver1.3.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_RisingCounter.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 1. 対象のステートのメモ欄に、解除に必要な回数を指定：
 *    <risingCounter:3>
 *
 * 2. カウントを進めたいスキルのメモ欄に、以下のタグを付ける：
 *    <risingCounterHit>
 *
 * これで、<risingCounter:X>を持つステートの効果中に、
 * <risingCounterHit>タグ付きのスキルが命中するたびに1回分カウントされ、
 * 指定回数(X)に達した時点でそのステートが自動的に解除されます。
 * ヒットするたびにバトルログへ「(対象名)の高度が下がった！」を表示します。
 *
 * カウントのリセットに関する特別なタグは不要です。<risingCounter:X>を
 * 持つステートが(再)付与されるたびに、そのステートのカウントは
 * 自動的に0にリセットされます（初めての付与でも、既に付与されている
 * 状態でもう一度付与された場合でも、必ずリセットされます）。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.3.0の変更点（今回の修正）
 * ------------------------------------------------------------------
 * ・カウントの強制リセットを、スキル側のタグ(<risingCounterReset>)で
 *   判定する方式から、ステート側のaddState呼び出しで判定する方式に
 *   変更した。
 *   旧方式は「対象への攻撃(invokeNormalAction)」の中でリセット判定を
 *   行っていたが、「ライジング」はクレイ・セラを攻撃しつつ、別途
 *   使用者自身（ボス）に状態を付与する技だったため、攻撃対象
 *   （パーティ側）のステートばかり見てしまい、使用者自身に付与される
 *   該当ステートを一度も検知できていなかった（実質何もしていなかった）。
 *   新方式はGame_Battler.prototype.addState自体をフックするため、
 *   誰に対して付与された場合でも正しくリセットされる。
 * ・カウント到達でステートを解除した際、そのステートの「解除された時」
 *   のメッセージ(ステート編集画面の「メッセージ」欄)が表示されない
 *   不具合を修正済み（displayRemovedStatesを明示的に呼び出す）。
 * ・表示順を修正済み（BattleManager.invokeNormalActionをフックし、
 *   標準のダメージ表示の後にメッセージを出す）。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・カウントは対象・ステートごとに個別管理されます。
 * ・空振り（命中しなかった場合）はカウントされません。
 */

(() => {
  "use strict";

  const _Game_Battler_addState = Game_Battler.prototype.addState;
  Game_Battler.prototype.addState = function(stateId) {
    _Game_Battler_addState.call(this, stateId);
    if (this.isStateAffected(stateId)) {
      const state = $dataStates[stateId];
      if (state && Number(state.meta.risingCounter)) {
        this._risingCounters = this._risingCounters || {};
        this._risingCounters[stateId] = 0;
        console.log(
          `[RisingCounterDebug] リセット: ${this.name()} の ${state.name} のカウントを0に戻しました`
        );
      }
    }
  };

  function processRisingCounter(action, target) {
    const item = action.item();
    if (!item || !item.meta.risingCounterHit || !target.result().isHit()) {
      return;
    }

    for (const state of target.states()) {
      const threshold = Number(state.meta.risingCounter);
      if (!threshold) continue;

      target._risingCounters = target._risingCounters || {};
      const current = (target._risingCounters[state.id] || 0) + 1;
      target._risingCounters[state.id] = current;

      console.log(
        `[RisingCounterDebug] カウント: ${target.name()} の ${state.name} = ${current}/${threshold}`
      );

      if (current >= threshold) {
        target.removeState(state.id);
        target._risingCounters[state.id] = 0;
        if (BattleManager._logWindow) {
          BattleManager._logWindow.displayRemovedStates(target);
        }
      } else if (BattleManager._logWindow) {
        BattleManager._logWindow.push("addText", `${target.name()}の高度が下がった！`);
      }
    }
  }

  const _BattleManager_invokeNormalAction = BattleManager.invokeNormalAction;
  BattleManager.invokeNormalAction = function(subject, target) {
    _BattleManager_invokeNormalAction.call(this, subject, target);
    const realTarget = this.applySubstitute(target);
    processRisingCounter(this._action, realTarget);
  };
})();
