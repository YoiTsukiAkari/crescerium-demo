/*:
 * @target MZ
 * @plugindesc セーブ・ロード画面の各セーブ枠に、難易度・現在地・
 * 実績バッジ(デーモン討伐/オーブ討伐/図鑑100%/宝箱全開封/
 * コレクション100%/設定資料100%)を表示するプラグイン Ver4.0.0
 * @author DungeonEscape開発用
 *
 * @param difficultyVariableId
 * @text 難易度変数ID
 * @type variable
 * @default 1
 * @desc 難易度を保持しているゲーム変数のID。
 *
 * @param difficultyIconStart
 * @text 難易度アイコン開始インデックス
 * @type number
 * @default 520
 * @desc 難易度1に対応するアイコンインデックス。難易度Nは
 * (この値 + N - 1)のアイコンを表示する(ローマ数字I〜VIIが520〜526の想定)。
 *
 * @param demonDefeatedSwitchId
 * @text デーモン討伐スイッチID
 * @type switch
 * @default 0
 * @desc ラスボス(奈落のデーモン)撃破時にONにするスイッチ。0で無効。
 *
 * @param demonDefeatedIcon
 * @text デーモン討伐アイコン
 * @type number
 * @default 536
 *
 * @param orbDefeatedSwitchId
 * @text オーブ討伐スイッチID
 * @type switch
 * @default 0
 * @desc 隠しボス(オーブ)撃破時にONにするスイッチ。0で無効。
 *
 * @param orbDefeatedIcon
 * @text オーブ討伐アイコン
 * @type number
 * @default 537
 *
 * @param bookCompleteIcon
 * @text 図鑑100%アイコン
 * @type number
 * @default 538
 *
 * @param collectionCompleteIcon
 * @text コレクションアイテム100%アイコン
 * @type number
 * @default 541
 *
 * @param referenceCompleteIcon
 * @text 設定資料100%アイコン
 * @type number
 * @default 542
 *
 * @param treasureCountVariableId
 * @text 宝箱開封数カウント変数ID
 * @type variable
 * @default 0
 * @desc マップ上の宝箱を開けるたびに+1するゲーム変数。0で無効。
 *
 * @param treasureTotalCount
 * @text 宝箱の総数
 * @type number
 * @default 0
 * @desc マップ上に存在する宝箱の総数。
 *
 * @param treasureCompleteIcon
 * @text 宝箱全開封アイコン
 * @type number
 * @default 540
 *
 * @help DungeonEscape_SavefileDifficulty.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * セーブした時点の「難易度」「いたマップの表示名」「実績バッジ4種」を、
 * セーブデータそのものとは別に「セーブ一覧に表示するための情報」として
 * 記録し、ロード/セーブ画面の各枠に表示します（セーブデータを実際に
 * 読み込まなくても、一覧画面の時点で表示されます）。
 *
 * 実績バッジは、セーブする瞬間に毎回その場で判定します(スイッチや
 * 変数を別途用意して管理する必要はありません)。
 *
 * ・デーモン討伐／オーブ討伐：指定したスイッチがONかどうかで判定
 * ・モンスター図鑑100%：ABMZ_EnemyBook.jsのGame_System.
 *   prototype.getRegisterPercent()が100かどうかで判定
 *   （<book:no>タグを付けた敵は、この判定でも除外されます）
 * ・コレクションアイテム100%／設定資料100%：それぞれ<collectionItem>
 *   ／<referenceItem>タグを付けたアイテムを、データベース上の該当
 *   アイテム全種、1つ以上所持しているかで判定
 * ・宝箱全開封：他の3つとは違い、自動計算ではなく専用の変数で
 *   カウントする方式。マップ上の各宝箱のイベントに「変数の操作：
 *   (指定した変数)+1」を1行追加してください。その変数の値が
 *   「宝箱の総数」パラメータと一致した時にバッジが表示されます。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 各プラグインパラメータで、スイッチID・アイコンインデックスを
 * 指定してください。デーモン討伐・オーブ討伐は、該当のスイッチIDを
 * 0のままにすると、そのバッジ自体を無効化できます。
 */

