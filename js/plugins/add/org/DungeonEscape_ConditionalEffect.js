/*:
 * @target MZ
 * @plugindesc スキルのメモ欄タグで、ステート付与に条件式を追加できるプラグイン Ver2.1.0
 * @help
 * ------------------------------------------------------------------
 * ◆書式1：スキル全体に1つだけ条件を付ける（従来の書式）
 * ------------------------------------------------------------------
 * <stateCondition:条件式>
 *
 * 条件式には a（使用者）, b（対象）が使えます。
 * 条件を満たさない場合、そのスキルの「ステート付加」効果は
 * （複数あれば全て）発動しません。
 *
 * 例:
 * <stateCondition:b.hpRate() <= 1/3>   対象のHPが1/3以下の時だけステート付与
 *
 * ------------------------------------------------------------------
 * ◆書式2：ステートIDを指定して、そのステートだけに条件を付ける（Ver2.0.0で追加）
 * ------------------------------------------------------------------
 * <stateCondition:ステートID:条件式>
 *
 * 1つのスキルに複数書けます。指定したステートID以外の「ステート付加」
 * 効果には影響しません（無条件のまま動作します）。
 *
 * 例:
 * <stateCondition:120:b.isStateAffected(115)>
 *   → ステートID120の付加だけ、「対象がステートID115を持っている時」に限定する。
 *     同じスキルの他のステート付加（例：蔦など）は今まで通り無条件で発動する。
 *
 * ※書式1と書式2は併用しないでください。書式2（ステートID指定）が
 *   1つでもある場合、書式1は無視されます。
 *
 * ------------------------------------------------------------------
 * ◆書式3：ステート解除にも条件を付ける（Ver2.2.0で追加）
 * ------------------------------------------------------------------
 * <removeCondition:ステートID:条件式>
 *
 * 書式2と同じ書き方で、「ステート解除」効果に条件を付けられます。
 * 指定がない「ステート解除」効果は今まで通り無条件のままです。
 *
 * 例（進行型ステートの1段階目→2段階目の切り替え）:
 * <stateCondition:129:hadState(128)>     対象が既に128を持っていた時だけ129を付加
 * <removeCondition:128:hadState(128)>    同じ条件で128を解除（＝129に進む時だけ128を消す）
 *
 * こうすると、128が"今回初めて"付与された時（hadState(128)がfalse）は
 * 解除も発動しないため、付けたそばから消えてしまう事故を防げます。
 *
 * ------------------------------------------------------------------
 * ◆条件式で使える変数・関数
 * ------------------------------------------------------------------
 * a … 使用者(Game_Battler)
 * b … 対象(Game_Battler)
 * hadState(ステートID) … 対象が「このスキルの効果が処理される前」に
 *   そのステートを持っていたかどうか(true/false)。
 *   DungeonEscape_SelfEffects.jsが記録する`_preDamageStates`を参照する。
 *   「ステート解除」効果より後ろに条件付きの「ステート付加」を置いても、
 *   解除される"前"の状態で正しく判定したい場合に使う
 *   （b.isStateAffected(...)は"今の瞬間"の判定なので、同じ命中処理内で
 *   他の効果が先にステートを付け外ししていると、意図と違う結果になる
 *   ことがある）。
 *
 * 例:
 * <stateCondition:119:hadState(123)>
 *   → ステートID119の付加は、「対象がこのスキルの効果処理前に
 *     ステートID123を持っていたか」で判定する
 *
 * ------------------------------------------------------------------
 * ◆注意点
 * ------------------------------------------------------------------
 * ・条件判定は、そのスキルの使用効果リストで「その効果が実際に処理される
 *   瞬間」に評価されます。b.isStateAffected(...)のような"今の瞬間"の判定を
 *   使う場合は、使用効果の並び順（上から処理される）に注意してください。
 *   hadState(...)を使えば、並び順を気にせず「処理開始前の状態」で
 *   判定できます。
 */

(() => {
  const _Game_Action_itemEffectAddState = Game_Action.prototype.itemEffectAddState;
  const _Game_Action_itemEffectRemoveState = Game_Action.prototype.itemEffectRemoveState;

  function parseTagMap(note, tagName) {
    const map = {};
    if (!note) return map;
    const re = new RegExp(`<${tagName}:(\\d+):([^>]+)>`, "g");
    let m;
    while ((m = re.exec(note))) {
      map[Number(m[1])] = m[2].trim();
    }
    return map;
  }

  function evaluateCondition(actionSelf, item, target, effect, tag, label) {
    const a = actionSelf.subject();
    const b = target;
    const preStates = actionSelf._preDamageStates || []; // DungeonEscape_SelfEffects.jsが記録
    const hadState = stateId => preStates.some(s => s && s.id === stateId);
    let conditionMet = false;
    let errorInfo = null;
    try {
      conditionMet = !!eval(tag);
    } catch (e) {
      conditionMet = false;
      errorInfo = e.message;
    }
    console.log(
      `[ConditionalEffectDebug][${label}] item="${item.name}" ` +
      `対象ステートID(effect.dataId)=${effect.dataId} 条件式="${tag}" ` +
      `判定対象(b)=${b.name()} 結果=${conditionMet}` +
      (errorInfo ? ` エラー="${errorInfo}"` : "")
    );
    return conditionMet;
  }

  Game_Action.prototype.itemEffectAddState = function(target, effect) {
    const item = this.item();

    if (item) {
      const perState = parseTagMap(item.note, "stateCondition");
      const hasPerStateTags = Object.keys(perState).length > 0;

      let tag = null;
      if (hasPerStateTags) {
        if (Object.prototype.hasOwnProperty.call(perState, effect.dataId)) {
          tag = perState[effect.dataId];
        }
      } else if (item.meta.stateCondition) {
        tag = item.meta.stateCondition;
      }

      if (tag && !evaluateCondition(this, item, target, effect, tag, "付加")) {
        return;
      }
    }

    _Game_Action_itemEffectAddState.call(this, target, effect);
  };

  Game_Action.prototype.itemEffectRemoveState = function(target, effect) {
    const item = this.item();

    if (item) {
      const perState = parseTagMap(item.note, "removeCondition");
      if (Object.prototype.hasOwnProperty.call(perState, effect.dataId)) {
        const tag = perState[effect.dataId];
        if (!evaluateCondition(this, item, target, effect, tag, "解除")) {
          return;
        }
      }
    }

    _Game_Action_itemEffectRemoveState.call(this, target, effect);
  };
})();
