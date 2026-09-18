/*:
 * @target MZ
 * @plugindesc v1.0.0 「一閃」を使うたび、その戦闘中の一閃だけを段階的に強化します。
 * @author OpenAI
 *
 * @help
 * Crescerium_IssenGrowth.js
 * ------------------------------------------------------------
 * 「一閃」を使用するたびに使用回数を記録し、
 * 次回以降の「一閃」のダメージだけを段階的に上昇させます。
 *
 * 初期設定：
 *   1回目 : +0%
 *   2回目 : +5%
 *   3回目 : +10%
 *   4回目 : +15%
 *   5回目 : +20%
 *   6回目以降 : +25%
 *
 * 戦闘が終了すると使用回数はリセットされます。
 *
 * 【このプラグインが行うこと】
 * ・指定した「一閃」スキルのダメージだけを強化
 * ・使用するたびに成長
 * ・成長量に上限あり
 * ・戦闘ごとにリセット
 *
 * 【このプラグインが行わないこと】
 * ・5%ダメージカットの付与
 * ・ヘイト制御
 * ・クリティカル率の変更
 *
 * 5%ダメージカットは、既存の
 * 「攻撃者自身にステートを付与する仕組み」で実装してください。
 *
 * 【競合について】
 * Game_Battler.prototype.useItem と
 * Game_Action.prototype.makeDamageValue をエイリアスして使用します。
 * 元の処理を呼んだ上で追加処理する方式で、標準メソッドを完全置換しません。
 *
 * ダメージ計算を独自に完全置換するプラグインがある場合は、
 * プラグイン順や競合確認が必要になる可能性があります。
 *
 * @param actorId
 * @text クレイのアクター
 * @desc 一閃成長を適用するアクター。0なら全アクターが対象です。
 * @type actor
 * @default 0
 *
 * @param skillId
 * @text 一閃のスキル
 * @desc 成長対象にする「一閃」のスキルを指定してください。
 * @type skill
 * @default 0
 *
 * @param growthRate
 * @text 1回ごとの成長率
 * @desc 一閃を1回使うごとの威力上昇率（%）。
 * @type number
 * @min 0
 * @max 100
 * @decimals 1
 * @default 5
 *
 * @param maxStacks
 * @text 最大成長回数
 * @desc 威力上昇が適用される最大段階数。5なら最大+25%です。
 * @type number
 * @min 0
 * @max 99
 * @default 5
 *
 * @param debugLog
 * @text デバッグログ
 * @desc ONにすると、一閃使用回数と倍率をF8コンソールへ表示します。
 * @type boolean
 * @on ON
 * @off OFF
 * @default false
 */

(() => {
    "use strict";

    const currentScript = document.currentScript;
    const pluginName = currentScript && currentScript.src
        ? decodeURIComponent(currentScript.src).match(/([^/]+)\.js$/)?.[1] || "Crescerium_IssenGrowth"
        : "Crescerium_IssenGrowth";

    const params = PluginManager.parameters(pluginName);

    const actorId = Number(params.actorId || 0);
    const skillId = Number(params.skillId || 0);
    const growthRate = Number(params.growthRate || 5) / 100;
    const maxStacks = Math.max(0, Number(params.maxStacks || 5));
    const debugLog = String(params.debugLog || "false") === "true";

    const COUNTER_KEY = "_cresceriumIssenUseCount";

    function log(...args) {
        if (debugLog) {
            console.log(`[${pluginName}]`, ...args);
        }
    }

    function isTargetActor(battler) {
        return battler &&
            battler.isActor &&
            battler.isActor() &&
            (actorId <= 0 || battler.actorId() === actorId);
    }

    function isIssen(item) {
        return item &&
            DataManager.isSkill(item) &&
            skillId > 0 &&
            item.id === skillId;
    }

    function resetCounter(actor) {
        actor[COUNTER_KEY] = 0;
    }

    function useCount(actor) {
        return Number(actor[COUNTER_KEY] || 0);
    }

    // 戦闘開始時にリセット
    const _Game_Actor_onBattleStart = Game_Actor.prototype.onBattleStart;
    Game_Actor.prototype.onBattleStart = function(advantageous) {
        _Game_Actor_onBattleStart.call(this, advantageous);
        resetCounter(this);
    };

    // 戦闘終了時にも念のためリセット
    const _Game_Actor_onBattleEnd = Game_Actor.prototype.onBattleEnd;
    Game_Actor.prototype.onBattleEnd = function() {
        _Game_Actor_onBattleEnd.call(this);
        resetCounter(this);
    };

    // 一閃を「使用した」時点で使用回数を+1。
    // MZ標準では useItem() がダメージ計算より先に呼ばれるため、
    // 現在の一閃には「これまでに使った回数」だけが倍率として乗ります。
    const _Game_Battler_useItem = Game_Battler.prototype.useItem;
    Game_Battler.prototype.useItem = function(item) {
        _Game_Battler_useItem.call(this, item);

        if (isTargetActor(this) && isIssen(item)) {
            // 現在の一閃で必要になるのは最大 maxStacks + 1 回まで。
            // それ以上は数える必要がないためクランプします。
            const next = Math.min(useCount(this) + 1, maxStacks + 1);
            this[COUNTER_KEY] = next;

            const bonusStacks = Math.min(maxStacks, Math.max(0, next - 1));
            log(
                `${this.name()} が一閃を使用`,
                `使用回数=${next}`,
                `今回の威力補正=+${bonusStacks * growthRate * 100}%`
            );
        }
    };

    // 一閃の最終ダメージだけを倍率補正。
    // 他のスキル・通常攻撃・連携技には一切影響しません。
    const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
    Game_Action.prototype.makeDamageValue = function(target, critical) {
        const value = _Game_Action_makeDamageValue.call(this, target, critical);
        const subject = this.subject();
        const item = this.item();

        if (!isTargetActor(subject) || !isIssen(item)) {
            return value;
        }

        const count = useCount(subject);
        const bonusStacks = Math.min(maxStacks, Math.max(0, count - 1));
        const multiplier = 1 + bonusStacks * growthRate;
        const result = Math.round(value * multiplier);

        log(
            `${subject.name()} の一閃ダメージ補正`,
            `段階=${bonusStacks}/${maxStacks}`,
            `倍率=${multiplier.toFixed(3)}`,
            `補正前=${value}`,
            `補正後=${result}`
        );

        return result;
    };

    // 他プラグインやイベントから確認したい場合の簡易API
    globalThis.CresceriumIssenGrowth = Object.freeze({
        getUseCount(actor) {
            return isTargetActor(actor) ? useCount(actor) : 0;
        },
        getBonusStacks(actor) {
            if (!isTargetActor(actor)) return 0;
            return Math.min(maxStacks, Math.max(0, useCount(actor)));
        },
        reset(actor) {
            if (actor && actor.isActor && actor.isActor()) {
                resetCounter(actor);
            }
        },
        version: "1.0.0"
    });

    if (debugLog) {
        log(
            "読み込み完了",
            `actorId=${actorId}`,
            `skillId=${skillId}`,
            `growthRate=${growthRate * 100}%`,
            `maxStacks=${maxStacks}`
        );
    }
})();
