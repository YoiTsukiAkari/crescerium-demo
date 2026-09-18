/*:
 * @target MZ
 * @plugindesc ダメージが端数処理で0になった場合でも、命中していれば
 * 「ダメージで解除」ステートの解除抽選が走るようにする修正パッチ Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ZeroDamageStateRemoval.js
 *
 * ------------------------------------------------------------------
 * ◆背景・目的
 * ------------------------------------------------------------------
 * RPGツクールMZの標準仕様では、「ダメージで解除」ステートの解除抽選
 * （Game_Battler.prototype.removeStatesByDamage）は、
 * Game_Battler.prototype.onDamage の中でしか呼ばれず、onDamageは
 * 「最終ダメージが1以上の時」しか呼ばれない（Game_Action.prototype.
 * executeHpDamage内の if (value > 0) 判定）。
 *
 * このため、「物理ダメージ率 * 1%」のような極端な被ダメージ軽減効果を
 * 持つステートの場合、四捨五入によって最終ダメージが0になる程度の
 * 攻撃では、命中していても解除抽選のチャンス自体が一度も来ない
 * （＝「ダメージで解除:100%」と設定しても絶対に解除されない）という
 * 事故が起きる。
 *
 * このプラグインは、命中してHP効果を持つ行動が実行された場合、
 * 最終ダメージが0であってもonDamage(0)を呼ぶようにする。
 * removeStatesByDamageは対象がその条件のステートを持っていない限り
 * 何もしないため、他の場面への副作用はない。
 */

(() => {
  "use strict";

  const _Game_Action_executeHpDamage = Game_Action.prototype.executeHpDamage;
  Game_Action.prototype.executeHpDamage = function(target, value) {
    _Game_Action_executeHpDamage.call(this, target, value);
    if (value === 0) {
      // valueがマイナス(=回復)の場合は元の処理のままonDamageを呼ばない。
      // 四捨五入でちょうど0になった「ダメージ」の時だけ追加で呼ぶ。
      target.onDamage(0);
    }
  };
})();
