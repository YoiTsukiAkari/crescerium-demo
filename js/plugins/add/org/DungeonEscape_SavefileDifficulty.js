/*:
 * @target MZ
 * @plugindesc セーブ画面に難易度・現在地・実績・プレイデータIDを表示し、
 * ボス撃破情報をプレイデータ単位で永続化します Ver5.0.0
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
 * (この値 + N - 1)のアイコンを表示します。
 *
 * @param demonDefeatedSwitchId
 * @text デーモン討伐スイッチID
 * @type switch
 * @default 0
 * @desc デーモン撃破時にONにするスイッチ。ONになった事実はプレイデータ単位で永続化されます。0で無効。
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
 * @desc オーブ撃破時にONにするスイッチ。ONになった事実はプレイデータ単位で永続化されます。0で無効。
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
 * @param showPlayDataId
 * @text プレイデータIDを表示
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @default true
 * @desc セーブ枠の右上に、同じ冒険を識別するための短縮IDを表示します。
 *
 * @param playDataIdLabel
 * @text プレイデータIDのラベル
 * @type string
 * @default ID:
 * @desc セーブ枠右上に表示するIDの前置き文字。
 *
 * @param playDataIdDisplayLength
 * @text 表示IDの文字数
 * @type number
 * @min 4
 * @max 8
 * @default 6
 * @desc 画面に表示する短縮IDの文字数。内部ではより長い固有IDを保持します。
 *
 * @param playDataIdFontSize
 * @text ID文字サイズ
 * @type number
 * @min 10
 * @max 28
 * @default 16
 *
 * @param playDataIdColor
 * @text ID文字色
 * @type string
 * @default #999999
 * @desc CSS形式の文字色。例: #999999
 *
 * @help DungeonEscape_SavefileDifficulty.js
 *
 * ------------------------------------------------------------------
 * ◆Ver5.0.0 追加機能
 * ------------------------------------------------------------------
 * 新規ゲーム開始時に「プレイデータID」を自動発行します。
 * 同じプレイデータから作られた複数のセーブには同じIDが保存されます。
 * 別のニューゲームには別IDが発行されます。
 *
 * デーモン討伐スイッチ／オーブ討伐スイッチが一度でもONになると、
 * その事実を「プレイデータIDごとの永続記録」として保存します。
 *
 * 例：
 *  1. ボス前でセーブ
 *  2. ボスを倒して討伐スイッチをON
 *  3. エンディング後にタイトルへ戻る
 *  4. 1のボス前セーブをロード
 *
 * この場合、HP・消費アイテム・現在地などはボス前の状態へ戻りますが、
 * 同じプレイデータIDなので討伐スイッチだけは自動的にONへ復元されます。
 * 別のニューゲームには引き継がれません。
 *
 * ボス撃破イベント側では、従来どおり指定した通常スイッチをONにするだけで
 * 構いません。追加のプラグインコマンドは不要です。
 *
 * セーブ画面では、ボス撃破後にボス前セーブを再保存しなくても、
 * 同じプレイデータIDを持つセーブ枠すべてに撃破アイコンが表示されます。
 *
 * ------------------------------------------------------------------
 * ◆既存機能
 * ------------------------------------------------------------------
 * ・難易度：指定変数の値から表示
 * ・現在地：マップの表示名を表示
 * ・デーモン／オーブ：指定スイッチ + プレイデータ単位の永続記録
 * ・モンスター図鑑100%：ABMZ_EnemyBook.js の
 *   Game_System.prototype.getRegisterPercent() が100以上かで判定
 * ・コレクション100%：<collectionItem> タグ付きアイテムを全種類所持で判定
 * ・設定資料100%：<referenceItem> タグ付きアイテムを全種類所持で判定
 * ・宝箱全開封：指定変数が「宝箱の総数」以上で判定
 *
 * ------------------------------------------------------------------
 * ◆旧セーブについて
 * ------------------------------------------------------------------
 * Ver5.0.0導入前のセーブにはプレイデータIDがありません。
 * そのセーブをロードした時点で新しいIDを自動発行します。
 * そのため、導入前に作成済みの複数セーブを「同じ冒険」と自動判定することは
 * できません。製品版を新規ゲームから開始する場合は問題ありません。
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

  const showPlayDataId = String(params.showPlayDataId || "true") === "true";
  const playDataIdLabel = params.playDataIdLabel !== undefined ? String(params.playDataIdLabel) : "ID: ";
  const playDataIdDisplayLength = Math.max(4, Math.min(8, Number(params.playDataIdDisplayLength || 6)));
  const playDataIdFontSize = Number(params.playDataIdFontSize || 16);
  const playDataIdColor = String(params.playDataIdColor || "#999999");

  const RECORDS_CONFIG_KEY = "_dungeonEscapePlayDataRecords";
  const PLAY_DATA_ID_KEY = "_dungeonEscapePlayDataId";
  const RANDOM_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

  // ------------------------------------------------------------------
  // プレイデータID
  // ------------------------------------------------------------------

  function makeRandomCode(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
    }
    return result;
  }

  function generatePlayDataId() {
    const displayCode = makeRandomCode(8);
    const timeCode = Date.now().toString(36).toUpperCase();
    const extraCode = makeRandomCode(8);
    return `${displayCode}-${timeCode}-${extraCode}`;
  }

  const _Game_System_initialize = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    this[PLAY_DATA_ID_KEY] = generatePlayDataId();
  };

  Game_System.prototype.dungeonEscapePlayDataId = function() {
    if (!this[PLAY_DATA_ID_KEY]) {
      this[PLAY_DATA_ID_KEY] = generatePlayDataId();
    }
    return this[PLAY_DATA_ID_KEY];
  };

  function currentPlayDataId() {
    if (!$gameSystem || typeof $gameSystem.dungeonEscapePlayDataId !== "function") {
      return "";
    }
    return $gameSystem.dungeonEscapePlayDataId();
  }

  function shortPlayDataId(playDataId) {
    if (!playDataId) return "";
    const firstPart = String(playDataId).split("-")[0];
    return firstPart.slice(0, playDataIdDisplayLength);
  }

  // ------------------------------------------------------------------
  // プレイデータIDごとのボス撃破記録
  // ConfigManagerに保存することで、通常セーブをロードしても巻き戻らない。
  // ------------------------------------------------------------------

  function ensureRecordTable() {
    if (!ConfigManager[RECORDS_CONFIG_KEY] || typeof ConfigManager[RECORDS_CONFIG_KEY] !== "object") {
      ConfigManager[RECORDS_CONFIG_KEY] = {};
    }
    return ConfigManager[RECORDS_CONFIG_KEY];
  }

  const _ConfigManager_makeData = ConfigManager.makeData;
  ConfigManager.makeData = function() {
    const config = _ConfigManager_makeData.call(this);
    config.dungeonEscapePlayDataRecords = ensureRecordTable();
    return config;
  };

  const _ConfigManager_applyData = ConfigManager.applyData;
  ConfigManager.applyData = function(config) {
    _ConfigManager_applyData.call(this, config);
    const records = config ? config.dungeonEscapePlayDataRecords : null;
    this[RECORDS_CONFIG_KEY] = records && typeof records === "object" ? records : {};
  };

  function getPlayRecord(playDataId, createIfMissing = false) {
    if (!playDataId) return null;
    const records = ensureRecordTable();
    if (!records[playDataId] && createIfMissing) {
      records[playDataId] = {
        demonDefeated: false,
        orbDefeated: false
      };
    }
    return records[playDataId] || null;
  }

  function isPersistentBossDefeated(playDataId, key) {
    const record = getPlayRecord(playDataId, false);
    return !!(record && record[key]);
  }

  function setPersistentBossDefeated(playDataId, key) {
    if (!playDataId) return;
    const record = getPlayRecord(playDataId, true);
    if (record[key]) return;
    record[key] = true;
    const saveResult = ConfigManager.save();
    if (saveResult && typeof saveResult.catch === "function") {
      saveResult.catch(error => {
        console.error(`${pluginName}: プレイデータ撃破情報の保存に失敗しました。`, error);
      });
    }
  }

  function persistBossFlagForSwitch(switchId) {
    const playDataId = currentPlayDataId();
    if (!playDataId) return;

    if (switchId === demonDefeatedSwitchId && demonDefeatedSwitchId > 0) {
      setPersistentBossDefeated(playDataId, "demonDefeated");
    }
    if (switchId === orbDefeatedSwitchId && orbDefeatedSwitchId > 0) {
      setPersistentBossDefeated(playDataId, "orbDefeated");
    }
  }

  // 通常のイベントコマンドで討伐スイッチをONにするだけで永続記録する。
  const _Game_Switches_setValue = Game_Switches.prototype.setValue;
  Game_Switches.prototype.setValue = function(switchId, value) {
    _Game_Switches_setValue.call(this, switchId, value);
    if (value === true) {
      persistBossFlagForSwitch(switchId);
    }
  };

  // 旧方式のセーブで既に討伐スイッチがONなら、その情報も永続記録へ移行する。
  // 逆に永続記録がある場合は、古いボス前セーブをロードしてもスイッチをONへ戻す。
  function synchronizePersistentBossFlags() {
    if (!$gameSwitches || !$gameSystem) return;

    const playDataId = currentPlayDataId();
    if (!playDataId) return;

    if (demonDefeatedSwitchId > 0) {
      if ($gameSwitches.value(demonDefeatedSwitchId)) {
        setPersistentBossDefeated(playDataId, "demonDefeated");
      } else if (isPersistentBossDefeated(playDataId, "demonDefeated")) {
        $gameSwitches.setValue(demonDefeatedSwitchId, true);
      }
    }

    if (orbDefeatedSwitchId > 0) {
      if ($gameSwitches.value(orbDefeatedSwitchId)) {
        setPersistentBossDefeated(playDataId, "orbDefeated");
      } else if (isPersistentBossDefeated(playDataId, "orbDefeated")) {
        $gameSwitches.setValue(orbDefeatedSwitchId, true);
      }
    }
  }

  const _DataManager_extractSaveContents = DataManager.extractSaveContents;
  DataManager.extractSaveContents = function(contents) {
    _DataManager_extractSaveContents.call(this, contents);
    synchronizePersistentBossFlags();
  };

  // ------------------------------------------------------------------
  // 既存の実績判定
  // ------------------------------------------------------------------

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

  // ------------------------------------------------------------------
  // セーブ一覧用情報
  // ------------------------------------------------------------------

  const _DataManager_makeSavefileInfo = DataManager.makeSavefileInfo;
  DataManager.makeSavefileInfo = function() {
    synchronizePersistentBossFlags();

    const info = _DataManager_makeSavefileInfo.call(this);
    const playDataId = currentPlayDataId();

    info.playDataId = playDataId;
    info.difficulty = $gameVariables.value(difficultyVariableId);
    info.mapName = $dataMap ? $dataMap.displayName : "";

    info.demonDefeated = demonDefeatedSwitchId > 0 && (
      $gameSwitches.value(demonDefeatedSwitchId) ||
      isPersistentBossDefeated(playDataId, "demonDefeated")
    );

    info.orbDefeated = orbDefeatedSwitchId > 0 && (
      $gameSwitches.value(orbDefeatedSwitchId) ||
      isPersistentBossDefeated(playDataId, "orbDefeated")
    );

    info.bookComplete = isBookComplete();
    info.collectionComplete = isItemSetComplete("collectionItem");
    info.referenceComplete = isItemSetComplete("referenceItem");
    info.treasureComplete = isTreasureComplete();
    return info;
  };

  // ------------------------------------------------------------------
  // セーブ一覧描画
  // ------------------------------------------------------------------

  const _Window_SavefileList_drawContents = Window_SavefileList.prototype.drawContents;
  Window_SavefileList.prototype.drawContents = function(info, rect) {
    _Window_SavefileList_drawContents.call(this, info, rect);

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

    // セーブ時点の情報ではなく、プレイデータIDごとの最新の撃破記録を参照する。
    // これにより「ボス前セーブ」にも撃破後すぐ実績アイコンが表示される。
    const playDataId = info.playDataId || "";
    const demonDefeated = info.demonDefeated || isPersistentBossDefeated(playDataId, "demonDefeated");
    const orbDefeated = info.orbDefeated || isPersistentBossDefeated(playDataId, "orbDefeated");

    const badgeIcons = [];
    if (demonDefeated) badgeIcons.push(demonDefeatedIcon);
    if (orbDefeated) badgeIcons.push(orbDefeatedIcon);
    if (info.bookComplete) badgeIcons.push(bookCompleteIcon);
    if (info.treasureComplete) badgeIcons.push(treasureCompleteIcon);
    if (info.collectionComplete) badgeIcons.push(collectionCompleteIcon);
    if (info.referenceComplete) badgeIcons.push(referenceCompleteIcon);

    if (badgeIcons.length > 0) {
      const badgeX = rect.x + 204 + 150 + 40;
      const badgeText = badgeIcons.map(index => `\\I[${index}]`).join("");
      this.drawTextEx(badgeText, badgeX, y, 40 * badgeIcons.length + 10);
    }

    // 右上にプレイデータIDを薄い文字で表示する。
    if (showPlayDataId && playDataId) {
      const displayId = shortPlayDataId(playDataId);
      const label = playDataIdLabel && /\s$/.test(playDataIdLabel)
        ? playDataIdLabel
        : (playDataIdLabel ? `${playDataIdLabel} ` : "");
      const idText = `${label}${displayId}`;
      const idWidth = 190;
      const idX = rect.x + rect.width - idWidth - 12;

      const oldFontSize = this.contents.fontSize;
      const oldTextColor = this.contents.textColor;
      const oldPaintOpacity = this.contents.paintOpacity;

      this.contents.fontSize = playDataIdFontSize;
      this.changeTextColor(playDataIdColor);
      this.contents.paintOpacity = 210;
      this.drawText(idText, idX, y, idWidth, "right");

      this.contents.fontSize = oldFontSize;
      this.contents.textColor = oldTextColor;
      this.contents.paintOpacity = oldPaintOpacity;
    }
  };
})();
