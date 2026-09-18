//=============================================================================
// DungeonEscape_SpellInterrupt.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc スキルタイプ封印などにより行動が実行直前に不発になった場合、
 * バトルログにその旨を表示します
 * @author DungeonEscape開発用
 *
 * @param attemptText
 * @text 1行目（試みた）の文言
 * @desc %1=行動者名、%2=技名 に置き換わります
 * @default %1は%2を唱えた！
 *
 * @param failText
 * @text 2行目（失敗した）の文言
 * @desc プレースホルダーは使いません
 * @default しかし詠唱を阻害され、失敗に終わった！
 *
 * @help DungeonEscape_SpellInterrupt.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * RPGツクールMZは、行動を「決定するタイミング」と「実行するタイミング」の
 * 2回、使用可否を判定しています。決定後・実行前の間に詠唱阻害などで
 * スキルが封印されると、標準では何も表示されないまま行動そのものが
 * 静かに握りつぶされます。
 *
 * このプラグインを導入すると、対象が「詠唱阻害を意味するステート」を
 * 持っている状態で行動が不発になった場合、その場でバトルログに
 * 経緯を表示します。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 「詠唱阻害」の役割を持つステートのメモ欄に、以下のタグを追加してください。
 *
 * <silenceInterruptMessage>
 *
 * このタグを持つステートが原因でスキルが使えなくなり、行動が不発に
 * 終わった場合にのみ、プラグインパラメータの文言がバトルログに
 * 表示されます（このタグが無いステートによる不発では何も表示しません。
 * 例えば単純な戦闘不能などとは区別されます）。
 */

(() => {
  "use strict";
  const pluginName = "DungeonEscape_SpellInterrupt";
  const params = PluginManager.parameters(pluginName);
  const attemptText = String(params.attemptText || "%1は%2を唱えた！");
  const failText = String(params.failText || "しかし詠唱を阻害され、失敗に終わった！");

  function hasInterruptState(battler) {
    return battler.states().some(s => "silenceInterruptMessage" in s.meta);
  }

  const _BattleManager_processTurn = BattleManager.processTurn;
  BattleManager.processTurn = function() {
    const subject = this._subject;
    const action = subject ? subject.currentAction() : null;

    if (action) {
      action.prepare();
      const item = action.item();
      if (
        !action.isValid() &&
        item &&
        DataManager.isSkill(item) &&
        subject.isAlive() &&
        hasInterruptState(subject)
      ) {
        this._logWindow.push("addText", attemptText.replace("%1", subject.name()).replace("%2", item.name));
        this._logWindow.push("addText", failText);
        this._logWindow.push("wait");
        this._logWindow.push("clear");
      }
    }

    _BattleManager_processTurn.call(this);
  };
})();
