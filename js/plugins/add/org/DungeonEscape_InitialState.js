//=============================================================================
// DungeonEscape_InitialState.js
//=============================================================================

/*:ja
 * @target MZ
 * @plugindesc 敵キャラ/アクターのメモ欄タグで、戦闘開始時・毎ラウンド開始時にステートを自動付与します (Ver3.0.0)
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_InitialState.js
 *
 * ------------------------------------------------------------------
 * ◆機能1:戦闘開始時に1回だけ付与 <initialState:X>
 * ------------------------------------------------------------------
 * 敵キャラ、またはアクターのメモ欄に以下のタグを書くと、
 * 戦闘開始と同時に(プレイヤーが最初のコマンドを入力するより前に)
 * 指定したステートが自動的に付与されます。
 *
 *   <initialState:X>
 *   <initialState:X,Y,Z>   ※複数指定する場合はカンマ区切り
 *
 * ------------------------------------------------------------------
 * ◆機能2:毎ラウンド開始時に付与 <grantEachTurn:X>
 * ------------------------------------------------------------------
 * アクターのメモ欄に以下のタグを書くと、毎ラウンド開始時、まだ
 * そのステートを持っていなければ自動付与されます(すでに持って
 * いれば何もしません)。
 *
 *   <grantEachTurn:X>
 *   <grantEachTurn:X,Y>   ※複数指定する場合はカンマ区切り
 *
 * 「そのラウンド中、まだ一度も攻撃を受けていない」ことを判定
 * したい場合(レタリスのような「無傷なら大ダメージ」系のスキル)
 * などに使います。「被弾したら解除」は、対象のステートの
 * [解除条件]→[ダメージで解除]を100%に設定する、標準機能で
 * 対応してください。
 *
 * X, Y, Z にはデータベース[ステート]のID番号を入れてください。
 * 書き方はどちらのタグも共通です。
 *
 * ------------------------------------------------------------------
 * ◆使用例
 * ------------------------------------------------------------------
 * ・戦闘開始時から「空中」ステート(仮にID20)の敵を作りたい場合
 *     <initialState:20>
 *
 * ・戦闘開始時からセラに「背面カウンター」ステート(仮にID55)を
 *   持たせたい場合、セラのアクターのメモ欄に
 *     <initialState:55>
 *
 * ・セラに「無傷」ステート(仮にID60、ダメージで解除100%設定済み)
 *   を毎ラウンド自動付与したい場合、セラのアクターのメモ欄に
 *     <grantEachTurn:60>
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・ステート耐性(無効化)を持つ対象に対しては、通常のステート
 *   付与と同様に無効化されます。
 * ・<initialState:X>は戦闘開始と同時に行われますが、[途中から
 *   出現]に設定された敵(DungeonEscape_DifficultyEncounter.js
 *   併用時など)にも問題なく適用されます。
 * ・アクターに<initialState:X>を付与する場合、そのステート自体の
 *   [自動解除]設定を「なし」にしておかないと、ターン経過で
 *   意図せず消える可能性があります。戦闘不能から復帰しても
 *   再付与されません(戦闘開始時の1回だけの処理のため)。
 * ・<grantEachTurn:X>は、そのラウンドの最中に他の誰かの行動で
 *   先に殴られていれば、対象の行動が回ってくる前に解除されている
 *   状態になります。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function parseStateIds(metaObject, tagName) {
        const note = metaObject.meta[tagName];
        if (!note) return [];
        return String(note)
            .split(",")
            .map(s => Number(s.trim()))
            .filter(n => Number.isInteger(n) && n > 0);
    }

    // --- 機能1: 敵キャラ側(戦闘開始時、初期設定) ---
    const _Game_Enemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function (enemyId, x, y) {
        _Game_Enemy_setup.call(this, enemyId, x, y);
        for (const stateId of parseStateIds(this.enemy(), "initialState")) {
            this.addState(stateId);
        }
    };

    // --- 機能1: アクター側(戦闘開始時、1回だけ) ---
    const _BattleManager_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function () {
        _BattleManager_startBattle.call(this);
        for (const actor of $gameParty.battleMembers()) {
            for (const stateId of parseStateIds(actor.actor(), "initialState")) {
                actor.addState(stateId);
            }
        }
    };

    // --- 機能2: アクター側(毎ラウンド開始時) ---
    const _BattleManager_startTurn = BattleManager.startTurn;
    BattleManager.startTurn = function () {
        _BattleManager_startTurn.call(this);
        for (const actor of $gameParty.battleMembers()) {
            for (const stateId of parseStateIds(actor.actor(), "grantEachTurn")) {
                actor.addState(stateId);
            }
        }
    };
})();
