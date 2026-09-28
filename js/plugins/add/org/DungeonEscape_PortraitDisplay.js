//=============================================================================
// DungeonEscape_PortraitDisplay.js
//=============================================================================

/*:ja
 * @target MZ
 * @plugindesc 「文章の表示」の名前欄からクレイ・セラの立ち絵と表情差分を自動表示するプラグイン Ver1.2.1
 * @author DungeonEscape開発用
 *
 * @param pictureFolder
 * @text 画像フォルダ
 * @desc img/pictures/以下のサブフォルダ名。空欄ならimg/pictures/直下を参照
 * @default add
 *
 * @param autoEraseOnEffect
 * @text 自動消去(演出コマンド/イベント終了時)
 * @desc ON推奨。演出系コマンド実行時、および1つのイベントページが完全に終了した時に、表示中の立ち絵を自動でフェード消去する
 * @type boolean
 * @default true
 *
 * @param bothNames
 * @text 二人同時強調の名前候補
 * @desc 「文章の表示」の名前欄にこの文字列が入力された時、クレイ・セラ両方を通常トーン(明転)にする(カンマ区切りで複数可)
 * @default クレイ＆セラ
 *
 * @param clayNames
 * @text クレイの名前候補
 * @desc 「文章の表示」の名前欄に入力される、クレイを指す文字列(カンマ区切りで複数可)
 * @default クレイ
 *
 * @param clayKey
 * @text クレイの画像キー
 * @desc 立ち絵ファイルを置くサブフォルダ名(例:clayなら img/pictures/(画像フォルダ)/clay/1.png ...)
 * @default clay
 *
 * @param clayPictureIdA
 * @text クレイ ピクチャ番号A
 * @type number
 * @default 90
 *
 * @param clayPictureIdB
 * @text クレイ ピクチャ番号B(オーバーレイ用)
 * @desc 表情切替フェード専用。必ずピクチャ番号Aより大きい数値にすること(手前に描画するため)
 * @type number
 * @default 91
 *
 * @param clayX
 * @text クレイ 表示X座標
 * @type number
 * @default 200
 *
 * @param clayY
 * @text クレイ 表示Y座標
 * @type number
 * @default 460
 *
 * @param seraNames
 * @text セラの名前候補
 * @desc 「文章の表示」の名前欄に入力される、セラを指す文字列(カンマ区切りで複数可)
 * @default セラ
 *
 * @param seraKey
 * @text セラの画像キー
 * @desc 立ち絵ファイルを置くサブフォルダ名(例:seraなら img/pictures/(画像フォルダ)/sera/1.png ...)
 * @default sera
 *
 * @param seraPictureIdA
 * @text セラ ピクチャ番号A
 * @type number
 * @default 92
 *
 * @param seraPictureIdB
 * @text セラ ピクチャ番号B(オーバーレイ用)
 * @desc 表情切替フェード専用。必ずピクチャ番号Aより大きい数値にすること(手前に描画するため)
 * @type number
 * @default 93
 *
 * @param seraX
 * @text セラ 表示X座標
 * @type number
 * @default 616
 *
 * @param seraY
 * @text セラ 表示Y座標
 * @type number
 * @default 460
 *
 * @param scale
 * @text 表示倍率(%)
 * @type number
 * @default 100
 *
 * @param defaultExpression
 * @text デフォルト表情番号
 * @desc 名前欄に表情番号の指定が無い場合(初表示時)に使う番号
 * @type number
 * @default 1
 *
 * @param fadeDuration
 * @text フェード時間(フレーム)
 * @desc 表示/消去/表情切替/明暗トーン変化、共通で使うフェード時間
 * @type number
 * @default 20
 *
 * @param dimToneR
 * @text 非話者トーン R
 * @type number
 * @min -255
 * @max 255
 * @default -68
 *
 * @param dimToneG
 * @text 非話者トーン G
 * @type number
 * @min -255
 * @max 255
 * @default -68
 *
 * @param dimToneB
 * @text 非話者トーン B
 * @type number
 * @min -255
 * @max 255
 * @default -68
 *
 * @command show
 * @text ポートレート表示
 * @desc 指定キャラクターの立ち絵をフェード表示します
 *
 * @arg character
 * @text キャラクター
 * @type select
 * @option クレイ
 * @value clay
 * @option セラ
 * @value sera
 * @option 両方
 * @value both
 * @default both
 *
 * @arg expression
 * @text 表情番号
 * @desc 省略時(0)はデフォルト表情番号を使用します
 * @type number
 * @default 0
 *
 * @arg duration
 * @text フェード時間(フレーム)
 * @desc 省略時(0)はプラグインパラメータのフェード時間を使用します
 * @type number
 * @default 0
 *
 * @command erase
 * @text ポートレート消去
 * @desc 指定キャラクターの立ち絵をフェードアウトして消去します
 *
 * @arg character
 * @text キャラクター
 * @type select
 * @option クレイ
 * @value clay
 * @option セラ
 * @value sera
 * @option 両方
 * @value both
 * @default both
 *
 * @arg duration
 * @text フェード時間(フレーム)
 * @desc 省略時(0)はプラグインパラメータのフェード時間を使用します
 * @type number
 * @default 0
 *
 * @help DungeonEscape_PortraitDisplay.js
 *
 * ------------------------------------------------------------------
 * ◆概要
 * ------------------------------------------------------------------
 * 「文章の表示」イベントコマンドの名前欄に話者を書くだけで、対応する
 * 立ち絵の表示・表情差分の切り替え・話者側を明るく/非話者側を暗く
 * するトーン変化を自動で行います。
 *
 * 名前欄の書き方:
 *   クレイ        → クレイの立ち絵を表示(未表示なら新規フェードイン)。
 *                    表情は変えず、話者としてクレイを強調表示にする。
 *   クレイ\1      → クレイの表情を「1」に切り替える(クロスフェード)。
 *                    未表示なら表情1でフェードイン。
 *   クレイ\2      → クレイの表情を「2」に切り替える。
 *   クレイ＆セラ  → クレイ・セラ両方を通常トーン(明転)にする
 *                    (「二人同時強調の名前候補」パラメータで文字列を変更可)。
 *   (空欄)         → ナレーション行として扱い、表示中のクレイ・セラを
 *                    両方とも通常トーン(明転)にする(表示状態自体は維持)。
 *
 * 立ち絵を一時的に消すために透明PNGを表情差分として使う運用も可能です。
 * 透明画像への切替を含む表情クロスフェードでは、フェード終了後に
 * オーバーレイ層を実際に消去するため、以前の表情が残像として残るのを
 * 防ぎます。また通常の消去処理でも、フェード終了後にA/B両レイヤーを
 * 実際に消去します。
 *
 * 「\」の代わりに全角の「¥」でも認識します(例:クレイ¥2)。
 *
 * 名前欄にはクレイ・セラどちらかの名前(プラグインパラメータで設定した
 * 候補文字列)のみを書いてください。それ以外の文字列は一切加工せず、
 * そのまま通常の名前ボックスとして表示されます(立ち絵の操作もしません)。
 *
 * 画像ファイルは img/pictures/(画像フォルダ)/(画像キー)/(表情番号).png
 * の構成で配置してください。画像フォルダのデフォルトは「add」なので、
 * 例: img/pictures/add/clay/1.png, img/pictures/add/clay/2.png,
 *     img/pictures/add/sera/1.png ...
 *
 * ------------------------------------------------------------------
 * ◆プラグインコマンド
 * ------------------------------------------------------------------
 * 「ポートレート表示」「ポートレート消去」を用意しています。
 * クレイ・セラは基本的に同時に画面へ出入りすることが多いため、
 * 「両方」を選ぶと2人まとめて表示/消去できます(クレイ→セラの順で
 * 同一フレーム内に処理されるため、実質同時表示になります)。
 * 個別に出入りさせたいソロシーンでは、キャラクターを指定してください。
 *
 * ------------------------------------------------------------------
 * ◆自動消去(演出コマンド/イベント終了時)
 * ------------------------------------------------------------------
 * 「自動消去(演出コマンド/イベント終了時)」をONにすると、以下の
 * 2つのタイミングで、表示中の立ち絵を自動でフェードアウトさせます。
 *
 * 1. 画面に見える演出系コマンドの実行時(条件分岐・ラベル・変数の
 *    操作などロジック系コマンドは対象外):
 *      場所移動 / 移動ルートの設定 / イベントの位置設定 / イベントの
 *      一時消去 / アニメーションの表示 / フキダシの表示 / 画面の
 *      フェードイン・アウト / 色調変更 / フラッシュ / シェイク /
 *      ピクチャ関連(表示・移動・回転・色調変更・消去) / 天候の変更 /
 *      ムービーの再生
 *
 * 2. 1つのイベントページ全体が完全に終了した時
 *    (呼び出したコモンイベントの終了ではなく、一番外側のイベント
 *    ページ自体が終わったタイミングのみ対象。イベント終了後に立ち絵
 *    が消し忘れで残ってしまうのを防ぐためのものです)
 *
 * 消去後、次に名前欄タグ付きの文章の表示が来れば、通常の「未表示なら
 * 新規フェードイン」の仕組みでそのまま自動的に再表示されます(再表示側
 * の特別な設定は不要です)。
 *
 * ------------------------------------------------------------------
 * ◆注意
 * ------------------------------------------------------------------
 * ピクチャ番号(A/B)は、他のイベント・演出で使っているピクチャ番号と
 * 重複しないようにしてください。1人につき2枚(表情フェード用)消費
 * します。
 *
 * ピクチャ番号は「番号が大きいほど手前に描画される」というツクール
 * MZの仕様上、ピクチャ番号B(オーバーレイ層)は必ずピクチャ番号A
 * (ベース層)より大きい数値にしてください。逆にすると、表情切替の
 * フェード中に背景が透けて見えてしまいます。
 *
 * 利用規約:このプロジェクト専用プラグインです。
 */

