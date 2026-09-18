/*:
 * @target MZ
 * @plugindesc v1.0.0 位置入れ替えの影響を受けず、直前の行動者オブジェクトを取得できるようにします。
 * @author OpenAI
 *
 * @help
 * Crescerium_LastSubjectRef.js
 * ------------------------------------------------------------
 * RPGツクールMZ用。
 *
 * MZ標準の
 *   $gameTemp.lastActionData(3)
 * は「直前に行動した敵の番号」を保存します。
 *
 * しかし、敵の位置入れ替えや並び替えを行う処理があると、
 * その番号を元に $gameTroop.members()[index] を引き直した時に、
 * 元の行動者とは別の敵を参照してしまうことがあります。
 *
 * このプラグインは、直前の行動者そのもの（オブジェクト参照）を
 * $gameTemp に保存します。
 *
 * ------------------------------------------------------------
 * ■ 使い方
 * ------------------------------------------------------------
 *
 * コモンイベントやスクリプトで、直前の行動者を取得したい時は
 * 以下を使ってください。
 *
 *   const subject = $gameTemp.cresceriumLastSubject();
 *
 * または
 *
 *   const subject = $gameTemp._cresceriumLastSubject;
 *
 * 推奨はメソッド版です。
 *
 * 例：
 *
 *   const subject = $gameTemp.cresceriumLastSubject();
 *   if (!subject) return;
 *   subject.addState(121);
 *
 * これなら、行動後に敵の位置が入れ替わっても、
 * 実際にその行動を行った敵自身へ処理できます。
 *
 * ------------------------------------------------------------
 * ■ 付属メソッド
 * ------------------------------------------------------------
 *
 *   $gameTemp.cresceriumLastSubject()
 *     - 直前の行動者を返します。
 *
 *   $gameTemp.setCresceriumLastSubject(subject)
 *     - 直前の行動者を手動設定します。
 *
 *   $gameTemp.clearCresceriumLastSubject()
 *     - 保存を消去します。
 *
 * ------------------------------------------------------------
 * ■ 備考
 * ------------------------------------------------------------
 *
 * ・戦闘中の行動更新時に自動で記録されます。
 * ・戦闘開始時／戦闘終了時に記録はクリアされます。
 * ・Game_Action.prototype.updateLastSubject をエイリアスしています。
 */

(() => {
    "use strict";

    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._cresceriumLastSubject = null;
    };

    Game_Temp.prototype.cresceriumLastSubject = function() {
        return this._cresceriumLastSubject || null;
    };

    Game_Temp.prototype.setCresceriumLastSubject = function(subject) {
        this._cresceriumLastSubject = subject || null;
    };

    Game_Temp.prototype.clearCresceriumLastSubject = function() {
        this._cresceriumLastSubject = null;
    };

    const _BattleManager_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function() {
        if ($gameTemp && $gameTemp.clearCresceriumLastSubject) {
            $gameTemp.clearCresceriumLastSubject();
        }
        _BattleManager_startBattle.call(this);
    };

    const _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle = function(result) {
        _BattleManager_endBattle.call(this, result);
        if ($gameTemp && $gameTemp.clearCresceriumLastSubject) {
            $gameTemp.clearCresceriumLastSubject();
        }
    };

    const _Game_Action_updateLastSubject =
        Game_Action.prototype.updateLastSubject;

    Game_Action.prototype.updateLastSubject = function() {
        _Game_Action_updateLastSubject.call(this);

        if ($gameTemp && $gameTemp.setCresceriumLastSubject) {
            $gameTemp.setCresceriumLastSubject(this.subject());
        }
    };
})();
