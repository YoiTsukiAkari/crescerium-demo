/*:
 * @target MZ
 * @plugindesc 選択肢のインタラクションに遅延をかけるプラグインです。
 * @help このプラグインは、選択肢のインタラクションに遅延をかけます。
 *
 * @param delayTime
 * @text 遅延時間
 * @desc 選択肢のインタラクションにかかる遅延時間（ミリ秒）。デフォルトは500ミリ秒。
 * @default 500
 */

(() => {
    const parameters = PluginManager.parameters('InteractionDelay');
    const delayTime = Number(parameters['delayTime'] || 500);

    const _Window_ChoiceList_start = Window_ChoiceList.prototype.start;
    Window_ChoiceList.prototype.start = function() {
        _Window_ChoiceList_start.call(this);
        this._interactionEnabled = false;
        setTimeout(() => {
            this._interactionEnabled = true;
        }, delayTime);
    };

    const _Window_ChoiceList_processOk = Window_ChoiceList.prototype.processOk;
    Window_ChoiceList.prototype.processOk = function() {
        if (this._interactionEnabled) {
            _Window_ChoiceList_processOk.call(this);
        }
    };

    const _Window_ChoiceList_processCancel = Window_ChoiceList.prototype.processCancel;
    Window_ChoiceList.prototype.processCancel = function() {
        if (this._interactionEnabled) {
            _Window_ChoiceList_processCancel.call(this);
        }
    };
})();
