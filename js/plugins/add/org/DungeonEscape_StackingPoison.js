//=============================================================================
// DungeonEscape_StackingPoison.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 再付与されるたびに重ねがけされ、ダメージが倍々に増えていく毒効果を実装するプラグイン（fixedPoisonの演出を踏襲） Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_StackingPoison.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述してください（併用可）。
 *
 * <stackingPoison:基礎ダメージ>
 * <stackingPoisonMax:最大重ねがけ数>   (省略可、省略時は上限なし)
 * <stackingPoisonMessage1:文言>        (省略可、%1=対象名、%2=今回のダメージ量)
 * <stackingPoisonMessage2:文言>        (省略可、同上)
 * <stackingPoisonPerStep:基礎ダメージ>       (省略可、マップ移動中、1歩ごと)
 * <stackingPoisonPerStep:基礎ダメージ,N>     (省略可、マップ移動中、N歩ごと)
 *
 * 例:
 * <stackingPoison:20>
 * <stackingPoisonPerStep:20>
 * <stackingPoisonMax:4>
 * <stackingPoisonMessage1:%1は猛毒が全身を蝕んでいる！>
 * <stackingPoisonMessage2:%1に%2のダメージ！>
 *
 * ------------------------------------------------------------------
 * ◆重ねがけとダメージの計算
 * ------------------------------------------------------------------
 * このステートが(既に持っている状態で)再度付与されるたびに、重ねがけ数が
 * 1つ増えます。初めて付与された時点で重ねがけ数は1です。
 *
 * 毎ターン・毎歩のダメージは「基礎ダメージ × 2^(重ねがけ数-1)」で
 * 計算されます(重ねがけ数1なら等倍、2なら2倍、3なら4倍、4なら8倍……と
 * 倍々に増加)。**戦闘中に貯まった重ねがけ数は、マップに持ち出しても
 * そのまま引き継がれます**(同じ重ねがけ数を、戦闘中のダメージ計算・
 * マップ上のダメージ計算の両方で共通して参照しているため)。
 *
 * <stackingPoisonMax>を指定した場合、重ねがけ数はそこで頭打ちになります
 * (それ以上再付与されても、ダメージはそれ以上増えません)。
 *
 * 重ねがけ数は、ステートが解除される(治療・戦闘終了等、理由を問わず)と
 * 0にリセットされます。次に新規で付与された時は、また重ねがけ数1から
 * 始まります。
 *
 * ------------------------------------------------------------------
 * ◆演出について(fixedPoison.jsと同様)
 * ------------------------------------------------------------------
 * ・戦闘中のダメージ発生時、画面が軽く揺れます。マップ上のダメージ
 *   発生時は、標準のダメージ床と同じ赤フラッシュが入ります。
 * ・頭上のダメージポップアップ(戦闘中)は、敵(Game_Enemy)が対象の
 *   場合のみ表示されます(フロントビューの味方にはスプライトが
 *   無いため)。
 * ・<stackingPoisonPerStep>による戦闘不能は、システム1「スリップ
 *   ダメージで戦闘不能」の設定に関わらず常に有効です。マップ上で
 *   パーティ全員が戦闘不能になった場合、ゲームオーバーになります。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    // ---- バトルログのキューで発火する画面揺れ ----
    Window_BattleLog.prototype.performStackingPoisonShake = function () {
        $gameScreen.startShake(5, 5, 10);
    };

    // ---- 再付与されるたびに重ねがけ数を+1する ----
    const _Game_Battler_addState = Game_Battler.prototype.addState;

    Game_Battler.prototype.addState = function (stateId) {
        const alreadyHad = this.isStateAffected(stateId);
        _Game_Battler_addState.call(this, stateId);

        if (this.isStateAffected(stateId)) {
            const state = $dataStates[stateId];
            if (state && state.meta.stackingPoison) {
                if (!this._stackingPoisonCounts) {
                    this._stackingPoisonCounts = {};
                }
                const maxTag = state.meta.stackingPoisonMax;
                const max = maxTag ? Number(maxTag) : Infinity;

                if (!alreadyHad) {
                    this._stackingPoisonCounts[stateId] = 1;
                } else {
                    const current = this._stackingPoisonCounts[stateId] || 1;
                    this._stackingPoisonCounts[stateId] = Math.min(current + 1, max);
                }
            }
        }
    };

    // ---- ステートが外れたら重ねがけ数をリセット ----
    const _Game_Battler_removeState = Game_Battler.prototype.removeState;

    Game_Battler.prototype.removeState = function (stateId) {
        _Game_Battler_removeState.call(this, stateId);
        if (this._stackingPoisonCounts) {
            delete this._stackingPoisonCounts[stateId];
        }
    };

    // ---- 戦闘中のみ発動：ターン経過ダメージ(重ねがけ倍率つき) ----
    const _Game_Battler_regenerateHp = Game_Battler.prototype.regenerateHp;

    Game_Battler.prototype.regenerateHp = function () {
        _Game_Battler_regenerateHp.call(this);

        if (!$gameParty.inBattle()) return;

        for (const state of this.states()) {
            const tag = state.meta.stackingPoison;
            if (tag && this.hp > 0) {
                const baseDamage = Number(tag);
                const stacks =
                    (this._stackingPoisonCounts && this._stackingPoisonCounts[state.id]) || 1;
                const damage = Math.round(baseDamage * Math.pow(2, stacks - 1));

                this.gainHp(-damage);

                if (damage !== 0) {
                    if (damage > 0) {
                        this.result().clear();
                        this.result().hpAffected = true;
                        this.result().hpDamage = damage;
                        this.startDamagePopup();
                    }

                    if (BattleManager._logWindow) {
                        if (damage > 0) {
                            BattleManager._logWindow.push("performStackingPoisonShake");
                        }

                        const format = tagName => {
                            const raw = state.meta[tagName];
                            return raw
                                ? raw
                                      .replace("%1", this.name())
                                      .replace("%2", Math.abs(damage))
                                : null;
                        };
                        const line1 = format("stackingPoisonMessage1");
                        const line2 = format("stackingPoisonMessage2");
                        if (line1) BattleManager._logWindow.push("addText", line1);
                        if (line2) BattleManager._logWindow.push("addText", line2);
                        if (line1 || line2) {
                            BattleManager._logWindow.push("wait");
                            BattleManager._logWindow.push("clear");
                        }
                    }
                }
            }
        }
    };

    // ---- マップ移動中のみ発動：歩数指定ダメージ(重ねがけ倍率つき、赤フラッシュ付き) ----
    const _Game_Player_increaseSteps = Game_Player.prototype.increaseSteps;

    Game_Player.prototype.increaseSteps = function () {
        _Game_Player_increaseSteps.call(this);

        if ($gameParty.inBattle()) return;

        const totalSteps = $gameParty.steps();
        let damageOccurred = false;

        for (const actor of $gameParty.members()) {
            if (actor.hp <= 0) continue;
            for (const state of actor.states()) {
                const tag = state.meta.stackingPoisonPerStep;
                if (!tag) continue;

                const parts = String(tag).split(",");
                const baseDamage = Number(parts[0]);
                const interval = parts[1] ? Number(parts[1]) : 1;

                if (interval > 0 && totalSteps % interval === 0) {
                    const stacks =
                        (actor._stackingPoisonCounts &&
                            actor._stackingPoisonCounts[state.id]) ||
                        1;
                    const damage = Math.round(baseDamage * Math.pow(2, stacks - 1));
                    actor.gainHp(-damage);
                    if (damage > 0) damageOccurred = true;
                }
            }
        }

        if (damageOccurred) {
            $gameScreen.startFlashForDamage();
        }

        if ($gameParty.isAllDead()) {
            SceneManager.goto(Scene_Gameover);
        }
    };
})();
