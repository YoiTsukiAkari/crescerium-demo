//=============================================================================
// DungeonEscape_FixedEncounterStep.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc エンカウントまでの歩数を完全固定にしつつ、リージョン境界を跨ぐ時は残り歩数を比例配分します Ver3.0.0
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_FixedEncounterStep.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ツクールMZ標準は「あと何歩でエンカウントするか」を持つ
 * カウントダウン方式で、歩数もランダムな範囲で決まる。このプラグインは
 * ランダム性を排除し、常に「$gameMap.encounterStep()」の値
 * （`DungeonEscape_RegionEncounterRate.js`でリージョンごとに変わる）を
 * そのまま残り歩数として使う。
 *
 * ------------------------------------------------------------------
 * ◆リージョン境界を跨いだ時の扱い（比例配分）
 * ------------------------------------------------------------------
 * 残り歩数をそのまま引き継ぐ、または単純に再抽選すると、以下のような
 * 事故が起きる。
 *   ・そのまま引き継ぐ　　　→ 境界を行き来するとエンカウントを
 *                             無期限に回避できてしまう
 *   ・単純に再抽選し直す　　→ 境界を跨いだ直後に連続でエンカウント
 *                             したり、逆に長く回避できたりする
 *
 * このプラグインは、境界を跨いで歩数設定(しきい値)が変わった瞬間、
 * 残り歩数を「新しいしきい値 ÷ 古いしきい値」の比率でそのまま
 * 比例配分する。
 *
 * 例：30歩設定のエリアで残り10歩の状態から、15歩設定のエリアに
 *     入った場合 → 残り10歩 ×(15÷30) = 残り5歩
 *
 * これにより、それまでの「進捗（どれだけ歩いたか）」の感覚を保った
 * まま、新しいエリアの頻度になめらかに切り替わる。行き来を繰り返しても、
 * 往復の比率が互いに打ち消し合うため、無限に回避することはできない。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    Game_Player.prototype.makeEncounterCount = function () {
        this._encounterCount = $gameMap.encounterStep();
    };

    let _lastStep = null;

    Game_Player.prototype.updateEncounterCount = function () {
        if (this.canEncounter()) {
            const currentStep = $gameMap.encounterStep();

            if (_lastStep !== null && currentStep !== _lastStep && _lastStep > 0) {
                this._encounterCount = Math.round(
                    this._encounterCount * (currentStep / _lastStep)
                );
            }
            _lastStep = currentStep;

            this._encounterCount -= this.encounterProgressValue();
        }
    };

    // マップ移動時は前回値をリセットしておく(別マップの情報を持ち越さないため)
    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function () {
        _Game_Player_performTransfer.call(this);
        _lastStep = null;
    };
})();