(() => {
    "use strict";
    const pluginName = "DungeonEscape_PortraitDisplay";
    const params = PluginManager.parameters(pluginName);

    const pictureFolder = String(params.pictureFolder || "").trim();
    const scale = Number(params.scale || 100);
    const defaultExpression = Number(params.defaultExpression || 1);
    const defaultFadeDuration = Number(params.fadeDuration || 20);
    const autoEraseOnEffect = String(params.autoEraseOnEffect || "true") === "true";
    const dimTone = [
        Number(params.dimToneR || -68),
        Number(params.dimToneG || -68),
        Number(params.dimToneB || -68),
        0
    ];
    const normalTone = [0, 0, 0, 0];

    // 「文章の表示以外」のうち、画面に見える演出系コマンドのコード番号。
    // 条件分岐・ラベル・変数の操作などロジック系コマンドは含めない。
    const EFFECT_COMMAND_CODES = new Set([
        201, // 場所移動
        203, // イベントの位置設定
        205, // 移動ルートの設定
        214, // イベントの一時消去
        212, // アニメーションの表示
        213, // フキダシの表示
        221, // 画面のフェードアウト
        222, // 画面のフェードイン
        223, // 色調の変更
        224, // フラッシュ
        225, // 画面のシェイク
        231, // ピクチャの表示
        232, // ピクチャの移動
        233, // ピクチャの回転
        234, // ピクチャの色調変更
        235, // ピクチャの消去
        236, // 天候の設定
        261  // ムービーの再生
    ]);

    function parseNames(text) {
        return String(text || "")
            .split(",")
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    // キャラクター定義
    const characters = {
        clay: {
            key: String(params.clayKey || "clay"),
            names: parseNames(params.clayNames || "クレイ"),
            pictureIdA: Number(params.clayPictureIdA || 90),
            pictureIdB: Number(params.clayPictureIdB || 91),
            x: Number(params.clayX || 200),
            y: Number(params.clayY || 460),
            shown: false,
            currentExpression: null
        },
        sera: {
            key: String(params.seraKey || "sera"),
            names: parseNames(params.seraNames || "セラ"),
            pictureIdA: Number(params.seraPictureIdA || 92),
            pictureIdB: Number(params.seraPictureIdB || 93),
            x: Number(params.seraX || 616),
            y: Number(params.seraY || 460),
            shown: false,
            currentExpression: null
        }
    };
    const characterList = [characters.clay, characters.sera];
    const bothNames = parseNames(params.bothNames || "クレイ＆セラ");

    // ------------------------------------------------------------------
    // 名前欄の解析
    // ------------------------------------------------------------------
    // 戻り値:
    //   通常話者:   { both: false, chara, key, displayName, expression(数値 or null) }
    //   二人同時:   { both: true, displayName }
    //   該当なし:   null
    function parseSpeaker(rawName) {
        if (!rawName) return null;
        for (const alias of bothNames) {
            if (rawName === alias) {
                return { both: true, displayName: alias };
            }
        }
        for (const key of Object.keys(characters)) {
            const chara = characters[key];
            for (const alias of chara.names) {
                if (rawName === alias) {
                    return { both: false, chara, key, displayName: alias, expression: null };
                }
                if (rawName.startsWith(alias)) {
                    const rest = rawName.slice(alias.length);
                    const m = rest.match(/^[\\¥](\d+)$/);
                    if (m) {
                        return {
                            both: false,
                            chara,
                            key,
                            displayName: alias,
                            expression: Number(m[1])
                        };
                    }
                }
            }
        }
        return null;
    }

    // ------------------------------------------------------------------
    // 表示・表情切替・明暗トーンの実処理
    // ------------------------------------------------------------------
    function pictureFileName(chara, expression) {
        const parts = [];
        if (pictureFolder) parts.push(pictureFolder);
        parts.push(chara.key, String(expression));
        return parts.join("/");
    }

    function applyTone(chara, tone, duration) {
        for (const picId of [chara.pictureIdA, chara.pictureIdB]) {
            const picture = $gameScreen.picture(picId);
            if (picture) {
                picture.tint(tone, duration);
            }
        }
    }

    // フェードアウトしたピクチャを「透明なまま残す」のではなく、
    // フェード完了後にGame_Screenから実際に消去するための予約。
    // 同じピクチャ番号に新しいGame_Pictureが表示された場合は、古い予約を
    // 無効扱いにして新しい立ち絵を誤って消さない。
    const pendingPictureErases = new Map();

    function cancelPendingErase(pictureId) {
        pendingPictureErases.delete(pictureId);
    }

    function erasePictureNow(pictureId) {
        cancelPendingErase(pictureId);
        if ($gameScreen.picture(pictureId)) {
            $gameScreen.erasePicture(pictureId);
        }
    }

    function scheduleEraseAfterFade(pictureId, picture, duration) {
        if (!picture) return;
        if (duration <= 0) {
            if ($gameScreen.picture(pictureId) === picture) {
                $gameScreen.erasePicture(pictureId);
            }
            cancelPendingErase(pictureId);
            return;
        }
        pendingPictureErases.set(pictureId, picture);
    }

    const _Game_Screen_update = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function () {
        _Game_Screen_update.call(this);
        for (const [pictureId, scheduledPicture] of pendingPictureErases) {
            const currentPicture = this.picture(pictureId);
            if (currentPicture !== scheduledPicture) {
                // 同じ番号に別のピクチャが表示済みなら、古い消去予約だけ破棄する。
                pendingPictureErases.delete(pictureId);
            } else if (currentPicture._duration <= 0 && currentPicture.opacity() <= 0) {
                this.erasePicture(pictureId);
                pendingPictureErases.delete(pictureId);
            }
        }
    };

    // ベース層(pictureIdA)は常に不透明(255)を維持し続ける。
    // 表情を変える瞬間だけ、オーバーレイ層(pictureIdB)に「変更前の絵」を
    // 100%不透明で複製表示してベース層を隠し、その裏でベース層の絵を
    // 新しい表情へ瞬時に差し替え、オーバーレイ層だけを0%までフェード
    // アウトさせることで下のベース層(新表情)を見せる。
    // ベース層が常に画面を覆っているため、フェード中に背景が透けない。
    // duration=0でもピクチャの表示自体は即座に切り替わる(移動アニメが0フレームになるだけ)。
    function showOrSwitchExpression(chara, expression, duration) {
        if (!chara.shown) {
            const expr = expression !== null && expression !== undefined
                ? expression
                : defaultExpression;

            // 前回のクロスフェード途中などでB層が残っていても、新規表示時には
            // 必ず掃除してから開始する。A層はshowPictureで安全に置き換わる。
            erasePictureNow(chara.pictureIdB);
            cancelPendingErase(chara.pictureIdA);

            // 新規フェードイン(この場合のみ、ベース層自体を0→255でフェード)
            const name = pictureFileName(chara, expr);
            $gameScreen.showPicture(chara.pictureIdA, name, 1, chara.x, chara.y, scale, scale, 0, 0);
            $gameScreen.picture(chara.pictureIdA).move(1, chara.x, chara.y, scale, scale, 255, 0, duration, 0);
            chara.shown = true;
            chara.currentExpression = expr;
        } else if (expression !== null && expression !== undefined && expression !== chara.currentExpression) {
            const oldName = pictureFileName(chara, chara.currentExpression);
            const newName = pictureFileName(chara, expression);

            // 直前の表情切替で透明化したB層が残っている可能性があるため、
            // 新しいクロスフェードを始める前に実体ごと消去する。
            erasePictureNow(chara.pictureIdB);
            cancelPendingErase(chara.pictureIdA);

            // 1. 変更前の絵をオーバーレイ層に不透明のまま複製表示(ベース層を隠す)
            $gameScreen.showPicture(chara.pictureIdB, oldName, 1, chara.x, chara.y, scale, scale, 255, 0);
            // 2. ベース層を新しい表情へ瞬時に差し替え(オーバーレイに隠れて見えない)
            $gameScreen.showPicture(chara.pictureIdA, newName, 1, chara.x, chara.y, scale, scale, 255, 0);
            // 3. オーバーレイ層だけをフェードアウトし、ベース層(新表情)を見せる
            const overlayPicture = $gameScreen.picture(chara.pictureIdB);
            overlayPicture.move(1, chara.x, chara.y, scale, scale, 0, 0, duration, 0);
            // 4. フェード完了後、透明になったB層を実際に消去する。
            scheduleEraseAfterFade(chara.pictureIdB, overlayPicture, duration);

            chara.currentExpression = expression;
        }
    }

    function eraseCharacter(chara, duration) {
        // shownフラグがfalseでも、以前のフェード途中などでA/Bのピクチャ実体が
        // 残っている可能性があるため、存在するものは必ず消去対象にする。
        for (const picId of [chara.pictureIdA, chara.pictureIdB]) {
            const picture = $gameScreen.picture(picId);
            if (picture) {
                cancelPendingErase(picId);
                picture.move(
                    picture.origin(), picture.x(), picture.y(),
                    picture.scaleX(), picture.scaleY(),
                    0, picture.blendMode(), duration, 0
                );
                scheduleEraseAfterFade(picId, picture, duration);
            }
        }
        chara.shown = false;
        chara.currentExpression = null;
    }

    function eraseAllShown(duration) {
        for (const chara of characterList) {
            eraseCharacter(chara, duration);
        }
    }

    function highlightSpeaker(speakingChara, duration) {
        for (const chara of characterList) {
            if (chara === speakingChara) {
                applyTone(chara, normalTone, duration);
            } else if (chara.shown) {
                applyTone(chara, dimTone, duration);
            }
        }
    }

    // ------------------------------------------------------------------
    // 「文章の表示」フック
    // ------------------------------------------------------------------
    const _Game_Interpreter_command101 = Game_Interpreter.prototype.command101;
    Game_Interpreter.prototype.command101 = function (params) {
        const rawName = params[4];
        const parsed = parseSpeaker(rawName);
        if (parsed && parsed.both) {
            // 二人同時強調: 両方を表示(未表示なら表情はそのまま/デフォルトでフェードイン)し、
            // 両方とも通常トーン(明転)にする
            for (const chara of characterList) {
                showOrSwitchExpression(chara, null, defaultFadeDuration);
                applyTone(chara, normalTone, defaultFadeDuration);
            }
            const newParams = params.slice();
            newParams[4] = parsed.displayName;
            return _Game_Interpreter_command101.call(this, newParams);
        } else if (parsed) {
            showOrSwitchExpression(parsed.chara, parsed.expression, defaultFadeDuration);
            highlightSpeaker(parsed.chara, defaultFadeDuration);

            const newParams = params.slice();
            newParams[4] = parsed.displayName;
            return _Game_Interpreter_command101.call(this, newParams);
        } else if (!rawName) {
            // 名前欄が空欄 = ナレーション行。表示中のクレイ・セラを両方通常トーンにする
            for (const chara of characterList) {
                if (chara.shown) {
                    applyTone(chara, normalTone, defaultFadeDuration);
                }
            }
        }
        return _Game_Interpreter_command101.call(this, params);
    };

    // ------------------------------------------------------------------
    // 演出系コマンド実行時の自動消去 / イベント終了時の自動消去
    // ------------------------------------------------------------------
    if (autoEraseOnEffect) {
        const _Game_Interpreter_executeCommand = Game_Interpreter.prototype.executeCommand;
        Game_Interpreter.prototype.executeCommand = function () {
            const command = this.currentCommand();
            if (command && EFFECT_COMMAND_CODES.has(command.code)) {
                eraseAllShown(defaultFadeDuration);
            }
            return _Game_Interpreter_executeCommand.call(this);
        };

        const _Game_Interpreter_terminate = Game_Interpreter.prototype.terminate;
        Game_Interpreter.prototype.terminate = function () {
            // depth 0 = コモンイベント呼び出し等を含まない、一番外側の
            // イベントページ自体が完全に終了したタイミングのみ対象。
            // (コモンイベント呼び出しの子インタプリタ終了では消さない)
            if (this._depth === 0) {
                eraseAllShown(defaultFadeDuration);
            }
            _Game_Interpreter_terminate.call(this);
        };
    }

    // ------------------------------------------------------------------
    // プラグインコマンド
    // ------------------------------------------------------------------
    function targetCharacters(characterParam) {
        if (characterParam === "clay") return [characters.clay];
        if (characterParam === "sera") return [characters.sera];
        return characterList;
    }

    PluginManager.registerCommand(pluginName, "show", args => {
        const duration = Number(args.duration || 0) || defaultFadeDuration;
        const expressionArg = Number(args.expression || 0);
        const expression = expressionArg > 0 ? expressionArg : null;
        for (const chara of targetCharacters(args.character)) {
            showOrSwitchExpression(chara, expression, duration);
            applyTone(chara, normalTone, duration);
        }
    });

    PluginManager.registerCommand(pluginName, "erase", args => {
        const duration = Number(args.duration || 0) || defaultFadeDuration;
        for (const chara of targetCharacters(args.character)) {
            eraseCharacter(chara, duration);
        }
    });
})();
