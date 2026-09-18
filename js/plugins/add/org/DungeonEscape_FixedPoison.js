/*:
 * @target MZ
 * @plugindesc ステートのメモ欄タグで、ターン経過時（戦闘中）または歩数経過時（マップ移動中）に
 * 固定値ダメージを与える毒効果を実装するプラグイン（演出付き）
 * @help DungeonEscape_FixedPoison.js
 *
 * ステートのメモ欄に以下のタグを記述してください（併用可）。
 *
 * <fixedPoison:X>            戦闘中、行動終了時などに毎ターンXの固定ダメージ
 * <fixedPoisonPerStep:X>     マップ移動中、1歩進むごとにXの固定ダメージ
 * <fixedPoisonPerStep:X,N>   マップ移動中、N歩進むごとにXの固定ダメージ
 *
 * 例:
 * <fixedPoison:15><fixedPoisonPerStep:15>
 *   → 戦闘中は毎ターン15ダメージ、マップ移動中は1歩ごとに15ダメージ
 *
 * <fixedPoisonPerStep:20,5>
 *   → マップ移動中、5歩ごとに20ダメージ
 *
 * <fixedPoisonMessage1:文言>  戦闘中、バトルログ1行目に表示したい場合のみ指定（省略時は非表示）。
 * <fixedPoisonMessage2:文言>  戦闘中、バトルログ2行目に表示したい場合のみ指定（省略時は非表示）。
 *                              どちらも%1=対象名、%2=ダメージ量（回復の場合も正の数）に置き換わります。
 *
 * 例:
 * <fixedPoison:15>  ※バトルログには何も表示されない
 *
 * <fixedPoison:15>
 * <fixedPoisonMessage1:%1は毒にかかっている！>
 * <fixedPoisonMessage2:%1は%2ダメージを受けた！>
 *   → 2行に分けてバトルログに表示される
 *
 * <fixedPoison:-40>
 * <fixedPoisonMessage1:%1は毒にかかっている！>
 * <fixedPoisonMessage2:%1は%2回復した！！>
 *   → 回復の場合も、指定していればメッセージは表示される（%2は40のように正の数）
 *
 * ------------------------------------------------------------------
 * ◆演出について
 * ------------------------------------------------------------------
 * ・マップ移動中のダメージ発生時、標準のダメージ床と同じ赤フラッシュが入ります。
 * ・戦闘中のダメージ発生時、画面が軽く揺れます（アクターが被ダメージ時に標準で使う
 *   揺れと同じ強さ・速さ・持続に統一。フロントビューでは味方にダメージ時スプライトが
 *   存在しないため、本来この揺れが被ダメージの合図になります）。
 * ・頭上のダメージ数値ポップアップは、敵（Game_Enemy）が対象の場合のみ表示されます。
 *   フロントビューの味方（Game_Actor）にはスプライト自体が存在しないため表示されません。
 * ・画面揺れ・ダメージポップアップは、ダメージ時（プラス値）のみ発生します。回復時
 *   （マイナス値）はこれらの演出は発生しませんが、バトルログのテキストは
 *   ダメージ・回復どちらでも、<fixedPoisonMessage1/2>を指定していれば表示されます。
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・<fixedPoison:X>は戦闘中のみ発動します（RPGツクールMZの標準仕様である
 *   「マップ上で20歩＝1ターンとみなして自動発動する」挙動は、このプラグインでは
 *   意図的に無効化しています）。
 * ・歩数の判定は$gameParty.steps()（ゲーム開始からの累計歩数）を基準にしています。
 * ・<fixedPoisonPerStep:X>による戦闘不能は、システム1「スリップダメージで戦闘不能」の
 *   設定に関わらず常に有効です。マップ上でパーティ全員が戦闘不能になった場合、
 *   ゲームオーバーになります。
 * ・マイナスの値を指定すると回復として扱われます（この場合、画面揺れ・ポップアップは
 *   発生しませんが、バトルログのテキストは表示されます）。
 */

(() => {
  'use strict';

  // ---- バトルログのキューで発火する画面揺れ(表示タイミングと同期させるため) ----
  Window_BattleLog.prototype.performFixedPoisonShake = function() {
    $gameScreen.startShake(5, 5, 10);
  };

  // ---- 戦闘中のみ発動：ターン経過ダメージ（演出付き） ----
  const _Game_Battler_regenerateHp = Game_Battler.prototype.regenerateHp;

  Game_Battler.prototype.regenerateHp = function() {
    _Game_Battler_regenerateHp.call(this);

    if (!$gameParty.inBattle()) return; // マップ上(20歩ごと)の自動発動を無効化

    for (const state of this.states()) {
      const tag = state.meta.fixedPoison;
      if (tag && this.hp > 0) {
        const damage = Number(tag);
        this.gainHp(-damage);

        if (damage !== 0) {
          if (damage > 0) {
            // ダメージ数値のポップアップ・画面揺れは、ダメージ時（プラス値）のみ
            this.result().clear();
            this.result().hpAffected = true;
            this.result().hpDamage = damage;
            this.startDamagePopup();
          }

          if (BattleManager._logWindow) {
            if (damage > 0) {
              // 画面揺れ（アクター被ダメージ時の標準演出と同じ数値: rmmz_objects.js Game_Actor.performDamage）
              // メッセージと同じキューに乗せることで、実際に表示されるタイミングと同期させる
              BattleManager._logWindow.push("performFixedPoisonShake");
            }

            // バトルログへのテキスト表示（1行目・2行目それぞれ指定した場合のみ）
            // ダメージ・回復どちらでも表示する。%2は見た目のため常に正の数にする
            const format = (tagName) => {
              const raw = state.meta[tagName];
              return raw ? raw.replace("%1", this.name()).replace("%2", Math.abs(damage)) : null;
            };
            const line1 = format("fixedPoisonMessage1");
            const line2 = format("fixedPoisonMessage2");
            if (line1) BattleManager._logWindow.push("addText", line1);
            if (line2) BattleManager._logWindow.push("addText", line2);
            if (line1 || line2) {
              BattleManager._logWindow.push("wait");
              BattleManager._logWindow.push("clear");
            }
          }
        }
      }
    }
  };

  // ---- マップ移動中のみ発動：歩数指定ダメージ（赤フラッシュ付き） ----
  const _Game_Player_increaseSteps = Game_Player.prototype.increaseSteps;

  Game_Player.prototype.increaseSteps = function() {
    _Game_Player_increaseSteps.call(this);

    if ($gameParty.inBattle()) return;

    const totalSteps = $gameParty.steps();
    let damageOccurred = false;

    for (const actor of $gameParty.members()) {
      if (actor.hp <= 0) continue;
      for (const state of actor.states()) {
        const tag = state.meta.fixedPoisonPerStep;
        if (!tag) continue;

        const parts = String(tag).split(",");
        const damage = Number(parts[0]);
        const interval = parts[1] ? Number(parts[1]) : 1;

        if (interval > 0 && totalSteps % interval === 0) {
          actor.gainHp(-damage);
          if (damage > 0) damageOccurred = true;
        }
      }
    }

    if (damageOccurred) {
      $gameScreen.startFlashForDamage(); // 標準のダメージ床と同じ赤フラッシュ
    }

    if ($gameParty.isAllDead()) {
      SceneManager.goto(Scene_Gameover);
    }
  };
})();
