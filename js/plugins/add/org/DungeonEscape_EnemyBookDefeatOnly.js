//=============================================================================
// DungeonEscape_EnemyBookDefeatOnly.js
//=============================================================================

/*:ja
 * @target MZ
 * @plugindesc ABMZ_EnemyBook.jsの戦闘終了時登録を「出現した」ではなく「1体以上撃破した」条件に差し替えます (Ver1.0.0)
 * @author DungeonEscape開発用
 *
 * @help DungeonEscape_EnemyBookDefeatOnly.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * ABMZ_EnemyBook.js(モンスター図鑑プラグイン)の[登録タイミング]を
 * 「戦闘終了時」にしている場合、標準では「その戦闘で画面に出現した
 * (途中出現も含む)モンスター」が図鑑に登録されます。
 *
 * このプラグインを併用すると、代わりに「その戦闘までに1体以上
 * 撃破したことがあるモンスター」だけが登録されるようになります。
 * DungeonEscape_DifficultyEncounter.jsのように、難易度によって
 * トループ内の一部メンバーが出現しないケースがあっても、実際に
 * 倒したことのないモンスターが図鑑に紛れ込むことがなくなります。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * ABMZ_EnemyBook.js より後ろのプラグイン順に配置し、ONにするだけで
 * 動作します。ABMZ_EnemyBook.js側の[登録タイミング]は「戦闘終了時」
 * のままで構いません(このプラグインが戦闘終了時の処理そのものを
 * 差し替えます)。
 *
 * 撃破数のカウント自体はABMZ_EnemyBook.js本体の仕組み
 * (Game_Enemy.prototype.dieで加算)をそのまま利用しているため、
 * 難易度による出現有無とは無関係に、正しく積み上がっていきます。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";

    Game_Troop.prototype.onBattleEnd = function () {
        Game_Unit.prototype.onBattleEnd.call(this);

        const registeredIds = new Set();
        for (const enemy of this.members()) {
            const enemyId = enemy.enemyId();
            if (registeredIds.has(enemyId)) continue;
            registeredIds.add(enemyId);

            if ($gameSystem.defeatNumber(enemyId) >= 1) {
                $gameSystem.addToEnemyBook(enemyId);
            }
        }
    };
})();
