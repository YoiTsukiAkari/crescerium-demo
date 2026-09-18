/*:
 * @target MZ
 * @plugindesc アイテムメニューに「コレクション」「設定資料」の
 * カテゴリを追加し、表示順を指定できるようにするプラグイン Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_ItemCategoryExtend.js
 *
 * ------------------------------------------------------------------
 * ◆背景
 * ------------------------------------------------------------------
 * RPGツクールMZ標準のアイテムの「分類」は「通常アイテム」「大事な
 * もの」の2種類しか無く、データベースのUIからは増やせない。
 * このプラグインは、アイテムのメモ欄タグを使って「コレクション」
 * 「設定資料」という2つの独自カテゴリを追加し、カテゴリタブの並び順も
 * 自由に指定できるようにする。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * コレクション扱いにしたいアイテムのメモ欄に：
 *   <collectionItem>
 *
 * 設定資料扱いにしたいアイテムのメモ欄に：
 *   <referenceItem>
 *
 * このタグが付いたアイテムは、「分類」が「通常アイテム」のままでも
 * (「アイテム」タブには出さず)自動的に該当カテゴリの方にだけ表示
 * されるようになる。
 *
 * 「コレクション」「設定資料」タブは、「大事なもの」と同じく個数は
 * 表示されない。
 *
 * 「コレクション」「設定資料」タブはどちらも、該当タグ付きアイテムを
 * 1つも所持していない間はタブ自体が表示されない。
 *
 * カテゴリタブの並び順は「アイテム」→「大事なもの」→「コレクション」
 * →「設定資料」に固定している（変更したい場合はこのプラグイン内の
 * makeCommandListの並びを直接書き換えてください）。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・「武器」「防具」タブは、システム2の表示設定にそのまま従います
 *   （この2つの間に割り込ませたい場合は、別途相談してください）。
 * ・「コレクション」「設定資料」タブは、該当タグ付きアイテムを
 *   1つも所持していなくても常に表示されます（空でもタブ自体は出る）。
 */

(() => {
  "use strict";

  Window_ItemCategory.prototype.makeCommandList = function() {
    if (this.needsCommand("item")) {
      this.addCommand(TextManager.item, "item");
    }
    if (this.needsCommand("weapon")) {
      this.addCommand(TextManager.weapon, "weapon");
    }
    if (this.needsCommand("armor")) {
      this.addCommand(TextManager.armor, "armor");
    }
    if (this.needsCommand("keyItem")) {
      this.addCommand(TextManager.keyItem, "keyItem");
    }
    // コレクション・設定資料は、1つも所持していない間はタブ自体を出さない
    const hasAnyCollectionItem = $gameParty
      .items()
      .some(item => item.meta.collectionItem);
    if (hasAnyCollectionItem) {
      this.addCommand("コレクション", "collection");
    }
    const hasAnyReferenceItem = $gameParty
      .items()
      .some(item => item.meta.referenceItem);
    if (hasAnyReferenceItem) {
      this.addCommand("設定資料", "reference");
    }
  };

  const _Window_ItemList_needsNumber = Window_ItemList.prototype.needsNumber;
  Window_ItemList.prototype.needsNumber = function() {
    if (this._category === "collection" || this._category === "reference") {
      return false;
    }
    return _Window_ItemList_needsNumber.call(this);
  };

  const _Window_ItemList_includes = Window_ItemList.prototype.includes;
  Window_ItemList.prototype.includes = function(item) {
    if (this._category === "collection") {
      return DataManager.isItem(item) && !!(item && item.meta.collectionItem);
    }
    if (this._category === "reference") {
      return DataManager.isItem(item) && !!(item && item.meta.referenceItem);
    }
    if (this._category === "item") {
      return (
        DataManager.isItem(item) &&
        item.itypeId === 1 &&
        !(item.meta.collectionItem || item.meta.referenceItem)
      );
    }
    return _Window_ItemList_includes.call(this, item);
  };
})();
