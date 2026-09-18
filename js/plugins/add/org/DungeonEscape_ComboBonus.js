//=============================================================================
// DungeonEscape_ComboBonus.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 連携属性(必中・耐性無視)のスキルに、弱点・特定ステートに対する
 * ボーナスダメージだけを追加で乗せるプラグイン (Ver1.2.0)
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ComboBonus.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 連携技は「連携属性・必中」で実装されており、通常の属性有効度
 * （弱点・耐性）の影響を受けません。これは「どんな相手にも確実に
 * フルダメージを通す」という連携技の強みですが、逆に「弱点を突いた
 * のに通常と同じダメージしか出ない」という側面もあります。
 *
 * このプラグインは、技本体の属性・命中判定には一切手を加えずに、
 * 「対象が特定の属性の弱点を持っていれば」「対象が特定のステートを
 * 持っていれば」という条件だけを見て、ダメージにボーナス倍率を
 * 追加で乗せます。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * スキルのメモ欄に以下のタグを記述してください（併用可）。
 *
 * <comboBonusIfWeak:属性ID>
 *   対象の指定属性に対する有効度(elementRate)が100%以上であれば、
 *   その実際の有効度をそのままダメージに掛ける。
 *   例: <comboBonusIfWeak:3>
 *     → 属性ID3(例:氷)の有効度が敵ごとに150%なら1.5倍、200%なら2倍、
 *       250%なら2.5倍……というように、敵側の実際の設定値がそのまま反映される。
 *       有効度が100%未満（耐性を持っている）の場合は何もしない
 *       （連携技の「耐性があっても確実にフルダメージ」という前提を守るため）。
 *
 *   複数属性を指定する場合はセミコロン区切りでまとめられる。
 *   例: <comboBonusIfWeak:2;3;4>
 *     → 火(2)・氷(3)・雷(4)のうち該当する属性の弱点倍率を、該当する分だけ
 *       全て掛け合わせる（複数属性弱点を同時に持つ敵ほど、ボーナスが大きくなる）。
 *
 *   なお、蔦・濡れなどのステートが「特定属性の弱点(200%等)」という特徴を
 *   ステート自身に持っている場合、elementRate()の時点で既にその効果が
 *   反映されているため、このタグだけで自動的に蔦・濡れの弱点ボーナスも
 *   拾うことができる（別途comboBonusIfStateでの指定は不要）。
 *
 * <comboBonusIfState:ステートID,倍率>
 *   対象が指定ステートを持っていれば、ダメージに倍率(%)を追加で乗せる。
 *   （こちらは元々の弱点属性のような数値を持たないステートが対象のため、
 *   従来通り手動で倍率を指定する方式のまま）
 *   例: <comboBonusIfState:60,150>
 *     → 対象がステートID60(濡れ)を持っていれば、ダメージを1.5倍にする
 *
 * <comboBonusIfState:60,150;53,130>
 *     → 濡れ(60)なら1.5倍、蔦(53)なら1.3倍（両方持っていれば両方適用、
 *       セミコロン区切りで複数指定可）
 *
 * <comboBonusCap:X>
 *   上記のボーナス適用後、最終ダメージがXを超える場合はXに切り詰める。
 *   複数の弱点・ステートボーナスが重なって極端な数値になりすぎるのを
 *   防ぐための上限設定（省略時は上限なし）。
 *   例: <comboBonusCap:1600>
 *     → ボーナスをどれだけ重ねても、最終ダメージは1600を超えない
 *
 * ------------------------------------------------------------------
 * ◆Ver1.1.0での変更点
 * ------------------------------------------------------------------
 * <comboBonusIfWeak>は、以前は「150%以上なら固定の倍率(手入力)を乗せる」
 * 方式でしたが、敵ごとに弱点の強さ(150%/200%等)がバラバラなのに、
 * 常に同じボーナスしか乗らないのは不自然という指摘を受け、
 * 「対象の実際の有効度をそのまま反映する」方式に変更しました。
 * これにより、倍率を手動指定する必要がなくなり(タグの引数も削除)、
 * 弱点が大きい敵ほど連携技のボーナスも大きくなる、という直感的な
 * 挙動になります。
 */

(() => {
  "use strict";

  function parseStatePairs(tagValue) {
    return String(tagValue)
      .split(";")
      .map(pair => pair.split(",").map(s => Number(s.trim())))
      .filter(pair => pair.length === 2 && !isNaN(pair[0]) && !isNaN(pair[1]));
  }

  const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
  Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);
    const item = this.item();

    if (value > 0 && item) {
      // 弱点ボーナス：対象の実際の属性有効度をそのまま反映
      if (item.meta.comboBonusIfWeak) {
        const elementIds = String(item.meta.comboBonusIfWeak)
          .split(";")
          .map(s => Number(s.trim()))
          .filter(n => !isNaN(n));
        for (const elementId of elementIds) {
          const rate = target.elementRate(elementId);
          if (rate >= 1.0) {
            value = Math.round(value * rate);
          }
        }
      }

      // 特定ステートボーナス（従来通り手動指定の倍率）
      if (item.meta.comboBonusIfState) {
        for (const [stateId, rate] of parseStatePairs(item.meta.comboBonusIfState)) {
          if (target.isStateAffected(stateId)) {
            value = Math.round(value * (rate / 100));
          }
        }
      }

      // ボーナス適用後の上限
      if (item.meta.comboBonusCap) {
        const cap = Number(item.meta.comboBonusCap);
        if (!isNaN(cap) && value > cap) {
          value = cap;
        }
      }
    }

    return value;
  };
})();
