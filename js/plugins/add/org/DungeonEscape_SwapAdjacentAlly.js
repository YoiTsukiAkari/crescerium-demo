/*:
 * @target MZ
 * @plugindesc ウィスプの「さまよう亡霊」用：使用者を、トループ内で隣り合う
 * 生存中の仲間とランダムに1体、配置順・見た目座標ともに入れ替えます Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_SwapAdjacentAlly.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * $gameTroop.members()（＝$gameTroop._enemiesそのもの）内で、指定した
 * 敵（subject）と、配置順で隣り合う生存中の仲間（両隣とも生存していれば
 * ランダムでどちらか）を1体選び、以下2つをまとめて入れ替えます。
 *
 * 1. トループ内の配置順そのもの（$gameTroop._enemies内の並び）
 *    → index()を使うあらゆる処理（ラストターゲット・行動順など）に
 *      正しく反映されます
 * 2. 見た目の座標（screenX / screenY）
 *    → 対応するSprite_Enemyを探してsetHome()を呼び出すため、
 *      画面表示にも即座に反映されます（RPGツクールMZの仕様上、
 *      Game_Enemy側の座標だけ書き換えても表示には反映されないため）
 *
 * 隣り合う生存中の相手がいない場合（例：生存者が自分1体のみ）は
 * 何もせずnullを返します。戦闘不能の敵がすぐ隣にいる場合は、それを
 * 飛び越えて、その先にいる最も近い生存中の敵を対象にします。
 *
 * ------------------------------------------------------------------
 * ◆使い方（コモンイベントのスクリプトから呼び出す例）
 * ------------------------------------------------------------------
 * スキル使用者（このスキルを使った敵）は、標準の仕組みで
 * $gameTempに記録されているので、以下のように取得できます。
 *
 *   const subject = $gameTroop.members()[$gameTemp.lastActionData(3) - 1];
 *   DungeonEscape.swapWithAdjacentAlly(subject);
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・自分1体しか生存していない、または自分が配置の端で片側にしか
 *   仲間がいない場合は、生存している側の隣とだけ入れ替え候補になります。
 * ・戦闘不能の敵とは入れ替えません（配置は詰めず、そのまま残します）。
 */

var DungeonEscape = DungeonEscape || {};

(() => {
  "use strict";

  function findSprite(enemy) {
    const scene = SceneManager._scene;
    if (!scene || !scene._spriteset || !scene._spriteset._enemySprites) {
      return null;
    }
    return scene._spriteset._enemySprites.find(s => s._enemy === enemy) || null;
  }

  function swapScreenPosition(a, b) {
    const ax = a.screenX();
    const ay = a.screenY();
    const bx = b.screenX();
    const by = b.screenY();

    a._screenX = bx;
    a._screenY = by;
    b._screenX = ax;
    b._screenY = ay;

    const spriteA = findSprite(a);
    const spriteB = findSprite(b);
    if (spriteA) spriteA.setHome(a.screenX(), a.screenY());
    if (spriteB) spriteB.setHome(b.screenX(), b.screenY());
  }

  // subject: 入れ替えの起点にする敵(Game_Enemy)
  // 戻り値: 実際に入れ替わった相手(Game_Enemy)。入れ替えが起きなかった場合はnull
  DungeonEscape.swapWithAdjacentAlly = function(subject) {
    if (!subject) return null;

    const members = $gameTroop.members(); // $gameTroop._enemiesそのもの(参照)
    const index = members.indexOf(subject);
    if (index < 0) return null;

    // 左方向：戦闘不能を飛び越えて、最も近い生存中の相手を探す
    let leftIndex = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (members[i] && members[i].isAlive()) {
        leftIndex = i;
        break;
      }
    }

    // 右方向：同様に、戦闘不能を飛び越えて最も近い生存中の相手を探す
    let rightIndex = -1;
    for (let i = index + 1; i < members.length; i++) {
      if (members[i] && members[i].isAlive()) {
        rightIndex = i;
        break;
      }
    }

    const candidates = [];
    if (leftIndex >= 0) candidates.push(leftIndex);
    if (rightIndex >= 0) candidates.push(rightIndex);
    if (candidates.length === 0) return null;

    const targetIndex = candidates[Math.floor(Math.random() * candidates.length)];
    const ally = members[targetIndex];

    // 見た目の座標を入れ替え
    swapScreenPosition(subject, ally);

    // トループ内の配置順そのものを入れ替え
    members[index] = ally;
    members[targetIndex] = subject;

    return ally;
  };
})();
