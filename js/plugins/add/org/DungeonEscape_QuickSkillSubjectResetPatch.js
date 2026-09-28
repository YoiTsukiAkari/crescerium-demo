/*:
 * @target MZ
 * @plugindesc TorigoyaMZ_QuickSkill後に残った行動者(_subject)を解除し、通常ターンの行動順が崩れる問題を修正します。 Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_QuickSkillSubjectResetPatch.js
 *
 * TorigoyaMZ_QuickSkill.js v1.1.2 用の互換パッチです。
 *
 * QuickSkill内のコモンイベントや強制行動の最後に実行したアクターが
 * BattleManager._subject に残ることで、通常ターン開始後に
 * 本来の速度順を無視して先に行動してしまう場合があります。
 *
 * QuickSkill本体・コモンイベント・強制行動がすべて終了し、
 * 通常の入力処理へ戻る直前
 * （torigoyaQuickSkill_detectNextActor の処理後）に
 * BattleManager._subject を null に戻します。
 *
 * 必ず TorigoyaMZ_QuickSkill.js より下に配置してください。
 * このファイルを .txt から .js に変更して使用できます。
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "DungeonEscape_QuickSkillSubjectResetPatch";

    const originalDetectNextActor =
        BattleManager.torigoyaQuickSkill_detectNextActor;

    if (typeof originalDetectNextActor !== "function") {
        console.warn(
            `[${PLUGIN_NAME}] TorigoyaMZ_QuickSkill が見つかりません。` +
            "このパッチを TorigoyaMZ_QuickSkill.js より下に配置してください。"
        );
        return;
    }

    BattleManager.torigoyaQuickSkill_detectNextActor = function() {
        const result = originalDetectNextActor.apply(this, arguments);

        // QuickSkill本体・予約コモンイベント・強制行動の処理後に、
        // 最後の強制行動者が残留している場合があるため解除する。
        this._subject = null;

        return result;
    };

    console.log(`[${PLUGIN_NAME}] loaded.`);
})();
