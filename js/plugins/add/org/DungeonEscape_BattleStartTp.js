//=============================================================================
// DungeonEscape_BattleStartTp.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 味方が持っている「絆の上昇」系ステートのメモ欄タグを参照し、
 * 戦闘開始時のTPを自動設定します。非戦闘時のTPは常に0にします Ver1.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_BattleStartTp.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 「絆の上昇1」「絆の上昇2」…のような、焚火のたびに付与し直している
 * TP自動回復用のステートに、以下のメモ欄タグを追加してください。
 *
 * <battleStartTp:X>   このステートを持っている間、戦闘開始時のTPをXにする
 *
 * 例:
 * 絆の上昇1 … <battleStartTp:10>
 * 絆の上昇2 … <battleStartTp:20>
 * 絆の上昇3 … <battleStartTp:30>
 * 絆の上昇4 … <battleStartTp:40>
 *
 * このタグを持つステートを複数同時に持っていた場合は、一番大きい値を
 * 採用します(通常は1つしか持たない想定)。該当するステートを持って
 * いない場合(1Fなど)は0になります。
 *
 * TP自動回復率そのものは、これまで通り各ステートの「追加能力値:
 * TP再生率」で設定してください(このプラグインは戦闘開始時TPだけを
 * 担当します。自動回復には手を加えません)。
 *
 * また、戦闘が終了するとパーティ全員のTPを0にリセットします
 * (非戦闘時のTPは常に0という運用のため)。
 *
 * ------------------------------------------------------------------
 * ◆戦闘不能時もTP自動回復を止めない(今回追加)
 * ------------------------------------------------------------------
 * RPGツクールMZは戦闘不能になった瞬間、そのバトラーの全ステートを
 * 自動的に解除する(die()内でclearStates()が呼ばれる)。これにより、
 * 絆の上昇ステートも消え、そのキャラ自身のTP再生率が0に戻って
 * しまい、パーティ内で戦闘不能者だけTPが止まる問題があった。
 *
 * TPはパーティ全体で常に同期させる想定のため、この挙動を変更した。
 *
 * 調査の結果、RPGツクールMZは戦闘不能のバトラーに対してそもそも
 * regenerateTp自体を呼ばないことが判明した(死亡者個人の処理を
 * いくら直しても実行されない)。そのため、生きている味方の誰かの
 * regenerateTpが呼ばれたタイミングを合図に、1ターンにつき1回だけ
 * パーティ全員(戦闘不能者を含む)へ同じ量のTPを加算する方式に変更した。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 導入するだけで動作します。読み込み順は特に指定なし。
 *
 * 以前渡した DungeonEscape_FloorTp.js(フロア変数を直接参照する方式)は
 * このプラグインで役割を置き換えるので、導入している場合は無効化して
 * ください。焚火イベントの「TPを固定値20に上書き」コマンドも不要に
 * なるので削除してください(「絆の上昇」ステートを付与するコマンドは
 * これまで通り残してください)。
 */

(() => {
    "use strict";

    // 特定の1人ではなく、パーティ全員(戦闘不能者含む)の中で一番高い値を採用する。
    // 戦闘不能者は死亡時にステートが全解除されているため、自分自身だけを見ると
    // 常に0になってしまう。
    function battleStartTpFor() {
        let value = 0;
        for (const member of $gameParty.members()) {
            for (const state of member.states()) {
                const tag = state.meta.battleStartTp;
                if (tag) {
                    value = Math.max(value, Number(tag));
                }
            }
        }
        return value;
    }

    // 1ターンにつき1回だけ回復処理を行うためのトラッカー
    let lastTpRegenTurn = -1;

    // ---- 戦闘開始時のTPを、持っているステートのタグに応じた値にする(アクターのみ) ----
    const _Game_Battler_initTp = Game_Battler.prototype.initTp;
    Game_Battler.prototype.initTp = function () {
        if (this.isActor()) {
            this.setTp(battleStartTpFor());
            lastTpRegenTurn = -1; // 新しい戦闘の開始として回復トラッキングをリセット
        } else {
            _Game_Battler_initTp.call(this);
        }
    };

    // ---- TP自動回復:生きている味方の誰かのregenerateTpが呼ばれたタイミングで、
    //      1ターンにつき1回だけパーティ全員(戦闘不能者含む)に同じ量を加算する ----
    Game_Actor.prototype.regenerateTp = function () {
        if (!$gameParty.inBattle()) return;
        const turn = $gameTroop.turnCount();
        if (turn === lastTpRegenTurn) return; // このターンは既に処理済み
        lastTpRegenTurn = turn;

        let maxTrg = 0;
        for (const member of $gameParty.members()) {
            maxTrg = Math.max(maxTrg, member.xparam(9)); // xparam index9 = trg(TP再生率)
        }
        const value = Math.floor(this.maxTp() * maxTrg);
        if (value === 0) return;
        for (const member of $gameParty.members()) {
            member.gainSilentTp(value);
        }
    };

    // ---- 戦闘終了時、パーティ全員のTPを0にする(非戦闘時は常に0) ----
    const _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle = function (result) {
        _BattleManager_endBattle.call(this, result);
        for (const actor of $gameParty.members()) {
            actor.setTp(0);
        }
    };
})();
