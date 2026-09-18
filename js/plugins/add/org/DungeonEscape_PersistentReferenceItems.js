/*:
 * @target MZ
 * @plugindesc アイテムのメモ欄タグで、一度入手した「設定資料」アイテムを
 * 全セーブデータ共通で(新規ゲームでも)持っている状態にするプラグイン
 * Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_PersistentReferenceItems.js
 *
 * ------------------------------------------------------------------
 * ◆背景
 * ------------------------------------------------------------------
 * 通常、アイテムの所持状況は各セーブデータ($gameParty)ごとに独立して
 * いる。ギャラリー・設定資料のように「一度見たら、以後どのセーブ
 * データでも(新規ゲームでも)閲覧できる」ようにしたい場合、通常の
 * セーブの仕組みとは別の場所に記録する必要がある。
 *
 * このプラグインは、ツクールMZ標準の「config.rpgsave」等と同じ仕組み
 * (StorageManager.saveObject/loadObject、セーブスロットとは別の
 * 共通ファイル)を使って、一度入手した設定資料アイテムのIDを記録する。
 * 新規ゲーム開始時・セーブデータのロード時、記録されている設定資料
 * アイテムを自動的にパーティへ付与する。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 対象のアイテム(既に<referenceItem>タグを付けている、設定資料
 * カテゴリのアイテム)は、そのままで自動的にこのプラグインの対象に
 * なります。特別な追加タグは不要です。
 *
 * 入手させる時は、今まで通りイベントコマンド「アイテムの増減」で
 * +1してください。その瞬間に自動で永続記録され、以降はどのセーブ
 * データでも(新規ゲームでも)そのアイテムを持った状態になります。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・記録は「入手したかどうか」のみです。個数は1個で管理され、
 *   複数個持たせる用途には対応していません。
 * ・記録を消去する手段は用意していません(消したい場合は、該当の
 *   セーブファイル群と同じ場所にある「referenceItems.rpgsave」を
 *   手動で削除してください)。
 */

(() => {
  "use strict";

  const SAVE_NAME = "referenceItems";
  let unlockedIds = [];
  let loaded = false;

  function loadUnlockedIds() {
    return StorageManager.loadObject(SAVE_NAME)
      .then(list => {
        unlockedIds = Array.isArray(list) ? list : [];
        loaded = true;
        console.log(`[ReferenceItemsDebug] 読み込み成功: ${JSON.stringify(unlockedIds)}`);
      })
      .catch(e => {
        unlockedIds = [];
        loaded = true;
        console.log(`[ReferenceItemsDebug] 読み込み失敗(初回等で正常な場合あり): ${e}`);
      });
  }

  function saveUnlockedIds() {
    StorageManager.saveObject(SAVE_NAME, unlockedIds)
      .then(() => {
        console.log(`[ReferenceItemsDebug] 保存成功: ${JSON.stringify(unlockedIds)}`);
      })
      .catch(e => {
        console.log(`[ReferenceItemsDebug] 保存失敗: ${e}`);
      });
  }

  function grantPersistedReferenceItems() {
    console.log(`[ReferenceItemsDebug] 付与処理を実行: ${JSON.stringify(unlockedIds)}`);
    for (const itemId of unlockedIds) {
      const item = $dataItems[itemId];
      if (item && $gameParty.numItems(item) === 0) {
        $gameParty.gainItem(item, 1);
      }
    }
  }

  // アイテムを入手した瞬間、設定資料なら永続記録する
  const _Game_Party_gainItem = Game_Party.prototype.gainItem;
  Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
    _Game_Party_gainItem.call(this, item, amount, includeEquip);
    if (
      item &&
      DataManager.isItem(item) &&
      item.meta.referenceItem &&
      amount > 0 &&
      !unlockedIds.includes(item.id)
    ) {
      unlockedIds.push(item.id);
      loaded = true; // メモリ上のunlockedIdsが最新の状態であることを明示する
      saveUnlockedIds();
    }
  };

  const _DataManager_setupNewGame = DataManager.setupNewGame;
  DataManager.setupNewGame = function() {
    _DataManager_setupNewGame.call(this);
    console.log(`[ReferenceItemsDebug] setupNewGame呼び出し loaded=${loaded}`);
    if (loaded) {
      grantPersistedReferenceItems();
    } else {
      loadUnlockedIds().then(() => grantPersistedReferenceItems());
    }
  };

  const _DataManager_loadGame = DataManager.loadGame;
  DataManager.loadGame = function(savefileId) {
    return _DataManager_loadGame.call(this, savefileId).then(result => {
      console.log(`[ReferenceItemsDebug] loadGame呼び出し loaded=${loaded}`);
      if (loaded) {
        grantPersistedReferenceItems();
      } else {
        return loadUnlockedIds().then(() => {
          grantPersistedReferenceItems();
          return result;
        });
      }
      return result;
    });
  };
})();
