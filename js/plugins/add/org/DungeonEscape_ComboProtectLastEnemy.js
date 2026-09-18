/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグで、それが原因で場の敵が0体になって
 * しまう場合にHPを1で止め、連携技の締め以外で戦闘が中途半端に
 * 終わらないようにするプラグイン Ver2.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ComboProtectLastEnemy.js
 *
 * ------------------------------------------------------------------
 * ◆背景
 * ------------------------------------------------------------------
 * 連携技(戦闘行動の強制で複数の技を連続実行する仕組み)の初段などで
 * 最後の1体を倒してしまうと、その後に残っている段の演出・テキストが、
 * 既に戦闘不能になった敵に対して流れ続けてから戦闘終了になり、不自然。
 *
 * このプラグインは、指定したスキルについて「そのダメージで場の敵が
 * 0体になってしまう(=戦闘が終わってしまう)場合、HPを1で止めて
 * 戦闘不能にしない」という制御を行う。締めの技にはタグを付けない
 * ことで、そこでは通常通り倒しきれるようにする。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 連携技のうち、「締め」以外の段（初段・中間段など）のスキルの
 * メモ欄に、以下のタグを記述してください。
 *
 *   <comboProtectLastEnemy>
 *
 * このタグを持つスキルのダメージが、場に残っている最後の1体の敵の
 * HPを0以下にする場合、HPは1で止まり、戦闘不能になりません。
 * 締めの技にはこのタグを付けないでください（そこで通常通り倒せます）。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・「場に残っている最後の1体」の判定は、このダメージ処理が始まる
 *   直前の生存状況を基準にします。
 * ・回復（マイナスダメージ）には影響しません。
 *
 * ------------------------------------------------------------------
 * ◆Ver2.0.0の変更点
 * ------------------------------------------------------------------
 * 連携技の中に、このタグを持つ段が2つ以上ある場合、1段目でHPが
 * 既に1になった後、2段目が「削れる余地が無い(1-1=0)」ため、
 * 本当に0ダメージになってしまう不具合を修正。「表示上のダメージ数値」
 * と「実際にHPを削る量」を分離し、実際のHP減少は1で止めつつ、
 * 表示上は本来のダメージ量がそのまま出るようにした。
 */

(() => {
  "use strict";

  const _Game_Action_executeHpDamage = Game_Action.prototype.executeHpDamage;
  Game_Action.prototype.executeHpDamage = function(target, value) {
    const item = this.item();
    if (
      item &&
      item.meta.comboProtectLastEnemy &&
      target.isEnemy() &&
      value > 0 &&
      target.hp - value <= 0
    ) {
      const aliveEnemies = $gameTroop.aliveMembers();
      const isLastEnemy = aliveEnemies.length === 1 && aliveEnemies[0] === target;
      if (isLastEnemy) {
        // 表示上のダメージ数値(displayValue)と、実際にHPを削る量
        // (actualReduction、HP1で止める)を分けて処理する。
        // 単純にvalueを差し替えるだけだと、既にHPが1になっている状態で
        // 更にこのタグ付きの段が来た場合、削れる余地が無く「0ダメージ」
        // になってしまうため
        const displayValue = value;
        const actualReduction = Math.max(0, target.hp - 1);
        this.makeSuccess(target);
        target.gainHp(-actualReduction);
        target.result().hpDamage = displayValue; // 表示だけは本来の数値に戻す
        if (displayValue > 0) {
          target.onDamage(actualReduction);
        }
        this.gainDrainedHp(displayValue);
        return;
      }
    }
    _Game_Action_executeHpDamage.call(this, target, value);
  };
})();
