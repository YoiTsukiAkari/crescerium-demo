//=============================================================================
// DungeonEscape_StateExpireChain.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc ステートを持ったまま指定ターン数が経過すると、別のステートに移行するプラグイン Ver2.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_StateExpireChain.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * `DungeonEscape_DeathCountdown.js`と同じ考え方(独自カウンターで
 * ターン経過を管理する方式)を使い、「戦闘不能」ではなく「任意の
 * 別ステートへの移行」を行えるようにしたものです。
 *
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <expireChain:次のステートID,ターン数>
 *
 * 例: <expireChain:80,3>
 *   → このステートが付与されたターンを1ターン目として含めて3回分の
 *     ターン終了を数え、3回目のターン終了時に、ステートID80が
 *     自動的に付与される(このステート自体はそのまま残ります。
 *     入れ替えたい場合は、次のステート側の特徴で「ステートの解除」を
 *     設定するか、使用効果側で明示的に外してください)。
 *
 * 使用例(石化の予兆、3ターンの猶予):
 *   「石化の予兆」ステートに <expireChain:石化のステートID,3>
 *   → 3ターンの間に治療(このステート自体を解除)すれば、本体の石化は
 *     発生しない。放置すると3ターン目の終わりに石化する。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・このステート自体には、ツクール標準の「自動解除のタイミング」を
 *   設定しないでください（設定すると、カウントダウンが終わる前に
 *   標準機能の方で先に解除されてしまいます）。`DeathCountdown.js`と
 *   同じ注意点です。
 * ・カウントダウンは対象・ステートごとに個別管理されます。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const _Game_Battler_addState = Game_Battler.prototype.addState;
    Game_Battler.prototype.addState = function (stateId) {
        const hadState = this.isStateAffected(stateId);
        _Game_Battler_addState.call(this, stateId);
        if (!hadState && this.isStateAffected(stateId)) {
            const state = $dataStates[stateId];
            const tag = state && state.meta.expireChain;
            if (tag) {
                const [nextIdStr, turnsStr] = String(tag).split(",");
                const turns = Number(turnsStr);
                if (turns > 0) {
                    this._expireChainCountdowns = this._expireChainCountdowns || {};
                    this._expireChainCountdowns[stateId] = {
                        nextStateId: Number(nextIdStr),
                        turns: turns,
                    };
                }
            }
        }
    };

    const _Game_Battler_removeState = Game_Battler.prototype.removeState;
    Game_Battler.prototype.removeState = function (stateId) {
        _Game_Battler_removeState.call(this, stateId);
        if (this._expireChainCountdowns) {
            delete this._expireChainCountdowns[stateId];
        }
    };

    const _Game_Battler_onTurnEnd = Game_Battler.prototype.onTurnEnd;
    Game_Battler.prototype.onTurnEnd = function () {
        _Game_Battler_onTurnEnd.call(this);

        if (this._expireChainCountdowns && this.hp > 0) {
            for (const key of Object.keys(this._expireChainCountdowns)) {
                const stateId = Number(key);
                if (!this.isStateAffected(stateId)) {
                    delete this._expireChainCountdowns[stateId];
                    continue;
                }
                const entry = this._expireChainCountdowns[stateId];
                entry.turns -= 1;
                if (entry.turns <= 0) {
                    delete this._expireChainCountdowns[stateId];
                    this.addState(entry.nextStateId);
                    if (BattleManager._logWindow) {
                        BattleManager._logWindow.displayAddedStates(this);
                        this.result().addedStates = [];
                    }
                }
            }
        }
    };
})();
