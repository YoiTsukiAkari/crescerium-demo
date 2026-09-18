//=============================================================================
// DungeonEscape_WeaknessCriticalText.js
//=============================================================================

/*:ja
 * @target MZ
 * @plugindesc 弱点属性・ステート由来ダメージ率・指定ステート特攻スキルに、会心と同じ演出+任意のテキストを表示します (Ver1.3.0)
 * @author DungeonEscape開発用
 *
 * @param weakThreshold
 * @text 有効な一撃とみなす倍率(%)
 * @desc 属性有効度×物理/魔法ダメージ率が、この値以上の時に「有効な一撃」として扱います
 * @type number
 * @default 150
 *
 * @param effectiveText
 * @text 表示するテキスト
 * @desc バトルログに表示する文言です。空欄にするとテキストは表示されません(ダメージ数値の演出のみになります)
 * @default 有効な一撃！
 *
 * @help DungeonEscape_WeaknessCriticalText.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 以下のいずれかに該当する攻撃に対して、会心の一撃と同じ
 * ダメージ数値演出(赤い光)+バトルログのテキストを表示します。
 *
 * 1. 属性有効度 × 物理/魔法ダメージ率(PDR/MDR)が一定値以上
 *    (デフォルト150%。属性弱点や、凍結・堕天などステート由来の
 *     ダメージ倍率も含めて自動判定されます)
 *
 * 2. スキル/アイテムのメモ欄に <weakState:X> がある場合、
 *    対象がステートXを持っていれば無条件で該当
 *    (影踏み・無残のような「特定ステートの相手に大ダメージ」系の
 *     スキルは、ダメージ計算式側で条件分岐しているため1では
 *     拾えません。このタグで個別に指定してください)
 *
 * ダメージ計算そのもの(会心の3倍補正など)には一切関与しません。
 * あくまで演出(見た目)だけを追加するプラグインです。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * ・自動判定(1)は導入するだけで動作します。
 *
 * ・ステート特攻スキル(2)は、該当スキルのメモ欄に以下を追加してください。
 *
 *     <weakState:X>
 *     <weakState:X,Y>   ※複数指定はカンマ区切り(いずれか1つでも該当すればOK)
 *
 *   例)
 *     影踏み(背面ステートが仮にID20の場合):
 *       <weakState:20>
 *     無残(倒れステートが仮にID21の場合):
 *       <weakState:21>
 *
 * ・「有効な一撃とみなす倍率」「表示するテキスト」は、どちらも
 *   プラグインパラメータからいつでも変更できます。
 * ・テキストを空欄にすると、ダメージ数値の演出だけが残ります。
 * ・すでに本当の会心の一撃が発生している場合は、重複処理を
 *   避けるため、追加の処理は行いません(標準の会心演出がそのまま出ます)。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_WeaknessCriticalText";
    const params = PluginManager.parameters(pluginName);
    const weakThreshold = Number(params.weakThreshold || 150);
    const effectiveText = String(params.effectiveText || "");

    function getWeakStateIds(item) {
        if (!item || !item.meta || !item.meta.weakState) return [];
        return String(item.meta.weakState)
            .split(",")
            .map(s => Number(s.trim()))
            .filter(n => Number.isInteger(n) && n > 0);
    }

    // --- 属性有効度×PDR/MDR、および<weakState:X>を判定し、結果に独自フラグを保存する ---
    const _Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function (target) {
        // ダメージ処理前に、対象のステート一覧と、属性有効度×PDR/MDRを記録しておく
        // (影踏み・無残・凍結のように、自身の効果でステートが解除されるケースに対応するため)
        const statesBeforeIds = target.states().map(s => s.id);
        let rateBefore = this.calcElementRate(target);
        if (this.isPhysical()) {
            rateBefore *= target.pdr;
        } else if (this.isMagical()) {
            rateBefore *= target.mdr;
        }

        _Game_Action_apply.call(this, target);

        const result = target.result();
        const item = this.item();
        const damageType = item ? item.damage.type : 0;
        const isDamageAction = damageType === 1 || damageType === 2; // HPダメージ or MPダメージ

        if (result.isHit() && isDamageAction && target.isEnemy()) {
            let isWeak = rateBefore * 100 >= weakThreshold;

            if (!isWeak) {
                const weakStateIds = getWeakStateIds(item);
                if (weakStateIds.length > 0) {
                    isWeak = weakStateIds.some(id => statesBeforeIds.includes(id));
                }
            }
            result.dungeonEscapeWeak = isWeak;
        } else {
            result.dungeonEscapeWeak = false;
        }
    };

    // --- ダメージ数値ポップアップの会心演出(赤い光)を流用 ---
    const _Sprite_Damage_setup = Sprite_Damage.prototype.setup;
    Sprite_Damage.prototype.setup = function (target) {
        _Sprite_Damage_setup.call(this, target);
        const result = target.result();
        if (!result.critical && result.dungeonEscapeWeak) {
            this.setupCriticalEffect();
        }
    };

    // --- バトルログへのテキスト表示 ---
    const _Window_BattleLog_displayCritical = Window_BattleLog.prototype.displayCritical;
    Window_BattleLog.prototype.displayCritical = function (target) {
        _Window_BattleLog_displayCritical.call(this, target);
        const result = target.result();
        if (!result.critical && result.dungeonEscapeWeak && effectiveText) {
            this.push("addText", effectiveText);
        }
    };
})();
