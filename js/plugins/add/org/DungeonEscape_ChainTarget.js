/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグで、指定した敵も巻き込んで攻撃するプラグイン（スコープ:敵単体のスキル用） (Ver1.2.0)
 * @help DungeonEscape_ChainTarget.js
 *
 * 以下のタグが使えます（スコープ:敵単体のスキルに設定してください）。
 *
 * <chainState:X>
 *   指定したステートID(X)を持つ、他の生存中の敵も巻き込んで攻撃します。
 *   例: <chainState:60>  → ステートID60（濡れ）を持つ敵も巻き込む
 *   巻き込まれた対象には _chainTargetFlag が立ちます。
 *
 * <splashNext>
 *   トループの配置順でメイン対象の次にあたる、生存中の敵1体を
 *   巻き込んで攻撃します。メイン対象が配置の一番後ろの場合は、
 *   先頭に戻って探します（循環）。
 *   巻き込まれた対象には _splashTargetFlag が立ちます。
 *
 * <splashBothSides>
 *   トループの配置順でメイン対象の両隣（前後1体ずつ、生存中のみ）を
 *   巻き込んで攻撃します。メイン対象が配置の端（先頭/末尾）の場合、
 *   片側の隣しかいなければその1体だけが対象になります（循環はしません）。
 *   最大3体（メイン対象＋両隣）が対象になります。
 *   巻き込まれた対象には _splashTargetFlag が立ちます。
 *
 * いずれも「対象リストに追加するだけ」の実装なので、属性有効度・
 * PDR/MDR・弱点演出・TP上昇なども、通常の攻撃と同様にそのまま
 * 反映されます。巻き込み時のダメージ減衰（例:50%）は、
 * ダメージ計算式側で上記のフラグを参照して設定してください。
 *
 * 例: ダメージ計算式に (b._chainTargetFlag || b._splashTargetFlag ? 0.5 : 1) を掛ける
 *
 * ------------------------------------------------------------------
 * ◆Ver1.2.0での変更点
 * ------------------------------------------------------------------
 * 以前は`DungeonEscape_DamageRate.js`側が、ダメージ計算後にこの
 * フラグをfalseへ戻す役割を兼ねていたが、そちらの一律減衰処理を
 * 廃止したことに伴い、フラグを戻す処理がどこにも無くなっていた
 * (一度巻き込み対象になった敵に、以後ずっとフラグが残り続けて
 * しまうバグに繋がる)。このプラグイン自身が、毎回の対象決定の
 * 冒頭で敵全員分のフラグをリセットしてから、新たに巻き込み判定を
 * 行うようにした。
 */

(() => {
  const _Game_Action_makeTargets = Game_Action.prototype.makeTargets;

  Game_Action.prototype.makeTargets = function() {
    let targets = _Game_Action_makeTargets.call(this);
    const item = this.item();

    if (item && this.isForOpponent()) {
      // 前回の行動で立ったままになっているフラグが残っていないよう、
      // 毎回この行動の対象決定の直前にリセットしておく
      // (以前はダメージ計算側でフラグを倒す処理をしていたが、
      //  一律減衰の廃止に伴いこちらに責務を移した)
      for (const enemy of this.opponentsUnit().members()) {
        enemy._chainTargetFlag = false;
        enemy._splashTargetFlag = false;
      }

      // <chainState:X> ステートを持つ他の敵を巻き込む
      if (item.meta.chainState) {
        const stateId = Number(item.meta.chainState);
        const alreadyTargeted = new Set(targets);
        const extraTargets = this.opponentsUnit().aliveMembers().filter(enemy => {
          return !alreadyTargeted.has(enemy) && enemy.isStateAffected(stateId);
        });
        extraTargets.forEach(enemy => { enemy._chainTargetFlag = true; });
        targets = targets.concat(extraTargets);
      }

      // <splashNext> 配置順で次の敵を1体巻き込む
      if (item.meta.splashNext) {
        const mainTarget = targets[0];
        if (mainTarget) {
          const allMembers = this.opponentsUnit().members();
          const index = allMembers.indexOf(mainTarget);
          if (index !== -1) {
            const n = allMembers.length;
            for (let offset = 1; offset <= n; offset++) {
              const candidate = allMembers[(index + offset) % n];
              if (candidate !== mainTarget && candidate.isAlive() && !targets.includes(candidate)) {
                candidate._splashTargetFlag = true;
                targets = targets.concat([candidate]);
                break;
              }
            }
          }
        }
      }

      // <splashBothSides> 配置順で両隣（前後1体ずつ）を巻き込む（循環なし）
      if (item.meta.splashBothSides) {
        const mainTarget = targets[0];
        if (mainTarget) {
          const allMembers = this.opponentsUnit().members();
          const index = allMembers.indexOf(mainTarget);
          if (index !== -1) {
            const candidates = [allMembers[index - 1], allMembers[index + 1]];
            for (const candidate of candidates) {
              if (candidate && candidate.isAlive() && !targets.includes(candidate)) {
                candidate._splashTargetFlag = true;
                targets = targets.concat([candidate]);
              }
            }
          }
        }
      }
    }

    return targets;
  };
})();