(() => {
  "use strict";

  const pluginName = "DungeonEscape_SavefileDifficulty";
  const params = PluginManager.parameters(pluginName);
  const difficultyVariableId = Number(params.difficultyVariableId || 1);
  const difficultyIconStart = Number(params.difficultyIconStart || 520);
  const demonDefeatedSwitchId = Number(params.demonDefeatedSwitchId || 0);
  const demonDefeatedIcon = Number(params.demonDefeatedIcon || 536);
  const orbDefeatedSwitchId = Number(params.orbDefeatedSwitchId || 0);
  const orbDefeatedIcon = Number(params.orbDefeatedIcon || 537);
  const bookCompleteIcon = Number(params.bookCompleteIcon || 538);
  const collectionCompleteIcon = Number(params.collectionCompleteIcon || 541);
  const referenceCompleteIcon = Number(params.referenceCompleteIcon || 542);
  const treasureCountVariableId = Number(params.treasureCountVariableId || 0);
  const treasureTotalCount = Number(params.treasureTotalCount || 0);
  const treasureCompleteIcon = Number(params.treasureCompleteIcon || 540);

  function isBookComplete() {
    if (!$gameSystem || typeof $gameSystem.getRegisterPercent !== "function") {
      return false;
    }
    return $gameSystem.getRegisterPercent() >= 100;
  }

  function isItemSetComplete(metaTag) {
    const targetItems = $dataItems.filter(item => item && item.meta[metaTag]);
    if (targetItems.length === 0) return false;
    return targetItems.every(item => $gameParty.hasItem(item, false));
  }

  function isTreasureComplete() {
    if (treasureCountVariableId <= 0 || treasureTotalCount <= 0) return false;
    return $gameVariables.value(treasureCountVariableId) >= treasureTotalCount;
  }

  const _DataManager_makeSavefileInfo = DataManager.makeSavefileInfo;
  DataManager.makeSavefileInfo = function() {
    const info = _DataManager_makeSavefileInfo.call(this);
    info.difficulty = $gameVariables.value(difficultyVariableId);
    info.mapName = $dataMap ? $dataMap.displayName : "";
    info.demonDefeated = demonDefeatedSwitchId > 0 && $gameSwitches.value(demonDefeatedSwitchId);
    info.orbDefeated = orbDefeatedSwitchId > 0 && $gameSwitches.value(orbDefeatedSwitchId);
    info.bookComplete = isBookComplete();
    info.collectionComplete = isItemSetComplete("collectionItem");
    info.referenceComplete = isItemSetComplete("referenceItem");
    info.treasureComplete = isTreasureComplete();
    return info;
  };

  const _Window_SavefileList_drawContents = Window_SavefileList.prototype.drawContents;
  Window_SavefileList.prototype.drawContents = function(info, rect) {
    _Window_SavefileList_drawContents.call(this, info, rect);

    // マップ名(表示名)と難易度アイコンを、それぞれ独立した固定位置に表示する
    // (1つの文字列にまとめると、マップ名の長さでアイコンの位置がずれるため)
    const mapName = info.mapName || "";
    const y = rect.y + 4;
    if (mapName) {
      const nameX = rect.x + 204;
      this.drawTextEx(mapName, nameX, y, 160);
    }
    if (info.difficulty) {
      const iconIndex = difficultyIconStart + info.difficulty - 1;
      const iconX = rect.x + 204 + 150;
      this.drawTextEx(`\\I[${iconIndex}]`, iconX, y, 40);
    }

    // 実績バッジを、難易度アイコンの右側に横並びで表示する
    const badgeIcons = [];
    if (info.demonDefeated) badgeIcons.push(demonDefeatedIcon);
    if (info.orbDefeated) badgeIcons.push(orbDefeatedIcon);
    if (info.bookComplete) badgeIcons.push(bookCompleteIcon);
    if (info.treasureComplete) badgeIcons.push(treasureCompleteIcon);
    if (info.collectionComplete) badgeIcons.push(collectionCompleteIcon);
    if (info.referenceComplete) badgeIcons.push(referenceCompleteIcon);

    if (badgeIcons.length > 0) {
      const badgeX = rect.x + 204 + 150 + 40;
      const badgeText = badgeIcons.map(idx => `\\I[${idx}]`).join("");
      this.drawTextEx(badgeText, badgeX, y, 40 * badgeIcons.length + 10);
    }
  };
})();
