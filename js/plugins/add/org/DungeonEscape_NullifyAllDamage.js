//=============================================================================
// DungeonEscape_NullifyAllDamage.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 特定のステートを持つ対象へのダメージを、命中タイプ(物理/魔法/必中)を問わず強制的に0にするプラグイン Ver1.2.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_NullifyAllDamage.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ステートのメモ欄に以下のタグを記述してください。
 *
 * <nullifyDamage>
 *
 * このステートを持つ対象がダメージを受ける時、標準の「物理ダメージ率」
 * 「魔法ダメージ率」特徴とは異なり、**命中タイプ(なし/物理/魔法)に
 * 関わらず**、常にダメージを0にします。
 *
 * ダメージが0になった時のバトルログも、標準の「(対象)はダメージを
 * 受けていない！」ではなく専用の文言に差し替わります(デフォルトは
 * 「(対象)は攻撃を受け流した！」)。文言を変更したい場合は、同じ
 * ステートのメモ欄に以下も追加してください。
 *
 * <nullifyDamageMessage:%1は攻撃をいなした！>
 *
 * (%1が対象の名前に置き換わります。省略した場合はデフォルト文言)
 *
 * 同時に効果音も再生されます(デフォルトは"Saint9")。変更したい
 * 場合は、同じステートのメモ欄に以下も追加してください。
 *
 * <nullifyDamageSe:効果音のファイル名>
 *
 * 例: <nullifyDamageSe:Parry>
 *
 * (`audio/se/`フォルダ内のファイル名を拡張子なしで指定してください)
 *
 * ------------------------------------------------------------------
 * ◆背景・注意点
 * ------------------------------------------------------------------
 * ツクールMZ標準の「物理ダメージ率」「魔法ダメージ率」特徴は、
 * 技の命中タイプが該当するもの(物理/魔法)にしか効果がありません。
 * 命中タイプ「必中」(連携技等でよく使われる)は、そのどちらにも
 * 該当しないため、上記2つの特徴を100%塞いでいても貫通してしまいます。
 * このプラグインは、その抜け道を塞ぎ、命中タイプを問わず完全に
 * ダメージを0にします。
 *
 * HP回復技(マイナスのダメージ)には影響しません(0より大きい
 * ダメージのみを対象とします)。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;

    Game_Action.prototype.makeDamageValue = function (target, critical) {
        const value = _Game_Action_makeDamageValue.call(this, target, critical);
        if (value > 0 && target.states().some(s => s.meta.nullifyDamage)) {
            return 0;
        }
        return value;
    };

    // 「無効化」ステートを持つ対象がダメージ0になった時だけ、
    // 専用のバトルログ文言に差し替える
    const _Window_BattleLog_makeHpDamageText =
        Window_BattleLog.prototype.makeHpDamageText;

    Window_BattleLog.prototype.makeHpDamageText = function (target) {
        const result = target.result();
        if (
            result.hpAffected &&
            result.hpDamage === 0 &&
            target.states().some(s => s.meta.nullifyDamage)
        ) {
            const seState = target
                .states()
                .find(s => s.meta.nullifyDamageSe !== undefined);
            const seName = seState
                ? String(seState.meta.nullifyDamageSe)
                : "Saint9";
            if (seName) {
                AudioManager.playSe({ name: seName, volume: 90, pitch: 100, pan: 0 });
            }

            const text = target.states().find(s => s.meta.nullifyDamageMessage);
            const fmt = text
                ? String(text.meta.nullifyDamageMessage)
                : "%1は攻撃を受け流した！";
            return fmt.replace("%1", target.name());
        }
        return _Window_BattleLog_makeHpDamageText.call(this, target);
    };
})();
