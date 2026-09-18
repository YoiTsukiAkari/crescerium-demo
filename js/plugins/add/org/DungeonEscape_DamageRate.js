/*:
 * @target MZ
 * @plugindesc ステートのメモ欄タグで、特定属性の技を使った時の
 * 与ダメージレート補正、および「物理攻撃を無効化するステート」を
 * 最終ダメージに直接反映させるプラグイン (Ver1.1.0)
 * @help
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <dmgRate:属性ID,倍率>    その属性の技を使った時、与えるダメージを倍率%にする
 * 属性IDを0にすると「全属性（属性なしも含む）」を対象にできます。
 *
 * <blockPhysical>          このステートを持つ対象は、命中タイプが「物理攻撃」の
 *                           技のダメージを一律0にする（属性は問わない）
 *
 * 例:
 * <dmgRate:1,50>     物理（属性ID:1）で与えるダメージを50%にする
 * <dmgRate:0,80>      属性を問わず、与えるダメージを80%にする
 * <blockPhysical>     空中ステートなどに設定し、近接攻撃を無効化する
 *
 * 複数のステートを重ねて持っている場合は、dmgRateは該当するものすべてを掛け合わせます。
 * blockPhysicalは、対象がそのステートを1つでも持っていれば発動します。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.1.0での変更点
 * ------------------------------------------------------------------
 * `DungeonEscape_ChainTarget.js`の`_chainTargetFlag`・`_splashTargetFlag`を
 * 見て一律50%に減衰させる処理を削除した。この一律減衰は、技ごとに
 * 減衰率を変えたい（霞払いは70%等）という要望と噛み合わず、各スキルの
 * ダメージ計算式に直接書かれた減衰処理（例:霞払いの70%）と二重に
 * 適用されてしまっていたための削除。巻き込みダメージの減衰は、今後は
 * 各スキルのダメージ計算式側で個別に設定すること。
 */

(() => {
  const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;

  Game_Action.prototype.makeDamageValue = function(target, critical) {
    let value = _Game_Action_makeDamageValue.call(this, target, critical);
    const item = this.item();

    if (value > 0) {
      const elementId = item ? item.damage.elementId : 0;
      const subject = this.subject();
      const rate = getRate(subject, elementId);
      value = Math.round(value * rate);
    }

    // 「物理攻撃を無効化」タグを持つステートの判定
    if (value > 0 && item && item.hitType === 1 && hasBlockPhysical(target)) {
      value = 0;
    }

    return value;
  };

  function getRate(battler, elementId) {
    let rate = 1;
    for (const state of battler.states()) {
      const tag = state.meta.dmgRate;
      if (!tag) continue;
      const parts = String(tag).split(",");
      const tagElementId = Number(parts[0]);
      const tagRate = Number(parts[1]);
      if (tagElementId === 0 || tagElementId === elementId) {
        rate *= tagRate / 100;
      }
    }
    return rate;
  }

  function hasBlockPhysical(battler) {
    return battler.states().some(state => "blockPhysical" in state.meta);
  }
})();