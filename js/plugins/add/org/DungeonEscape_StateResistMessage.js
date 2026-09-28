/*:
 * @target MZ
 * @plugindesc 完全耐性でステート付与を無効化した時、ステートごとの専用バトルログを表示します Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_StateResistMessage.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 完全耐性で防いだことを表示したい「ステート」のメモ欄に、
 * 以下のタグを記述してください。
 *
 *   <resistMessage:%1には混乱が効かなかった！>
 *
 * %1 は対象者の名前に置き換わります。
 *
 * 例：
 *   混乱ステートのメモ欄
 *
 *   <resistMessage:%1には混乱が効かなかった！>
 *
 * 「邂逅のアセンション」などで混乱を完全無効化しているクレイが
 * 「狂気の魔眼」を受けた場合、
 *
 *   クレイには混乱が効かなかった！
 *
 * とバトルログに表示されます。
 *
 * ------------------------------------------------------------------
 * ◆仕様
 * ------------------------------------------------------------------
 * ・攻撃自体がミス／回避された場合は表示しません。
 * ・対象がそのステートに対する「完全耐性」を持っている場合だけ表示します。
 * ・単なる付与確率の失敗では表示しません。
 * ・<resistMessage:...> が無いステートでは何も変更しません。
 * ・通常のダメージ、ステート付与、解除等の表示処理は変更しません。
 *
 * ※ RPGツクールMZでは完全耐性の対象には addState() が成立しないため、
 *    標準では「効かなかった」ことを示す専用ログが出ません。
 *    このプラグインでは、スキル効果が実際に処理されるタイミングで
 *    完全耐性を検出し、標準の行動結果ログの後に専用メッセージを出します。
 */

(() => {
  "use strict";

  const _Game_Action_itemEffectAddState =
    Game_Action.prototype.itemEffectAddState;

  Game_Action.prototype.itemEffectAddState = function(target, effect) {
    let resistMessage = null;

    // dataId === 0 は「通常攻撃時のステート付与」なので、
    // 今回はスキル等で明示的に指定されたステートだけを対象にする。
    if (effect && effect.dataId > 0) {
      const state = $dataStates[effect.dataId];

      if (
        state &&
        state.meta &&
        state.meta.resistMessage !== undefined &&
        target &&
        target.isStateResist &&
        target.isStateResist(effect.dataId)
      ) {
        resistMessage = String(state.meta.resistMessage).replace(
          /%1/g,
          target.name()
        );
      }
    }

    _Game_Action_itemEffectAddState.call(this, target, effect);

    if (resistMessage) {
      target._pendingStateResistMessages =
        target._pendingStateResistMessages || [];

      // 同じ行動内で同一メッセージが重複登録されないようにする。
      if (!target._pendingStateResistMessages.includes(resistMessage)) {
        target._pendingStateResistMessages.push(resistMessage);
      }
    }
  };

  const _Window_BattleLog_displayActionResults =
    Window_BattleLog.prototype.displayActionResults;

  Window_BattleLog.prototype.displayActionResults = function(subject, target) {
    _Window_BattleLog_displayActionResults.call(this, subject, target);

    if (
      target &&
      target._pendingStateResistMessages &&
      target._pendingStateResistMessages.length > 0
    ) {
      for (const message of target._pendingStateResistMessages) {
        this.push("addText", message);
        this.push("wait");
        this.push("clear");
      }

      target._pendingStateResistMessages = [];
    }
  };
})();
