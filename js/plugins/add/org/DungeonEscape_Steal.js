/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグ<steal>で、命中時にパーティの所持アイテムを
 * ランダムに2つ盗み、使用者(敵)が撃破された時にドロップとして返還します。
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_Steal.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 盗みを行わせたいスキルのメモ欄に以下を記述してください。
 *
 * <steal>
 *
 * このタグを持つスキルが命中すると、パーティが現在所持している
 * 「通常アイテム」（キーアイテム・コレクションアイテム・設定資料は
 * 対象外）からランダムに**1つ**を選び、所持数を1減らします。
 *
 * 盗んだアイテムは、そのスキルを使った敵（Game_Enemy）自身に記録され、
 * その敵が撃破された時、通常のドロップアイテムに追加される形で
 * パーティに返還されます。1体の敵が複数回盗んでいた場合は、
 * 盗んだ分すべてが返還されます。
 *
 * ダメージ効果を持たせたい場合は、通常通りスキルの「ダメージ」欄で
 * 設定してください。このプラグインは盗みの処理だけを担当します。
 *
 * バトルログには以下を表示します（スキル自体の使用メッセージ、
 * 例：「%1はアイテムを盗もうとした！」は、スキル側のメッセージ欄で
 * 別途設定してください）。
 *   盗みが成立した場合　　　：「(アイテム名)を盗まれた！」を1行表示
 *   盗めるアイテムがない場合：「しかしアイテムを持っていなかった！」
 *
 * ------------------------------------------------------------------
 * ◆行動パターンの自動制御
 * ------------------------------------------------------------------
 * <steal>タグ付きスキルは、パーティが盗める通常アイテムを1つも
 * 持っていない時、敵の行動パターンの候補から自動的に除外されます
 * （行動パターンの条件設定を変更する必要はありません）。
 * これにより、「盗めるものがない時はそもそも盗みを行わない」という
 * 挙動になります。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・盗みの対象は「通常アイテム」(itypeId===1)のうち、`<collectionItem>`
 *   `<referenceItem>`タグ（コレクション・設定資料）が付いていないものに
 *   限ります。武器・防具・キーアイテムも対象になりません。
 * ・アクター・敵どちらが使っても動作しますが、実際に使うのは
 *   基本的に敵側（スニーク等）を想定しています。
 * ・一度に盗む数を変えたい場合は、下記コードの
 *   DungeonEscape.stealRandomItems(1)の1を書き換えてください。
 * ・バトルログの文言を変更したい場合は、下記コードの
 *   push("addText", ...)の行を書き換えてください。
 */

var DungeonEscape = DungeonEscape || {};

(() => {
  "use strict";

  // パーティの所持アイテム(通常アイテムのみ、コレクション・設定資料は除く)
  // からランダムに1つ盗む
  // 戻り値: 盗んだアイテムのデータオブジェクト（$dataItems[x]）。盗めなければnull
  DungeonEscape.stealRandomItem = function() {
    const candidates = $gameParty.items().filter(item =>
      item.itypeId === 1 && !(item.meta.collectionItem || item.meta.referenceItem)
    );
    if (candidates.length === 0) return null;
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    $gameParty.loseItem(item, 1);
    return item;
  };

  // 上記をcount回繰り返す。盗めるアイテムがなくなった時点で打ち切る
  DungeonEscape.stealRandomItems = function(count) {
    const stolen = [];
    for (let i = 0; i < count; i++) {
      const item = DungeonEscape.stealRandomItem();
      if (!item) break;
      stolen.push(item);
    }
    return stolen;
  };

  const _Game_Action_apply = Game_Action.prototype.apply;
  Game_Action.prototype.apply = function(target) {
    _Game_Action_apply.call(this, target);

    const item = this.item();
    if (item && item.meta.steal && target.result().isHit()) {
      const subject = this.subject();
      if (subject.isEnemy()) {
        const stolenItems = DungeonEscape.stealRandomItems(1);
        if (BattleManager._logWindow) {
          if (stolenItems.length > 0) {
            for (const stolenItem of stolenItems) {
              BattleManager._logWindow.push("addText", `${stolenItem.name}を盗まれた！`);
            }
          } else {
            BattleManager._logWindow.push("addText", "しかしアイテムを持っていなかった！");
          }
        }
        if (stolenItems.length > 0) {
          subject._stolenItems = subject._stolenItems || [];
          subject._stolenItems.push(...stolenItems);
        }
      }
    }
  };

  // 撃破時、盗んだアイテムを通常のドロップ品に追加して返還する
  const _Game_Enemy_makeDropItems = Game_Enemy.prototype.makeDropItems;
  Game_Enemy.prototype.makeDropItems = function() {
    const drops = _Game_Enemy_makeDropItems.call(this);
    if (this._stolenItems && this._stolenItems.length > 0) {
      return drops.concat(this._stolenItems);
    }
    return drops;
  };

  // <steal>タグ付きスキルは、盗める通常アイテムが1つもない時は
  // 行動パターンの候補から除外する
  const _Game_Enemy_isActionValid = Game_Enemy.prototype.isActionValid;
  Game_Enemy.prototype.isActionValid = function(action) {
    if (!_Game_Enemy_isActionValid.call(this, action)) return false;
    const skill = $dataSkills[action.skillId];
    if (skill && skill.meta.steal) {
      return $gameParty.items().some(item =>
        item.itypeId === 1 && !(item.meta.collectionItem || item.meta.referenceItem)
      );
    }
    return true;
  };
})();

