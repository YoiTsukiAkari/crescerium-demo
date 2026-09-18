//=============================================================================
// DungeonEscape_OrbSummonAI.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 光のオーブ専用:蘇生>召喚>待機の優先順位で、クールタイム制の召喚AIを行うプラグイン Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_OrbSummonAI.js
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 敵キャラ(オーブ本体)のメモ欄に、以下の2つのタグを記述してください。
 *
 * <orbAI:蘇生スキルID,召喚スキルID,待機スキルID>
 * <orbCooldown:変数ID,変数の最小値,変数の最大値,クールタイム(変数最小時),クールタイム(変数最大時)>
 *
 * 例:
 *   <orbAI:280,281,282>
 *   <orbCooldown:1,1,7,4,1>
 *     → 難易度変数(ID:1、1〜7)が1の時クールタイム4.0、7の時クールタイム1.0
 *       (間の値は線形補間。0.5刻み等の端数は累積誤差法で周期的に配分)
 *
 * ------------------------------------------------------------------
 * ◆行動の決定順序(1ターンに1回行動)
 * ------------------------------------------------------------------
 * 1. クールタイムが明けていない(直近の召喚/蘇生からの経過ターンが
 *    クールタイム未満)場合 → 待機スキルを使用
 * 2. クールタイムが明けている場合、以下の優先順で判定:
 *    a. 生存メンバー(自分含まない、召喚体6体のみでカウント)が6体未満
 *       → 召喚スキルを使用し、クールタイムをリセット
 *    b. 味方(自分以外のトループメンバー)に戦闘不能が1体でもいる
 *       → 蘇生スキルを使用し、クールタイムをリセット
 *    c. どちらも当てはまらない(既に満員)
 *       → 待機スキルを使用(クールタイムは消費しない = 経過ターンは
 *         そのまま維持され、次に誰かが欠けた瞬間から改めてクール
 *         タイム待ちが始まるのではなく、既に貯まっていた分がそのまま
 *         活きる)
 *
 * クールタイムの「経過ターン」は、召喚・蘇生を実際に使った時だけ
 * 0にリセットされます。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    function decideThreshold(enemy, cooldownTag) {
        const [varId, minVar, maxVar, cdAtMin, cdAtMax] = String(cooldownTag)
            .split(",")
            .map(Number);
        const varValue = $gameVariables.value(varId);
        const varRange = maxVar - minVar;
        const rate = varRange > 0 ? (varValue - minVar) / varRange : 1;
        const clampedRate = Math.max(0, Math.min(1, rate));

        // クールタイム(何ターンで1回行動できるか)を、待機ターン数(=クールタイム-1)に変換
        const cooldown = cdAtMin + clampedRate * (cdAtMax - cdAtMin);
        const target = Math.max(0, cooldown - 1);
        const floorVal = Math.floor(target);
        const frac = target - floorVal;

        if (enemy._orbAccumulator === undefined) {
            enemy._orbAccumulator = frac > 0 ? 1 - frac : 0;
        }
        enemy._orbAccumulator += frac;
        if (enemy._orbAccumulator >= 1 - 1e-9) {
            enemy._orbAccumulator -= 1;
            return floorVal + 1;
        }
        return floorVal;
    }

    Game_Enemy.prototype.orbIsReady = function (cooldownTag) {
        if (this._orbThreshold === undefined) {
            this._orbThreshold = decideThreshold(this, cooldownTag);
        }
        if (this._orbElapsed === undefined) {
            this._orbElapsed = this._orbThreshold; // 戦闘開始直後は即座に行動可能
        }
        return this._orbElapsed >= this._orbThreshold;
    };

    Game_Enemy.prototype.orbConsumeCooldown = function (cooldownTag) {
        this._orbElapsed = 0;
        // 次の周期のしきい値を新たに決定しておく
        this._orbThreshold = decideThreshold(this, cooldownTag);
    };

    Game_Enemy.prototype.orbAdvanceTurn = function () {
        if (this._orbElapsed !== undefined) {
            this._orbElapsed++;
        }
    };

    const _Game_Enemy_makeActions = Game_Enemy.prototype.makeActions;

    Game_Enemy.prototype.makeActions = function () {
        const aiTag = this.enemy().meta.orbAI;
        const cooldownTag = this.enemy().meta.orbCooldown;

        if (!aiTag || !cooldownTag) {
            _Game_Enemy_makeActions.call(this);
            return;
        }

        const [reviveId, summonId, waitId] = String(aiTag)
            .split(",")
            .map(Number);

        this.clearActions();
        const action = new Game_Action(this);

        const others = $gameTroop.members().filter(m => m !== this);
        const someoneDead = others.some(m => m.isDead());
        const aliveCount = others.filter(m => m.isAlive()).length; // 召喚体6体のみでカウント(オーブ自身は含めない)

        if (this.orbIsReady(cooldownTag) && aliveCount < 6) {
            action.setSkill(summonId);
            this.orbConsumeCooldown(cooldownTag);
        } else if (this.orbIsReady(cooldownTag) && someoneDead) {
            action.setSkill(reviveId);
            this.orbConsumeCooldown(cooldownTag);
        } else {
            action.setSkill(waitId);
            this.orbAdvanceTurn();
        }

        this._actions = [action];
    };
})();
