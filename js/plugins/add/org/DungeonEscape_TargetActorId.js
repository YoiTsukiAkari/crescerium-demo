/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグで、敵の単体攻撃対象を指定Actor IDに固定します Ver1.1.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_TargetActorId.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 対象を固定したい「スキル」のメモ欄に、以下のタグを記述してください。
 *
 *   <targetActorId:2>
 *
 * 例：
 *   セラのActor IDが2の場合、クリムゾンブラストのメモ欄に
 *
 *   <targetActorId:2>
 *
 * と記述すると、敵がそのスキルを使用した時は必ずセラを対象候補にします。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.1.0
 * ------------------------------------------------------------------
 * Ver1.0.0 では Game_Action.makeTargets() 自体を上書きしていたため、
 * DungeonEscape_Cover.js も同じ makeTargets() を拡張している場合、
 * プラグインの読み込み順によって「庇う」処理を飛ばしてしまう問題が
 * ありました。
 *
 * Ver1.1.0 では makeTargets() には触れず、
 * その内部で呼ばれる targetsForOpponents() の対象決定だけを変更します。
 *
 * これにより、
 *
 *   クリムゾンブラスト
 *     ↓
 *   本来の対象はセラ
 *     ↓
 *   DungeonEscape_Cover.js が makeTargets() で対象を確認
 *     ↓
 *   クレイが「庇う」状態ならクレイへ肩代わり
 *
 * という順序になります。
 *
 * ------------------------------------------------------------------
 * ◆仕様
 * ------------------------------------------------------------------
 * ・敵が使用する「敵単体対象」のスキルだけに適用されます。
 * ・タグが無いスキルはRPGツクールMZ標準の対象選択のままです。
 * ・味方が使用する場合は何も変更しません。
 * ・指定Actorが戦闘メンバーにいない、または戦闘不能の場合は、
 *   標準の対象選択へフォールバックします。
 * ・複数対象、全体対象、ランダム複数対象には適用しません。
 * ・DungeonEscape_Cover.js の「庇う」を通過できるよう、
 *   Game_Action.makeTargets() は上書きしません。
 */

(() => {
  "use strict";

  const _Game_Action_targetsForOpponents =
    Game_Action.prototype.targetsForOpponents;

  Game_Action.prototype.targetsForOpponents = function() {
    const subject = this.subject();
    const item = this.item();

    if (
      subject &&
      subject.isEnemy &&
      subject.isEnemy() &&
      item &&
      item.meta &&
      item.meta.targetActorId !== undefined &&
      this.isForOpponent() &&
      this.isForOne() &&
      !this.isForRandom()
    ) {
      const actorId = Number(item.meta.targetActorId);
      const actor = $gameActors.actor(actorId);

      if (
        Number.isInteger(actorId) &&
        actorId > 0 &&
        actor &&
        actor.isAlive() &&
        $gameParty.battleMembers().includes(actor)
      ) {
        // ここでは「本来の対象」を指定Actorに固定するだけ。
        // repeatTargets() や DungeonEscape_Cover.js の肩代わり処理は
        // この後の Game_Action.makeTargets() 側で通常どおり実行される。
        return [actor];
      }
    }

    return _Game_Action_targetsForOpponents.call(this);
  };
})();
