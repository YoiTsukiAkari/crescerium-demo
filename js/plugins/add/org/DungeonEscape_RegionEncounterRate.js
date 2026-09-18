//=============================================================================
// DungeonEscape_RegionEncounterRate.js
//=============================================================================

/*~struct~RegionRate:ja
 * @param regionId
 * @text リージョンID
 * @desc このリージョンの上にいる時にエンカウント率を変更します
 * @type number
 * @min 1
 * @max 255
 * @default 1
 *
 * @param rate
 * @text エンカウント率(%)
 * @desc 100が基準(変更なし)。200なら約2倍の頻度、50なら約半分の頻度になります(数字を上げるほど頻繁になります)。
 * @type number
 * @min 1
 * @default 100
 */

/*:ja
 * @target MZ
 * @plugindesc リージョンIDごとにエンカウント率(歩数)を変更します (Ver3.0.0)
 * @author DungeonEscape開発用
 *
 * @param regionRates
 * @text リージョン別エンカウント率
 * @desc リージョンIDとエンカウント率(%)の対応リストです
 * @type struct<RegionRate>[]
 * @default []
 *
 * @help DungeonEscape_RegionEncounterRate.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * マップの[敵出現歩数]は本来マップ全体に一律で適用されますが、
 * このプラグインを使うと、プレイヤーが特定のリージョンの上に
 * いる間だけ、エンカウント率(歩数)を変更できます。
 *
 * ------------------------------------------------------------------
 * ◆使い方
 * ------------------------------------------------------------------
 * 1. マップのタイルセット[R]タブで、エンカウント率を変えたい
 *    エリアにリージョンIDを塗る。
 *
 * 2. プラグインパラメータ[リージョン別エンカウント率]に、
 *    そのリージョンIDと、割合(%)を追加する。
 *
 *      例) リージョンID: 5 / エンカウント率: 200
 *          → リージョン5の上にいる間は歩数が半分になり、
 *            結果としてエンカウントの頻度が約2倍になります。
 *
 *      例) リージョンID: 6 / エンカウント率: 50
 *          → リージョン6の上にいる間は歩数が2倍になり、
 *            エンカウントの頻度が約半分になります。
 *
 * ・数字を上げるほど頻繁に、下げるほど控えめになります
 *   (「率を上げる=エンカウントが増える」という直感的な対応です)。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・割合(%)は、そのマップに設定されている[敵出現歩数]を
 *   基準(100%)とした相対値です。マップごとの基本歩数が
 *   違っていても、同じリージョンIDなら同じ倍率で作用します。
 *
 * ・リストに登録していないリージョンの上では、通常通り
 *   マップ本来のエンカウント率のまま動作します。
 *
 * ・[敵グループをリージョンIDで指定する]標準機能(どの敵が
 *   出るか)とは別の設定です。両方を組み合わせて、
 *   「このエリアは特定の敵が・高頻度で出る」という
 *   使い方ができます。
 *
 * ------------------------------------------------------------------
 * ◆Ver3.0.0の変更点
 * ------------------------------------------------------------------
 * Ver2.0.0にあった「リージョン境界をまたいだ瞬間に再抽選する」処理を
 * 削除した。エンカウントの数え方自体を「経過歩数としきい値を毎回
 * 比較する」積み上げ方式(`DungeonEscape_FixedEncounterStep.js`側で
 * 実装)に変更したため、境界を意識した特別処理そのものが不要になった。
 * このプラグインは「リージョンごとの歩数(しきい値)を決める」役割に
 * 専念し、その値を実際にどう使ってエンカウントを判定するかは
 * `DungeonEscape_FixedEncounterStep.js`側の責務とする。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_RegionEncounterRate";
    const params = PluginManager.parameters(pluginName);

    let regionRates = {};
    try {
        const list = JSON.parse(params.regionRates || "[]");
        list.forEach(entryJson => {
            const entry = JSON.parse(entryJson);
            const regionId = Number(entry.regionId);
            const rate = Number(entry.rate);
            if (regionId > 0 && rate > 0) {
                regionRates[regionId] = rate;
            }
        });
    } catch (e) {
        console.error("DungeonEscape_RegionEncounterRate: パラメータの読み込みに失敗しました", e);
    }

    const _Game_Map_encounterStep = Game_Map.prototype.encounterStep;
    Game_Map.prototype.encounterStep = function () {
        const baseStep = _Game_Map_encounterStep.call(this);
        if (!$gamePlayer) return baseStep;
        const regionId = $gamePlayer.regionId();
        const rate = regionRates[regionId];
        if (rate === undefined) return baseStep;
        // rateが大きいほど歩数が減り、エンカウント頻度が上がるようにする
        return Math.max(1, Math.round((baseStep * 100) / rate));
    };
})();
