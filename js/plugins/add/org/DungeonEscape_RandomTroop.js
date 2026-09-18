/*:
 * @target MZ
 * @plugindesc トループの「名前」欄に書いた出現候補・出現率から、
 * 中身を完全ランダムに生成するプラグイン Ver4.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_RandomTroop.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 「何人出現するか」はDungeonEscape_DifficultyEncounter.js（難易度変数）
 * が担当し、このプラグインは「その枠に何が出現するか」だけを
 * ランダムに決めます。役割を分担して併用する前提のプラグインです。
 *
 * RPGツクールMZの「敵グループ」にはメモ欄が無いため、代わりに
 * トループの「名前」欄にタグを埋め込みます（トループ名はプレイヤーには
 * 表示されないので、自由に使って問題ありません）。中のメンバー一覧は
 * 空のままでOKです（実際には使われません）。
 *
 * 名前欄の書式（好きな表示ラベルを先頭に置いてOK。各項目は|区切り）:
 *
 *   表示ラベル|pool:枠の総数|guaranteed:敵ID|敵ID:重み,敵ID:重み,...
 *
 * 例（闇の魔石の道用トループ、最大5枠まで生成）:
 *   闇の魔石道|pool:5|guaranteed:23|21:2,22:2,23:4,24:2
 *
 * 「pool」は、DungeonEscape_DifficultyEncounter.js側の変数が取りうる
 * 最大値に合わせてください（例えばその道では難易度によって1〜5体まで
 * 変動する想定なら pool:5）。生成される枠のうち、中心の1枠だけを
 * 表示済み、残りを[途中から出現]相当の非表示状態にします。実際に
 * 何枠出現するかはDungeonEscape_DifficultyEncounter.js側の変数の値が
 * 決定し、そちらのプラグインが中心から外側へ向かって順に表示していきます。
 *
 * guaranteed:は省略可能です（省略した場合、全員が出現候補から抽選されます。
 * 指定した場合、中心枠に必ずこの敵が配置されます＝最少人数の時でも
 * 必ず出現します）。
 *
 * 「敵ID:重み」の形式が名前欄に1つも見つからないトループは、今まで通り
 * 通常のメンバー一覧がそのまま使われます（このプラグインは何もしません）。
 *
 * ------------------------------------------------------------------
 * ◆マップへの配置
 * ------------------------------------------------------------------
 * マップの「敵出現」設定で、このトループを対応するリージョンID制限付きで
 * 登録してください（敵出現エントリの編集画面で「対象リージョン」を
 * 指定できます）。道ごとに別のリージョンIDを振っておけば、
 * 道ごとに別のランダムトループを割り当てられます。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・生成された敵の初期座標は仮のものです。DungeonEscape_AutoAlignEnemies.js
 *   が実際のバトル画面表示位置を自動で整列し直すため、見た目には影響しません
 *   （このプラグインと併用する前提です）。
 * ・ドロップアイテム・経験値・お金は、生成された各敵（Game_Enemy）自身の
 *   データベース設定がそのまま使われます。
 * ・DungeonEscape_DifficultyEncounter.jsのプラグイン管理上の並び順は、
 *   このプラグインより後（下）にしてください（Game_Troop.setup()で
 *   メンバーを生成した後、BattleManager.startBattle()で表示枠数を
 *   決める、という順序で動作する必要があるためです）。
 */

(() => {
  "use strict";

  function parseRandomTroopTags(name) {
    if (!name) return null;

    // 「敵ID:重み」の形が1つ以上あるセグメントを出現候補リストとみなす
    const segments = name.split("|");
    const poolSegment = segments.find(seg => /^(\d+:\d+,)*\d+:\d+$/.test(seg.trim()));
    if (!poolSegment) return null; // このパターンが無ければ通常トループ扱い

    const enemies = poolSegment.trim().split(",").map(pair => {
      const [enemyId, weight] = pair.split(":").map(Number);
      return { enemyId, weight: Math.max(1, weight) };
    });

    const poolMatch = name.match(/pool:(\d+)/);
    const poolSize = poolMatch ? Number(poolMatch[1]) : 1;

    const guaranteedMatch = name.match(/guaranteed:(\d+)/);
    const guaranteedEnemyId = guaranteedMatch ? Number(guaranteedMatch[1]) : 0;

    return { poolSize, guaranteedEnemyId, enemies };
  }

  function pickWeightedEnemyId(entries) {
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll < 0) return entry.enemyId;
    }
    return entries[entries.length - 1].enemyId;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // DungeonEscape_DifficultyEncounter.js のcenterOutOrderと同じ考え方の中心index(0始まり)
  function centerIndex(n) {
    return Math.ceil(n / 2) - 1;
  }

  function buildRandomMemberList(pool) {
    const n = Math.max(1, pool.poolSize);
    const enemyIds = [];

    if (pool.guaranteedEnemyId > 0) {
      enemyIds.push(pool.guaranteedEnemyId);
    }
    while (enemyIds.length < n) {
      enemyIds.push(pickWeightedEnemyId(pool.enemies));
    }
    shuffle(enemyIds);

    // 見た目の初期座標は仮置き。AutoAlignEnemies.js が後で並べ直す前提
    const baseX = 400;
    const spacing = 120;
    const center = centerIndex(n);
    return enemyIds.map((enemyId, i) => ({
      enemyId,
      x: baseX + (i - (n - 1) / 2) * spacing,
      y: 440,
      hidden: i !== center // 中心以外は最初は隠す(難易度側が後で表示を決める)
    }));
  }

  const _Game_Troop_setup = Game_Troop.prototype.setup;
  Game_Troop.prototype.setup = function(troopId) {
    const troopData = $dataTroops[troopId];
    const pool = troopData && parseRandomTroopTags(troopData.name);

    if (!pool) {
      _Game_Troop_setup.call(this, troopId);
      return;
    }

    this.clear();
    this._troopId = troopId;
    this._enemies = [];
    for (const member of buildRandomMemberList(pool)) {
      const enemy = new Game_Enemy(member.enemyId, member.x, member.y);
      if (member.hidden) enemy.hide();
      this._enemies.push(enemy);
    }
    this.makeUniqueNames();
  };
})();

