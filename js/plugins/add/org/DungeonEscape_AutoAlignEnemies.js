//=============================================================================
// DungeonEscape_AutoAlignEnemies.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 戦闘開始時、実際に出現している敵の「画像の実寸」を基準に
 * 隙間を詰めて並べ、画面に収まらない場合は隙間を圧縮します Ver1.4.0
 * @author DungeonEscape開発用
 *
 * @param gapX
 * @text 敵同士の隙間
 * @desc 隣り合う敵の画像の端と端の間に空ける余白(ピクセル)
 * @type number
 * @default 24
 *
 * @param marginX
 * @text 左右の余白
 * @desc 画面端から確保したい余白(ピクセル)。これを超える場合は隙間を圧縮する(マイナスになれば重なりも許容)
 * @type number
 * @default 20
 *
 * @help DungeonEscape_AutoAlignEnemies.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * DungeonEscape_DifficultyEncounter.jsのように、難易度によって
 * トループ内の出現数が変わる仕組みだと、データベース上で固定された
 * 座標のままでは、体格差の大きい敵が重なったり、逆に間延びした配置に
 * なってしまうことがあります。
 *
 * このプラグインは、戦闘開始時、**その時点で実際に見えている敵の
 * 画像の実寸（読み込み済みビットマップの幅）**を基準に、隙間
 * （デフォルト24px）を挟んで敵同士を横に並べ、そのグループ全体を
 * 画面の水平中央に配置します。
 *
 * 敵の数が多く、この隙間のままだと画面（左右の余白を除いた範囲）に
 * 収まらない場合は、収まるように隙間を自動で圧縮します。圧縮しても
 * なお収まらない場合（敵の画像そのものが大きすぎる場合）は、隙間が
 * マイナスになり、敵同士の重なりを許容します（RPGツクール標準の
 * 「整列」ボタンと同じ考え方）。
 *
 * 縦位置(Y座標)は元の設定のまま変更しません。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.4.0での変更点
 * ------------------------------------------------------------------
 * 敵の数が多い時、隙間を保ったまま画面からはみ出してしまっていた。
 * 画面に収まらない場合は隙間を自動で圧縮する（それでも収まらない
 * 場合は重なりを許容する）処理を追加した。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.3.0での変更点
 * ------------------------------------------------------------------
 * 「画面幅いっぱいに均等割り」だと、敵の数が少ない時に画面の両端まで
 * 大きく間延びしてしまう問題があった。各敵の画像の実寸を基準に隙間を
 * 詰めて配置し、グループ全体を中央寄せする方式に変更した。
 *
 * 画像は非同期で読み込まれるため、全ての対象ビットマップの読み込みが
 * 完了するまで毎フレーム待ち、完了した時点で1回だけ整列を実行する。
 *
 * ------------------------------------------------------------------
 * ◆Ver1.1.0での変更点（表示に反映されない不具合の修正）
 * ------------------------------------------------------------------
 * RPGツクールMZの敵スプライトは、生成された瞬間の座標(screenX)を
 * 「_homeX」として一度だけ記録し、以降は_homeXだけを見て表示位置を
 * 決めています。スプライト本体のsetHome()を直接呼び出す必要があります。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 導入するだけで動作します。プラグインの読み込み順は、
 * DungeonEscape_DifficultyEncounter.jsより後ろに配置してください。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_AutoAlignEnemies";
    const params = PluginManager.parameters(pluginName);
    const gapX = Number(params.gapX || 24);
    const marginX = Number(params.marginX || 20);

    function isVisibleEnemy(enemy) {
        if (!enemy) return false;
        if (typeof enemy.isAlive === "function" && !enemy.isAlive()) return false;
        if (typeof enemy.hidden === "function" && enemy.hidden()) return false;
        if (typeof enemy.isHidden === "function" && enemy.isHidden()) return false;
        return true;
    }

    function getVisibleSprites(scene) {
        if (!scene || !scene._spriteset || !scene._spriteset._enemySprites) return null;
        const members = $gameTroop.members().filter(isVisibleEnemy);
        const sprites = members.map(enemy =>
            scene._spriteset._enemySprites.find(s => s._enemy === enemy)
        );
        if (sprites.some(s => !s)) return null; // 対応するスプライトが見つからない場合は待つ
        return sprites;
    }

    function allBitmapsReady(sprites) {
        return sprites.every(s => s.bitmap && s.bitmap.isReady() && s.bitmap.width > 0);
    }

    function alignEnemies(sprites) {
        const n = sprites.length;
        if (n === 0) return;

        const widths = sprites.map(s => s.bitmap.width);
        const sumWidths = widths.reduce((a, b) => a + b, 0);

        let gap = gapX;
        if (n > 1) {
            const availableWidth = Graphics.boxWidth - marginX * 2;
            const naturalTotal = sumWidths + gapX * (n - 1);
            if (naturalTotal > availableWidth) {
                // 収まらない場合は隙間を圧縮する(マイナスになれば重なりも許容)
                gap = (availableWidth - sumWidths) / (n - 1);
            }
        }

        const totalWidth = sumWidths + gap * (n - 1);
        let x = Math.round(Graphics.boxWidth / 2 - totalWidth / 2);

        sprites.forEach((sprite, i) => {
            const centerX = x + widths[i] / 2;
            sprite._enemy._screenX = Math.round(centerX);
            sprite.setHome(Math.round(centerX), sprite._enemy.screenY());
            x += widths[i] + gap;
        });
    }

    let pendingAlign = false;

    const _Scene_Battle_start = Scene_Battle.prototype.start;
    Scene_Battle.prototype.start = function () {
        _Scene_Battle_start.call(this);
        pendingAlign = true;
    };

    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function () {
        _Scene_Battle_update.call(this);
        if (pendingAlign) {
            const sprites = getVisibleSprites(this);
            if (sprites && allBitmapsReady(sprites)) {
                alignEnemies(sprites);
                pendingAlign = false;
            }
        }
    };
})();
