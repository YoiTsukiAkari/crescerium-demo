//=============================================================================
// RPGツクールMZ - LL_StandingPicture.js v2.7.0
//-----------------------------------------------------------------------------
// ルルの教会 (Lulu's Church)
// https://nine-yusha.com/
//
// Please refer to the URL below for license details.
// https://nine-yusha.com/plugin/
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Display standing pictures with message window.
 * @author Lulu's Church
 * @url https://nine-yusha.com/plugin-spicture/
 *
 * @help LL_StandingPicture.js
 *
 * You can display standing pictures by entering special control codes
 * in messages.
 *
 * ・Standing picture ID can use alphanumeric and underscore(_).
 * ・ID can be specified with variables. Ex: \F1[\V[1]]
 * ・Up to 8 standing pictures can be displayed at once.
 * ・Frames 5–8 share the XY positions with frames 1–4.
 *
 * Control codes:
 *   \F1[id], \F2[id], \F3[id], \F4[id]
 *   \F5[id], \F6[id], \F7[id], \F8[id]
 *     Display standing picture. Ex: \F1[reid]
 *   (\F, \FF, \FFF, \FFFF also valid)
 *
 *   \M1[motion] … \M8[motion]
 *     Play standing picture motion. Ex: \M1[yes]
 *   (\M, \MM, \MMM, \MMMM also valid)
 *
 *   \AA[1] … \AA[8]
 *     Focus specified standing picture (e.g. in dialogue)
 *   (\AA[F], \AA[FF], \AA[FFF], \AA[FFFF] also valid)
 *
 *   \AA[N]  Darken all pictures.
 *   \AA[R]  Reset picture focus.
 *
 *   \FH[ON], \FH[OFF]
 *     Toggle Hold Mode. When ON, pictures remain after window closes.
 *     To remove, use \FH[OFF].
 *
 * Motion list:
 *   yes, yesyes, no, noslow, jump, jumpjump, jumploop,
 *   shake, shakeloop, runleft, runright,
 *   noslowloop, huwahuwa
 *
 * Plugin commands:
 *   Process Control Code: Control standing pictures anytime.
 *   Standing Picture ON/OFF: Toggle display (default: ON).
 *   Change Tone: Adjust tone of standing pictures.
 *
 * Blink animation:
 *   If blink images are set, animation will auto-play.
 *   (Set no image to disable blinking)
 *   Order: Img1→Img2→None (for 1 frame, set only Img1)
 *
 * Terms of use:
 *   ・No copyright notice required.
 *   ・No report needed for use.
 *   ・Free for commercial and non-commercial.
 *   ・No restriction for adult works.
 *   ・You may modify freely for your game.
 *   ・Redistribution as plugin material (incl. modified) prohibited.
 *
 * Author:Lulu's Church
 * Date: 2025/1/15
 *
 * @command processChar
 * @text Run Control Code
 * @desc Control standing pictures outside message window.
 *
 * @arg text
 * @text Control Code
 * @desc Ex: Show → \F1[s] \FH[ON], Erase → \FH[OFF].
 * Enter as you would in message window.
 * @type multiline_string
 *
 * @command setEnabled
 * @text Standing Picture ON/OFF
 * @desc Toggle all standing picture display ON/OFF.
 *
 * @arg enabled
 * @text Standing Picture
 * @desc If OFF, no standing pictures will be shown.
 * @default true
 * @type boolean
 *
 * @command setTone
 * @text Change Tone
 * @desc Adjust tone of standing pictures.
 *
 * @arg toneR
 * @text Red
 * @desc Tone R value. (-255～255)
 * @default 0
 * @type number
 * @min -255
 * @max 255
 *
 * @arg toneG
 * @text Green
 * @desc Tone G value. (-255～255)
 * @default 0
 * @type number
 * @min -255
 * @max 255
 *
 * @arg toneB
 * @text Blue
 * @desc Tone B value. (-255～255)
 * @default 0
 * @type number
 * @min -255
 * @max 255
 *
 * @arg toneC
 * @text Gray
 * @desc Grayscale strength. (0～255)
 * @default 0
 * @type number
 * @min 0
 * @max 255
 *
 * @param sPictures
 * @text Standing Picture List
 * @desc Define standing pictures shown in message window.
 * @default []
 * @type struct<sPictures>[]
 *
 * @param pictureSettings1
 * @text Frame1 (\F1 or \F)
 * @desc *This item is not used
 *
 * @param transition
 * @text Transition
 * @desc Effect used when picture appears/disappears.
 * @type select
 * @default 1
 * @option None
 * @value 0
 * @option Fade
 * @value 1
 * @option Float In Left
 * @value 2
 * @option Float In Right
 * @value 3
 * @option Float In Down
 * @value 4
 * @option Float In Up
 * @value 5
 * @parent pictureSettings1
 *
 * @param priority
 * @text Priority
 * @desc Display priority of standing pictures.
 * @type select
 * @default inFrontOfPicture
 * @option Behind Pictures
 * @value behindPicture
 * @option Between Pictures
 * @value betweenPictures
 * @option In Front of Pictures
 * @value inFrontOfPicture
 * @option Behind Window (shown when fadeout)
 * @value behindWindow
 * @option In Front of Window (shown when fadeout)
 * @value inFrontOfWindow
 * @parent pictureSettings1
 *
 * @param pictureSettings2
 * @text Frame2 (\F2 or \FF)
 * @desc *This item is not used
 *
 * @param transition2
 * @text Transition
 * @desc Effect used when picture appears/disappears.
 * @type select
 * @default 1
 * @option None
 * @value 0
 * @option Fade
 * @value 1
 * @option Float In Left
 * @value 2
 * @option Float In Right
 * @value 3
 * @option Float In Down
 * @value 4
 * @option Float In Up
 * @value 5
 * @parent pictureSettings2
 *
 * @param priority2
 * @text Priority
 * @desc Display priority of standing pictures.
 * @type select
 * @default inFrontOfPicture
 * @option Behind Pictures
 * @value behindPicture
 * @option Between Pictures
 * @value betweenPictures
 * @option In Front of Pictures
 * @value inFrontOfPicture
 * @option Behind Window (shown when fadeout)
 * @value behindWindow
 * @option In Front of Window (shown when fadeout)
 * @value inFrontOfWindow
 * @parent pictureSettings2
 *
 * @param pictureSettings3
 * @text Frame3 (\F3 or \FFF)
 * @desc *This item is not used
 *
 * @param transition3
 * @text Transition
 * @desc Effect used when picture appears/disappears.
 * @type select
 * @default 1
 * @option None
 * @value 0
 * @option Fade
 * @value 1
 * @option Float In Left
 * @value 2
 * @option Float In Right
 * @value 3
 * @option Float In Down
 * @value 4
 * @option Float In Up
 * @value 5
 * @parent pictureSettings3
 *
 * @param priority3
 * @text Priority
 * @desc Display priority of standing pictures.
 * @type select
 * @default inFrontOfPicture
 * @option Behind Pictures
 * @value behindPicture
 * @option Between Pictures
 * @value betweenPictures
 * @option In Front of Pictures
 * @value inFrontOfPicture
 * @option Behind Window (shown when fadeout)
 * @value behindWindow
 * @option In Front of Window (shown when fadeout)
 * @value inFrontOfWindow
 * @parent pictureSettings3
 *
 * @param pictureSettings4
 * @text Frame4 (\F4 or \FFFF)
 * @desc *This item is not used
 *
 * @param transition4
 * @text Transition
 * @desc Effect used when picture appears/disappears.
 * @type select
 * @default 1
 * @option None
 * @value 0
 * @option Fade
 * @value 1
 * @option Float In Left
 * @value 2
 * @option Float In Right
 * @value 3
 * @option Float In Down
 * @value 4
 * @option Float In Up
 * @value 5
 * @parent pictureSettings4
 *
 * @param priority4
 * @text Priority
 * @desc Display priority of standing pictures.
 * @type select
 * @default inFrontOfPicture
 * @option Behind Pictures
 * @value behindPicture
 * @option Between Pictures
 * @value betweenPictures
 * @option In Front of Pictures
 * @value inFrontOfPicture
 * @option Behind Window (shown when fadeout)
 * @value behindWindow
 * @option In Front of Window (shown when fadeout)
 * @value inFrontOfWindow
 * @parent pictureSettings4
 *
 * @param pictureSettings5
 * @text Frame5 (\F5)
 * @desc Setting for frame5 called with \F5. Uses frame1 coords.
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param pictureSettings6
 * @text Frame6 (\F6)
 * @desc Setting for frame6 called with \F6. Uses frame2 coords.
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param pictureSettings7
 * @text Frame7 (\F7)
 * @desc Setting for frame7 called with \F7. Uses frame3 coords.
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param pictureSettings8
 * @text Frame8 (\F8)
 * @desc Setting for frame8 called with \F8. Uses frame4 coords.
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param blinkSettings
 * @text Blink Animation
 * @desc *This item is not used
 *
 * @param blinkInterval
 * @text Blink Interval
 * @desc Avg frames between blinks (1/60 sec). Default:180 (≈3s per blink).
 * @default 180
 * @min 1
 * @max 2000
 * @type number
 * @parent blinkSettings
 *
 * @param blinkWaitCount
 * @text Blink Duration
 * @desc Frames for blink display (1/60 sec). Larger = longer closed.
 * @default 4
 * @min 1
 * @max 2000
 * @type number
 * @parent blinkSettings
 *
 * @param focusToneAdjust
 * @text Focus Darkness
 * @desc Darkness (-255～0) when focusing with AA[s]. Default: -96.
 * @default -96
 * @min -255
 * @max 0
 * @type number
 *
 * @param betweenPicturesPriority
 * @text Priority Num for Insert
 * @desc Valid if priority="betweenPictures". Pictures with higher numbers
 * will show above standing pictures.
 * @default 50
 * @min 0
 * @max 100
 * @type number
 *
 * @param bootCachePictures
 * @text Preload Images
 * @desc Prevents loading wait in browser play. Turn OFF if many/large images.
 * @default true
 * @type boolean
 */

/*~struct~sPictures:
 *
 * @param id
 * @text Picture ID
 * @desc Standing picture ID used in control codes. Use alphanumeric+_.
 * @type string
 *
 * @param imageName
 * @text Image File
 * @desc Select the image file for the standing picture.
 * @dir img/pictures
 * @type file
 * @require 1
 *
 * @param imageNameBlink
 * @text Blink Image 1
 * @desc Select blink diff image file. Match base picture size.
 * @dir img/pictures
 * @type file
 * @require 1
 *
 * @param imageNameBlink2
 * @text Blink Image 2
 * @desc Select second blink diff image file. Match base picture size.
 * @dir img/pictures
 * @type file
 * @require 1
 *
 * @param origin
 * @text Origin
 * @desc Origin of standing picture.
 * @default 0
 * @type select
 * @option Upper Left
 * @value 0
 * @option Center
 * @value 1
 *
 * @param x
 * @text X Pos (Frame1)
 * @desc X position when called with Frame1 (\F1).
 * @default 464
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y
 * @text Y Pos (Frame1)
 * @desc Y position when called with Frame1 (\F1).
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param x2
 * @text X Pos (Frame2)
 * @desc X position when called with Frame2 (\F2).
 * @default 20
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y2
 * @text Y Pos (Frame2)
 * @desc Y position when called with Frame2 (\F2).
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param x3
 * @text X Pos (Frame3)
 * @desc X position when called with Frame3 (\F3).
 * @default 364
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y3
 * @text Y Pos (Frame3)
 * @desc Y position when called with Frame3 (\F3).
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param x4
 * @text X Pos (Frame4)
 * @desc X position when called with Frame4 (\F4).
 * @default 120
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y4
 * @text Y Pos (Frame4)
 * @desc Y position when called with Frame4 (\F4).
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param reverse
 * @text Flip Frame2,4
 * @desc Flip horizontally when called with Frame2 (\F2) or Frame4 (\F4).
 * @default 1
 * @type select
 * @option Do Not Flip
 * @value 1
 * @option Flip
 * @value -1
 *
 * @param scaleX
 * @text Scale X
 * @desc X scale of standing picture.
 * @default 100
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param scaleY
 * @text Scale Y
 * @desc Y scale of standing picture.
 * @default 100
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param opacity
 * @text Opacity
 * @desc Opacity (0～255). If blink images set, use 255.
 * @default 255
 * @type number
 * @min 0
 * @max 255
 *
 * @param blendMode
 * @text Blend Mode
 * @desc Blend mode for standing picture.
 * @default 0
 * @type select
 * @option Normal
 * @value 0
 * @option Add
 * @value 1
 * @option Multiply
 * @value 2
 * @option Screen
 * @value 3
 */

/*~struct~pictureSettings:
 *
 * @param transition
 * @text Transition
 * @desc Effect used when picture appears/disappears.
 * @type select
 * @default 1
 * @option None
 * @value 0
 * @option Fade
 * @value 1
 * @option Float In Left
 * @value 2
 * @option Float In Right
 * @value 3
 * @option Float In Down
 * @value 4
 * @option Float In Up
 * @value 5
 *
 * @param priority
 * @text Priority
 * @desc Display priority of standing picture.
 * @type select
 * @default inFrontOfPicture
 * @option Behind Pictures
 * @value behindPicture
 * @option Between Pictures
 * @value betweenPictures
 * @option In Front of Pictures
 * @value inFrontOfPicture
 * @option Behind Window (shown when fadeout)
 * @value behindWindow
 * @option In Front of Window (shown when fadeout)
 * @value inFrontOfWindow
 */

/*:ja
 * @target MZ
 * @plugindesc メッセージウィンドウ表示時に立ち絵を表示します。
 * @author ルルの教会
 * @url https://nine-yusha.com/plugin-spicture/
 *
 * @help LL_StandingPicture.js
 *
 * メッセージ内に専用の制御文字を入力することで、
 * 立ち絵を表示できます。
 *
 * ・立ち絵IDには半角英数字とアンダースコア(_)が使用できます。
 * ・立ち絵IDは変数で指定することも可能です。 【例】\F1[\V[1]]
 * ・立ち絵は最大で一度に8人まで表示することが可能です。
 * ・立ち絵枠5～8のXY座標は、それぞれ立ち絵枠1～4に対応した座標で表示されます。
 *
 * 専用制御文字:
 *   \F1[立ち絵ID], \F2[立ち絵ID], \F3[立ち絵ID], \F4[立ち絵ID]
 *   \F5[立ち絵ID], \F6[立ち絵ID], \F7[立ち絵ID], \F8[立ち絵ID]
 *     立ち絵を表示します。 【例】\F1[reid]
 *   (\F, \FF, \FFF, \FFFFでも可能)
 *
 *   \M1[モーション], \M2[モーション], \M3[モーション], \M4[モーション]
 *   \M5[モーション], \M6[モーション], \M7[モーション], \M8[モーション]
 *     立ち絵モーションを再生します。 【例】\M1[yes]
 *   (\M, \MM, \MMM, \MMMMでも可能)
 *
 *   \AA[1], \AA[2], \AA[3], \AA[4], \AA[5], \AA[6], \AA[7], \AA[8]
 *     指定した立ち絵にフォーカスを当てます (会話時など)
 *   (\AA[F], \AA[FF], \AA[FFF], \AA[FFFF]でも可能)
 *
 *   \AA[N]  立ち絵を全て暗くします。
 *   \AA[R]  立ち絵のフォーカスをリセットします。
 *
 *   \FH[ON], \FH[OFF]
 *     ホールドモードのON、OFFを切り替えます。
 *     ホールドモードをONにするとウィンドウ消去後も立ち絵が残り続けます。
 *     立ち絵を消去したいときは\FH[OFF]の制御文字を実行してください。
 *
 * 立ち絵モーション一覧:
 *   yes(頷く), yesyes(二回頷く), no(横に揺れる), noslow(ゆっくり横に揺れる)
 *   jump(跳ねる), jumpjump(二回跳ねる), jumploop(跳ね続ける)
 *   shake(ガクガク), shakeloop(ガクガクし続ける)
 *   runleft(画面左へ走り去る), runright(画面右へ走り去る)
 *   noslowloop(横に揺れ続ける), huwahuwa(ふわふわ)
 *
 * プラグインコマンド:
 *   制御文字の実行: 任意のタイミングで立ち絵を操作します。
 *   立ち絵表示ON・OFF: 立ち絵の表示・非表示を一括制御します。 (初期値: ON)
 *   色調変更: 立ち絵の色調を変更します。
 *
 * 瞬きアニメーション:
 *   瞬き画像ファイルを設定すると、瞬きアニメーションが自動再生されます。
 *   (瞬きアニメーションを使用しない場合は、画像を設定なしにしてください)
 *   再生順序: 画像1→画像2→なし (差分1枚で設定したい場合は「画像1」のみ設定)
 *
 * 利用規約:
 *   ・著作権表記は必要ございません。
 *   ・利用するにあたり報告の必要は特にございません。
 *   ・商用・非商用問いません。
 *   ・成人向け作品にも使用制限はありません。
 *   ・ゲームに合わせて自由に改変していただいて問題ございません。
 *   ・プラグイン素材としての再配布（改変後含む）は禁止させていただきます。
 *
 * 作者: ルルの教会
 * 作成日: 2025/1/15
 *
 * @command processChar
 * @text 制御文字の実行
 * @desc ウィンドウ表示時以外のタイミングで立ち絵を操作します。
 *
 * @arg text
 * @text 制御文字
 * @desc [例]立ち絵の表示→\F1[s] \FH[ON]、立ち絵の消去→\FH[OFF]
 * 文章表示時と同じように制御文字を入力してください。
 * @type multiline_string
 *
 * @command setEnabled
 * @text 立ち絵表示ON・OFF
 * @desc 立ち絵の表示・非表示を一括制御します。
 *
 * @arg enabled
 * @text 立ち絵表示
 * @desc OFFにすると立ち絵が一切表示されなくなります。
 * @default true
 * @type boolean
 *
 * @command setTone
 * @text 色調変更
 * @desc 立ち絵の色調を変更します。
 *
 * @arg toneR
 * @text 赤
 * @desc 色調のR成分です。 (-255～255)
 * @default 0
 * @type number
 * @min -255
 * @max 255
 *
 * @arg toneG
 * @text 緑
 * @desc 色調のG成分です。 (-255～255)
 * @default 0
 * @type number
 * @min -255
 * @max 255
 *
 * @arg toneB
 * @text 青
 * @desc 色調のB成分です。 (-255～255)
 * @default 0
 * @type number
 * @min -255
 * @max 255
 *
 * @arg toneC
 * @text グレー
 * @desc グレースケールの強さです。 (0～255)
 * @default 0
 * @type number
 * @min 0
 * @max 255
 *
 * @param sPictures
 * @text 立ち絵リスト
 * @desc メッセージウィンドウに表示する立ち絵を定義します。
 * @default []
 * @type struct<sPictures>[]
 *
 * @param pictureSettings1
 * @text 立ち絵枠1(\F1 or \F)
 * @desc ※この項目は使用しません
 *
 * @param transition
 * @text 切替効果
 * @desc 立ち絵の出現・消去時の切替効果です。
 * @type select
 * @default 1
 * @option なし
 * @value 0
 * @option フェード
 * @value 1
 * @option フロートイン左
 * @value 2
 * @option フロートイン右
 * @value 3
 * @option フロートイン下
 * @value 4
 * @option フロートイン上
 * @value 5
 * @parent pictureSettings1
 *
 * @param priority
 * @text 重なり順
 * @desc 立ち絵表示の重なり順を指定します。
 * @type select
 * @default inFrontOfPicture
 * @option 通常ピクチャの後ろ
 * @value behindPicture
 * @option 通常ピクチャに割り込み
 * @value betweenPictures
 * @option 通常ピクチャの手前
 * @value inFrontOfPicture
 * @option ウィンドウの後ろ (フェードアウト時も表示)
 * @value behindWindow
 * @option ウィンドウの手前 (フェードアウト時も表示)
 * @value inFrontOfWindow
 * @parent pictureSettings1
 *
 * @param pictureSettings2
 * @text 立ち絵枠2(\F2 or \FF)
 * @desc ※この項目は使用しません
 *
 * @param transition2
 * @text 切替効果
 * @desc 立ち絵の出現・消去時の切替効果です。
 * @type select
 * @default 1
 * @option なし
 * @value 0
 * @option フェード
 * @value 1
 * @option フロートイン左
 * @value 2
 * @option フロートイン右
 * @value 3
 * @option フロートイン下
 * @value 4
 * @option フロートイン上
 * @value 5
 * @parent pictureSettings2
 *
 * @param priority2
 * @text 重なり順
 * @desc 立ち絵表示の重なり順を指定します。
 * @type select
 * @default inFrontOfPicture
 * @option 通常ピクチャの後ろ
 * @value behindPicture
 * @option 通常ピクチャに割り込み
 * @value betweenPictures
 * @option 通常ピクチャの手前
 * @value inFrontOfPicture
 * @option ウィンドウの後ろ (フェードアウト時も表示)
 * @value behindWindow
 * @option ウィンドウの手前 (フェードアウト時も表示)
 * @value inFrontOfWindow
 * @parent pictureSettings2
 *
 * @param pictureSettings3
 * @text 立ち絵枠3(\F3 or \FFF)
 * @desc ※この項目は使用しません
 *
 * @param transition3
 * @text 切替効果
 * @desc 立ち絵の出現・消去時の切替効果です。
 * @type select
 * @default 1
 * @option なし
 * @value 0
 * @option フェード
 * @value 1
 * @option フロートイン左
 * @value 2
 * @option フロートイン右
 * @value 3
 * @option フロートイン下
 * @value 4
 * @option フロートイン上
 * @value 5
 * @parent pictureSettings3
 *
 * @param priority3
 * @text 重なり順
 * @desc 立ち絵表示の重なり順を指定します。
 * @type select
 * @default inFrontOfPicture
 * @option 通常ピクチャの後ろ
 * @value behindPicture
 * @option 通常ピクチャに割り込み
 * @value betweenPictures
 * @option 通常ピクチャの手前
 * @value inFrontOfPicture
 * @option ウィンドウの後ろ (フェードアウト時も表示)
 * @value behindWindow
 * @option ウィンドウの手前 (フェードアウト時も表示)
 * @value inFrontOfWindow
 * @parent pictureSettings3
 *
 * @param pictureSettings4
 * @text 立ち絵枠4(\F4 or \FFFF)
 * @desc ※この項目は使用しません
 *
 * @param transition4
 * @text 切替効果
 * @desc 立ち絵の出現・消去時の切替効果です。
 * @type select
 * @default 1
 * @option なし
 * @value 0
 * @option フェード
 * @value 1
 * @option フロートイン左
 * @value 2
 * @option フロートイン右
 * @value 3
 * @option フロートイン下
 * @value 4
 * @option フロートイン上
 * @value 5
 * @parent pictureSettings4
 *
 * @param priority4
 * @text 重なり順
 * @desc 立ち絵表示の重なり順を指定します。
 * @type select
 * @default inFrontOfPicture
 * @option 通常ピクチャの後ろ
 * @value behindPicture
 * @option 通常ピクチャに割り込み
 * @value betweenPictures
 * @option 通常ピクチャの手前
 * @value inFrontOfPicture
 * @option ウィンドウの後ろ (フェードアウト時も表示)
 * @value behindWindow
 * @option ウィンドウの手前 (フェードアウト時も表示)
 * @value inFrontOfWindow
 * @parent pictureSettings4
 *
 * @param pictureSettings5
 * @text 立ち絵枠5(\F5)
 * @desc \F5で呼び出す立ち絵枠の設定です。
 * \F5で呼び出した場合、立ち絵枠1の座標で表示されます。
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param pictureSettings6
 * @text 立ち絵枠6(\F6)
 * @desc \F6で呼び出す立ち絵枠の設定です。
 * \F6で呼び出した場合、立ち絵枠2の座標で表示されます。
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param pictureSettings7
 * @text 立ち絵枠7(\F7)
 * @desc \F7で呼び出す立ち絵枠の設定です。
 * \F7で呼び出した場合、立ち絵枠3の座標で表示されます。
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param pictureSettings8
 * @text 立ち絵枠8(\F8)
 * @desc \F8で呼び出す立ち絵枠の設定です。
 * \F8で呼び出した場合、立ち絵枠4の座標で表示されます。
 * @default {"transition":"1","priority":"inFrontOfPicture"}
 * @type struct<pictureSettings>
 *
 * @param blinkSettings
 * @text 瞬きアニメーション
 * @desc ※この項目は使用しません
 *
 * @param blinkInterval
 * @text 瞬き間隔
 * @desc 瞬きする間隔の平均フレーム数です。 (1/60秒、初期値: 180)
 * 例えば180に設定すると、平均3秒間に1回瞬きをおこないます。
 * @default 180
 * @min 1
 * @max 2000
 * @type number
 * @parent blinkSettings
 *
 * @param blinkWaitCount
 * @text 瞬き表示時間
 * @desc 瞬き時の表示時間です。 (1/60秒、初期値: 4)
 * 数値を大きくすると目を閉じる時間が長くなります。
 * @default 4
 * @min 1
 * @max 2000
 * @type number
 * @parent blinkSettings
 *
 * @param focusToneAdjust
 * @text フォーカス時の暗さ
 * @desc AA[s]でフォーカスを当てた時の暗さ(-255～0)です。
 * 暗くなりすぎる場合に調整してください。(初期値: -96)
 * @default -96
 * @min -255
 * @max 0
 * @type number
 *
 * @param betweenPicturesPriority
 * @text 割り込み時のピクチャ番号
 * @desc 重なり順「通常ピクチャに割り込み」を設定時に有効です。
 * これより大きいピクチャ番号は立ち絵の上に表示されます。
 * @default 50
 * @min 0
 * @max 100
 * @type number
 *
 * @param bootCachePictures
 * @text 画像の事前読み込み
 * @desc ブラウザプレイ時の画像読み込み待ちを解消します。
 * 画像枚数や容量が大きい場合はオフを推奨します。
 * @default true
 * @type boolean
 */

/*~struct~sPictures:ja
 *
 * @param id
 * @text 立ち絵ID
 * @desc 立ち絵IDです。立ち絵を制御文字で呼び出す際に使用します。
 * 半角英数字(_)で入力してください。
 * @type string
 *
 * @param imageName
 * @text 画像ファイル名
 * @desc 立ち絵として表示する画像ファイルを選択してください。
 * @dir img/pictures
 * @type file
 * @require 1
 *
 * @param imageNameBlink
 * @text 瞬き画像ファイル名1
 * @desc 瞬き時の差分画像ファイルを選択してください。
 * 画像サイズは基本となる立ち絵画像と統一してください。
 * @dir img/pictures
 * @type file
 * @require 1
 *
 * @param imageNameBlink2
 * @text 瞬き画像ファイル名2
 * @desc 瞬き時の差分画像ファイル2を選択してください。
 * 画像サイズは基本となる立ち絵画像と統一してください。
 * @dir img/pictures
 * @type file
 * @require 1
 *
 * @param origin
 * @text 原点
 * @desc 立ち絵の原点です。
 * @default 0
 * @type select
 * @option 左上
 * @value 0
 * @option 中央
 * @value 1
 *
 * @param x
 * @text X座標 (立ち絵枠1)
 * @desc 立ち絵枠1(F1)で呼び出された時の表示位置(X)です。
 * @default 464
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y
 * @text Y座標 (立ち絵枠1)
 * @desc 立ち絵枠1(F)で呼び出された時の表示位置(Y)です。
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param x2
 * @text X座標 (立ち絵枠2)
 * @desc 立ち絵枠2(F2)で呼び出された時の表示位置(X)です。
 * @default 20
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y2
 * @text Y座標 (立ち絵枠2)
 * @desc 立ち絵枠2(F2)で呼び出された時の表示位置(Y)です。
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param x3
 * @text X座標 (立ち絵枠3)
 * @desc 立ち絵枠3(F3)で呼び出された時の表示位置(X)です。
 * @default 364
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y3
 * @text Y座標 (立ち絵枠3)
 * @desc 立ち絵枠3(F3)で呼び出された時の表示位置(Y)です。
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param x4
 * @text X座標 (立ち絵枠4)
 * @desc 立ち絵枠4(F4)で呼び出された時の表示位置(X)です。
 * @default 120
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param y4
 * @text Y座標 (立ち絵枠4)
 * @desc 立ち絵枠4(F4)で呼び出された時の表示位置(Y)です。
 * @default 96
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param reverse
 * @text 立ち絵枠2, 4の左右反転
 * @desc 立ち絵枠2(F2)、立ち絵枠4(F4)で呼び出された時に
 * 立ち絵を左右反転させるかの設定です。
 * @default 1
 * @type select
 * @option 左右反転しない
 * @value 1
 * @option 左右反転する
 * @value -1
 *
 * @param scaleX
 * @text X拡大率
 * @desc 立ち絵の拡大率(X)です。
 * @default 100
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param scaleY
 * @text Y拡大率
 * @desc 立ち絵の拡大率(Y)です。
 * @default 100
 * @min -2000
 * @max 2000
 * @type number
 *
 * @param opacity
 * @text 不透明度
 * @desc 立ち絵の不透明度(0～255)です。
 * 瞬き画像を設定する時は255に設定してください。
 * @default 255
 * @type number
 * @min 0
 * @max 255
 *
 * @param blendMode
 * @text 合成方法
 * @desc 立ち絵の合成方法です。
 * @default 0
 * @type select
 * @option 通常
 * @value 0
 * @option 加算
 * @value 1
 * @option 除算
 * @value 2
 * @option スクリーン
 * @value 3
 */

/*~struct~pictureSettings:ja
 *
 * @param transition
 * @text 切替効果
 * @desc 立ち絵の出現・消去時の切替効果です。
 * @type select
 * @default 1
 * @option なし
 * @value 0
 * @option フェード
 * @value 1
 * @option フロートイン左
 * @value 2
 * @option フロートイン右
 * @value 3
 * @option フロートイン下
 * @value 4
 * @option フロートイン上
 * @value 5
 *
 * @param priority
 * @text 重なり順
 * @desc 立ち絵画像の重なり順を指定します。
 * @type select
 * @default inFrontOfPicture
 * @option 通常ピクチャの後ろ
 * @value behindPicture
 * @option 通常ピクチャに割り込み
 * @value betweenPictures
 * @option 通常ピクチャの手前
 * @value inFrontOfPicture
 * @option ウィンドウの後ろ (フェードアウト時も表示)
 * @value behindWindow
 * @option ウィンドウの手前 (フェードアウト時も表示)
 * @value inFrontOfWindow
 */

(() => {
	"use strict";
	const pluginName = "LL_StandingPicture";

	const parameters = PluginManager.parameters(pluginName);
	const paramJsonParse = function(key, value) {
		try {
			return JSON.parse(value);
		} catch (e) {
			return value;
		}
	};

	// 拡張立ち絵スロット設定
	const pictureSettings5 = JSON.parse(JSON.stringify(String(parameters["pictureSettings5"] || ""), paramJsonParse));
	const pictureSettings6 = JSON.parse(JSON.stringify(String(parameters["pictureSettings6"] || ""), paramJsonParse));
	const pictureSettings7 = JSON.parse(JSON.stringify(String(parameters["pictureSettings7"] || ""), paramJsonParse));
	const pictureSettings8 = JSON.parse(JSON.stringify(String(parameters["pictureSettings8"] || ""), paramJsonParse));

	// 切替効果
	const transitions = [
		Number(parameters["transition"] || 1),
		Number(parameters["transition2"] || 1),
		Number(parameters["transition3"] || 1),
		Number(parameters["transition4"] || 1),
		pictureSettings5.transition,
		pictureSettings6.transition,
		pictureSettings7.transition,
		pictureSettings8.transition
	];
	// 優先順位
	const priorities = [
		String(parameters["priority"] || ""),
		String(parameters["priority2"] || ""),
		String(parameters["priority3"] || ""),
		String(parameters["priority4"] || ""),
		pictureSettings5.priority,
		pictureSettings6.priority,
		pictureSettings7.priority,
		pictureSettings8.priority
	];
	// フォーカス時の暗さ
	const focusToneAdjust = Number(parameters["focusToneAdjust"] || -96);
	// 画像の事前読み込み
	const bootCachePictures = (parameters["bootCachePictures"] === "true" || false);
	// 瞬きアニメーションの設定
	const blinkInterval = Number(parameters["blinkInterval"] || 180);
	const blinkWaitCount = Number(parameters["blinkWaitCount"] || 4);
	// 立ち絵リスト
	const sPictures = String(parameters["sPictures"] || "[]");
	const sPictureLists = JSON.parse(JSON.stringify(sPictures, paramJsonParse));
	// 立ち絵最大スロット数
	const maxStandingPictureSlots = 8;
	// ピクチャ割り込み番号
	const betweenPicturesPriority = Number(parameters["betweenPicturesPriority"] || 50);

	// 制御文字の実行
	PluginManager.registerCommand(pluginName, "processChar", args => {
		const text = args.text;
		exStandingPictureParseChar(text);

		// 立ち絵表示状態を継続
		($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture) {
			if (picture.show) {
				picture.refresh = true;
				picture.animationCount = animationFrame[picture.motion];
			}
		});
		if (!$gameSystem._LL_StandingPicture_holdSPicture) {
			($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture) {
				picture.show = false;
				picture.motion = "";
			});
		}
	});

	// 立ち絵表示ON・OFF
	PluginManager.registerCommand(pluginName, "setEnabled", args => {
		const enabled = (args.enabled === "true" || false);
		$gameSystem._StandingPictureDisabled = !enabled;
	});

	// 色調変更
	PluginManager.registerCommand(pluginName, "setTone", args => {
		const pictureTone = [Number(args.toneR), Number(args.toneG), Number(args.toneB), Number(args.toneC)];
		$gameSystem._StandingPictureTone = pictureTone;
	});

	// アニメーションフレーム数定義
	const animationFrame = {
		"yes":        24,
		"yesyes":     48,
		"no":         24,
		"noslow":     48,
		"jump":       24,
		"jumpjump":   48,
		"jumploop":   48,
		"shake":      1,
		"shakeloop":  1,
		"runleft":    1,
		"runright":   1,
		"noslowloop": 96,
		"breathing":  96,
		"breathing2": 96,
		"huwahuwa":   192,
		"none":       0
	};


	//-----------------------------------------------------------------------------
	// Game_System
	//
	// 立ち絵制御用の独自配列を追加定義します。

	const _Game_System_initialize = Game_System.prototype.initialize;
	Game_System.prototype.initialize = function() {
		_Game_System_initialize.apply(this, arguments);

		this.iniLLStandingPictures();
		this._LL_StandingPicture_battleCache = null;
	};

	Game_System.prototype.iniLLStandingPictures = function() {
		// 立ち絵設定
		this._LL_StandingPicture_pictures = [];
		for (let i = 0; i < maxStandingPictureSlots; i++) {
			this._LL_StandingPicture_pictures.push({
				animationCount: 0,
				sPicture: null,
				show: false,
				refresh: false,
				motion: "",
				focus: false
			});
		}
		// ホールド設定
		this._LL_StandingPicture_holdSPicture = false;
	};

	Game_System.prototype.inBattleMakeCacheLLStandingPictures = function() {
		if (!this._LL_StandingPicture_battleCache) {
			this._LL_StandingPicture_battleCache = {
				pictures: this._LL_StandingPicture_pictures,
				holdSPicture: this._LL_StandingPicture_holdSPicture
			};
		}
		this.iniLLStandingPictures();
	};

	Game_System.prototype.refreshCacheLLStandingPictures = function() {
		if (this._LL_StandingPicture_battleCache) {
			this._LL_StandingPicture_pictures = this._LL_StandingPicture_battleCache.pictures;
			this._LL_StandingPicture_holdSPicture = this._LL_StandingPicture_battleCache.holdSPicture;
		}
		this._LL_StandingPicture_battleCache = null;
	};

	//-----------------------------------------------------------------------------
	// ExStandingPictureParseChar
	//
	// 立ち絵制御文字を解読する関数です。

	const exStandingPictureParseChar = function(text) {
		text = text.replace(/\\V\[(\d+)\]/gi, (_, p1) =>
			$gameVariables.value(parseInt(p1))
		);

		let processEscapeNumber = null;

		// 立ち絵を更新
		($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture, index) {
			// 専用制御文字を取得 (\F[s])
			let sPictureNumber = null;
			if (index === 0) processEscapeNumber = text.match(/\\F\[(\w+)\]/) || text.match(/\\F1\[(\w+)\]/);
			if (index === 1) processEscapeNumber = text.match(/\\FF\[(\w+)\]/) || text.match(/\\F2\[(\w+)\]/);
			if (index === 2) processEscapeNumber = text.match(/\\FFF\[(\w+)\]/) || text.match(/\\F3\[(\w+)\]/);
			if (index === 3) processEscapeNumber = text.match(/\\FFFF\[(\w+)\]/) || text.match(/\\F4\[(\w+)\]/);
			if (index === 4) processEscapeNumber = text.match(/\\F5\[(\w+)\]/);
			if (index === 5) processEscapeNumber = text.match(/\\F6\[(\w+)\]/);
			if (index === 6) processEscapeNumber = text.match(/\\F7\[(\w+)\]/);
			if (index === 7) processEscapeNumber = text.match(/\\F8\[(\w+)\]/);
			if (processEscapeNumber && processEscapeNumber[1]) {
				sPictureNumber = processEscapeNumber[1];
			}

			// 専用制御文字を取得 (\M[s])
			let sPictureMotion = null;
			if (index === 0) processEscapeNumber = text.match(/\\M\[(\w+)\]/) || text.match(/\\M1\[(\w+)\]/);
			if (index === 1) processEscapeNumber = text.match(/\\MM\[(\w+)\]/) || text.match(/\\M2\[(\w+)\]/);
			if (index === 2) processEscapeNumber = text.match(/\\MMM\[(\w+)\]/) || text.match(/\\M3\[(\w+)\]/);
			if (index === 3) processEscapeNumber = text.match(/\\MMMM\[(\w+)\]/) || text.match(/\\M4\[(\w+)\]/);
			if (index === 4) processEscapeNumber = text.match(/\\M5\[(\w+)\]/);
			if (index === 5) processEscapeNumber = text.match(/\\M6\[(\w+)\]/);
			if (index === 6) processEscapeNumber = text.match(/\\M7\[(\w+)\]/);
			if (index === 7) processEscapeNumber = text.match(/\\M8\[(\w+)\]/);
			if (processEscapeNumber && processEscapeNumber[1]) {
				sPictureMotion = processEscapeNumber[1];
			}

			// 専用制御文字を取得 (\AA[s])
			let focusSPicture = false;
			if (index === 0) processEscapeNumber = text.match(/\\AA\[(F|1)\]/);
			if (index === 1) processEscapeNumber = text.match(/\\AA\[(FF|2)\]/);
			if (index === 2) processEscapeNumber = text.match(/\\AA\[(FFF|3)\]/);
			if (index === 3) processEscapeNumber = text.match(/\\AA\[(FFFF|4)\]/);
			if (index === 4) processEscapeNumber = text.match(/\\AA\[(5)\]/);
			if (index === 5) processEscapeNumber = text.match(/\\AA\[(6)\]/);
			if (index === 6) processEscapeNumber = text.match(/\\AA\[(7)\]/);
			if (index === 7) processEscapeNumber = text.match(/\\AA\[(8)\]/);
			if (processEscapeNumber && processEscapeNumber[1]) {
				focusSPicture = true;
			}
			// フォーカス設定
			picture.focus = focusSPicture;

			if (sPictureNumber) {
				const sPicture = sPictureLists.find(function(item) {
					if (String(item.id) === sPictureNumber) return true;
				});
				picture.sPicture = sPicture;
				picture.show = sPicture ? true : false;
				picture.refresh = sPicture ? true : false;
				// 再生モーション定義
				picture.motion = sPictureMotion ? sPictureMotion : "none";
				picture.animationCount = animationFrame[picture.motion];
			} else {
				if (!$gameSystem._LL_StandingPicture_holdSPicture) {
					picture.show = false;
					picture.motion = "";
				} else if (sPictureMotion) {
					// 再生モーション更新
					picture.motion = sPictureMotion;
					picture.animationCount = animationFrame[picture.motion];
				}
			}
		}.bind(this));

		// 専用制御文字を取得 (\AA[R])
		let focusSPictureReset = false;
		processEscapeNumber = text.match(/\\AA\[(R|0)\]/);
		if (processEscapeNumber && processEscapeNumber[1]) {
			// フォーカス状態リセット
			focusSPictureReset = true;
		}
		// 専用制御文字を取得 (\AA[N])
		let focusSPictureAllout = false;
		processEscapeNumber = text.match(/\\AA\[(N)\]/);
		if (processEscapeNumber && processEscapeNumber[1]) {
			focusSPictureAllout = true;
		}
		// フォーカス状態をリフレッシュ
		const allNotFocus = ($gameSystem._LL_StandingPicture_pictures || []).every(function(value) {
			return value.focus === false;
		});
		if (allNotFocus || focusSPictureReset) {
			($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture) {
				picture.focus = true;
			});
		}
		if (focusSPictureAllout) {
			($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture) {
				picture.focus = false;
			});
		}

		// 専用制御文字を取得 (\FH[s])
		let sPictureHold = null;
		processEscapeNumber = text.match(/\\FH\[(\w+)\]/);
		if (processEscapeNumber && processEscapeNumber[1]) {
			sPictureHold = processEscapeNumber[1];
		}
		// ホールドモードを切替
		if (sPictureHold === "ON") {
			$gameSystem._LL_StandingPicture_holdSPicture = true;
		} else if (sPictureHold === "OFF") {
			$gameSystem._LL_StandingPicture_holdSPicture = false;
		}
	};

	//-----------------------------------------------------------------------------
	// ExStandingPicture
	//
	// 立ち絵を表示する独自のクラスを追加定義します。

	class ExStandingPicture {

		static create (scene) {
			// 立ち絵スロット
			scene._spSprites = [];
			for (let i = 0; i < maxStandingPictureSlots; i++) {
				scene._spSprites.push(new Sprite_LL_SPicture());
				if (priorities[i] === "behindPicture") {
					scene._spriteset.addChildAt(scene._spSprites[i], scene._spriteset.children.indexOf(scene._spriteset._pictureContainer));
				} else if (priorities[i] === "betweenPictures") {
					scene._spriteset._pictureContainer.addChildAt(scene._spSprites[i], betweenPicturesPriority);
				} else if (priorities[i] === "inFrontOfWindow") {
					scene.addChildAt(scene._spSprites[i], scene.children.indexOf(scene._windowLayer) + 1);
				} else if (priorities[i] === "behindWindow") {
					// v2.6以前と同様の位置
					scene.addChildAt(scene._spSprites[i], scene.children.indexOf(scene._spriteset) + 1);
				} else {
					scene._spriteset.addChildAt(scene._spSprites[i], scene._spriteset.children.indexOf(scene._spriteset._pictureContainer) + 1);
				}
			}

			// 立ち絵画像を事前読み込み
			this.cachePictures();

			// 旧Ver.のセーブデータ読み込み対策
			if (typeof $gameSystem._LL_StandingPicture_pictures === "undefined") {
				$gameSystem.iniLLStandingPictures();
			}

			// 戦闘時判定
			if (SceneManager._scene.constructor === Scene_Battle) {
				// 表示中の立ち絵を消去
				$gameSystem.inBattleMakeCacheLLStandingPictures();
			} else {
				// 戦闘前に消去した立ち絵を戻す
				$gameSystem.refreshCacheLLStandingPictures();
			}

			// 立ち絵表示状態を継続
			($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture) {
				if (picture.show) {
					picture.refresh = true;
					picture.animationCount = animationFrame[picture.motion];
				}
			});
		}

		static update (scene) {
			// 立ち絵を非表示に設定している場合、処理を中断
			if ($gameSystem._StandingPictureDisabled) {
				(scene._spSprites || []).forEach(function(sprite) {
					sprite.opacity = 0;
				});
				return;
			}

			// 立ち絵ピクチャ作成
			($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture, index) {
				// 立ち絵画像読み込み
				if (picture.sPicture && picture.refresh) {
					this.refresh(scene._spSprites[index], picture.sPicture, index + 1);
					picture.refresh = false;
				}
				// フェード処理
				if (picture.show) {
					this.fadeIn(scene._spSprites[index], picture.sPicture, index + 1);
				} else {
					this.fadeOut(scene._spSprites[index], picture.sPicture, index + 1);
				}
				// フォーカス設定
				scene._spSprites[index].setBlendColor(picture.focus ? [0, 0, 0, 0] : [0, 0, 0, (focusToneAdjust * -1)]);
				// モーション再生
				if (!scene._spSprites[index].opening && !scene._spSprites[index].closing && picture.animationCount > 0) {
					picture.animationCount = this.animation(scene._spSprites[index], picture.motion, picture.animationCount);
				}
			}.bind(this));
		}

		static refresh (sSprite, sPicture, sNumber) {
			sSprite.setPicture(sPicture);
			sSprite.showing = false;
			let calcScaleX = Number(sPicture.scaleX);
			const calcScaleY = Number(sPicture.scaleY);
			// 左右反転させる場合 (立ち絵2, 4, 6, 8)
			if (sNumber=== 2 || sNumber=== 4 || sNumber=== 6 || sNumber=== 8) calcScaleX *= Number(sPicture.reverse);
			// X座標、Y座標
			let x = 0;
			let y = 0;
			if (sNumber === 1 || sNumber === 5) {
				x = Number(sPicture.x);
				y = Number(sPicture.y);
			}
			if (sNumber === 2 || sNumber === 6) {
				x = Number(sPicture.x2);
				y = Number(sPicture.y2);
			}
			if (sNumber === 3 || sNumber === 7) {
				x = Number(sPicture.x3);
				y = Number(sPicture.y3);
			}
			if (sNumber === 4 || sNumber === 8) {
				x = Number(sPicture.x4);
				y = Number(sPicture.y4);
			}

			// 画像が読み込まれたあとに実行
			sSprite.bitmap.addLoadListener(function() {
				if (Number(sPicture.origin) === 0) {
					// 左上原点
					sSprite.x = x;
					sSprite.y = y;
					sSprite.originX = x;
					sSprite.originY = y;
				} else {
					// 中央原点
					sSprite.x = x - (sSprite.width * calcScaleX / 100) / 2;
					sSprite.y = y - (sSprite.height * calcScaleY / 100) / 2;
					sSprite.originX = x - (sSprite.width * calcScaleX / 100) / 2;
					sSprite.originY = y - (sSprite.height * calcScaleY / 100) / 2;
				}
				// 切替効果
				if (sSprite.opacity === 0) {
					if (transitions[sNumber - 1] === 0) sSprite.opacity = Number(sPicture.opacity);
					if (transitions[sNumber - 1] === 2) sSprite.x -= 30;
					if (transitions[sNumber - 1] === 3) sSprite.x += 30;
					if (transitions[sNumber - 1] === 4) sSprite.y += 30;
					if (transitions[sNumber - 1] === 5) sSprite.y -= 30;
				}
				sSprite.setBlendMode(Number(sPicture.blendMode));
				sSprite.setColorTone($gameSystem._StandingPictureTone ? $gameSystem._StandingPictureTone : [0, 0, 0, 0]);
				sSprite.setBlendColor([0, 0, 0, 0]);
				sSprite.scale.x = calcScaleX / 100;
				sSprite.scale.y = calcScaleY / 100;
				sSprite.showing = true;
			}.bind(this));
		}

		static fadeIn (sSprite, sPicture, sNumber) {
			if (!sSprite.showing) return;
			if (sSprite.opacity >= Number(sPicture.opacity)) {
				sSprite.opening = false;
				sSprite.opacity = Number(sPicture.opacity);
				return;
			}
			sSprite.opening = true;
			sSprite.closing = false;
			// 切替効果
			if (sSprite.originX > sSprite.x) sSprite.x += 2;
			if (sSprite.originX < sSprite.x) sSprite.x -= 2;
			if (sSprite.originY < sSprite.y) sSprite.y -= 2;
			if (sSprite.originY > sSprite.y) sSprite.y += 2;
			sSprite.opacity += Number(sPicture.opacity) / 15;
		}

		static fadeOut (sSprite, sPicture, sNumber) {
			if (sSprite.opacity === 0) {
				sSprite.closing = false;
				return;
			}
			sSprite.closing = true;
			if (!sPicture) {
				sSprite.opacity = 0;
				return;
			}
			sSprite.opacity -= Number(sPicture.opacity) / 15;
			// 切替効果
			if (transitions[sNumber - 1] === 0) sSprite.opacity = 0;
			if (transitions[sNumber - 1] === 2 && sSprite.originX - 30 < sSprite.x) sSprite.x -= 2;
			if (transitions[sNumber - 1] === 3 && sSprite.originX + 30 > sSprite.x) sSprite.x += 2;
			if (transitions[sNumber - 1] === 4 && sSprite.originY + 30 > sSprite.y) sSprite.y += 2;
			if (transitions[sNumber - 1] === 5 && sSprite.originY - 30 < sSprite.y) sSprite.y -= 2;
		}

		static animation (sSprite, sMotion, animationCount) {
			if (!sSprite.showing) return animationCount;
			if (sMotion === "yes") {
				if (animationCount > 12) {
					sSprite.y += 2;
				} else {
					sSprite.y -= 2;
				}
				animationCount -= 1;
			}
			if (sMotion === "yesyes") {
				if (animationCount > 36) {
					sSprite.y += 2;
				} else if (animationCount > 24) {
					sSprite.y -= 2;
				} else if (animationCount > 12) {
					sSprite.y += 2;
				} else {
					sSprite.y -= 2;
				}
				animationCount -= 1;
			}
			if (sMotion === "no") {
				if (animationCount > 18) {
					sSprite.x += 2;
				} else if (animationCount > 6) {
					sSprite.x -= 2;
				} else {
					sSprite.x += 2;
				}
				animationCount -= 1;
			}
			if (sMotion === "noslow") {
				if (animationCount > 36) {
					sSprite.x += 1;
				} else if (animationCount > 12) {
					sSprite.x -= 1;
				} else {
					sSprite.x += 1;
				}
				animationCount -= 1;
			}
			if (sMotion === "jump") {
				if (animationCount > 12) {
					sSprite.y -= 2;
				} else {
					sSprite.y += 2;
				}
				animationCount -= 1;
			}
			if (sMotion === "jumpjump") {
				if (animationCount > 36) {
					sSprite.y -= 2;
				} else if (animationCount > 24) {
					sSprite.y += 2;
				} else if (animationCount > 12) {
					sSprite.y -= 2;
				} else {
					sSprite.y += 2;
				}
				animationCount -= 1;
			}
			if (sMotion === "jumploop") {
				if (animationCount > 36) {
					sSprite.y -= 2;
				} else if (animationCount > 24) {
					sSprite.y += 2;
				}
				animationCount -= 1;
				if (animationCount === 0) animationCount = 48;
			}
			if (sMotion === "shake") {
				if (animationCount <= 2) {
					sSprite.x -= 2;
					animationCount += 1;
				} else if (animationCount <= 4) {
					sSprite.y -= 2;
					animationCount += 1;
				} else if (animationCount <= 6) {
					sSprite.x += 4;
					sSprite.y += 4;
					animationCount += 1;
				} else if (animationCount <= 8) {
					sSprite.y -= 2;
					animationCount += 1;
				} else if (animationCount === 9) {
					sSprite.x -= 2;
					animationCount += 1;
				} else if (animationCount === 10) {
					sSprite.x -= 2;
					animationCount = 0;
				}
			}
			if (sMotion === "shakeloop") {
				if (animationCount <= 2) {
					sSprite.x -= 1;
					animationCount += 1;
				} else if (animationCount <= 4) {
					sSprite.y -= 1;
					animationCount += 1;
				} else if (animationCount <= 6) {
					sSprite.x += 2;
					sSprite.y += 2;
					animationCount += 1;
				} else if (animationCount <= 8) {
					sSprite.y -= 1;
					animationCount += 1;
				} else if (animationCount <= 10) {
					sSprite.x -= 1;
					animationCount += 1;
				}
				if (animationCount > 10) animationCount = 1;
			}
			if (sMotion === "runleft") {
				sSprite.x -= 16;
				if (sSprite.x < -2000) animationCount = 0;
			}
			if (sMotion === "runright") {
				sSprite.x += 16;
				if (sSprite.x > 2000) animationCount = 0;
			}
			if (sMotion === "noslowloop") {
				if (animationCount > 72) {
					sSprite.x += 0.25;
				} else if (animationCount > 24) {
					sSprite.x -= 0.25;
				} else {
					sSprite.x += 0.25;
				}
				animationCount -= 1;
				if (animationCount === 0) animationCount = animationFrame["noslowloop"];
			}
			if (sMotion === "breathing") {
				if (animationCount > 72) {
					sSprite.y += 0.5;
				} else if (animationCount > 48) {
					sSprite.y -= 0.5;
				}
				animationCount -= 1;
				if (animationCount === 0) animationCount = animationFrame["breathing"];
			}
			if (sMotion === "breathing2") {
				if (animationCount > 48) {
					sSprite.y -= sSprite.height * 0.0003;
					sSprite.scale.y += 0.0003;
				} else {
					sSprite.y += sSprite.height * 0.0003;
					sSprite.scale.y -= 0.0003;
				}
				animationCount -= 1;
				if (animationCount === 0) animationCount = animationFrame["breathing2"];
			}
			if (sMotion === "huwahuwa") {
				if (animationCount > 144) {
					sSprite.y += 0.25;
				} else if (animationCount > 48) {
					sSprite.y -= 0.25;
				} else {
					sSprite.y += 0.25;
				}
				animationCount -= 1;
				if (animationCount === 0) animationCount = animationFrame["huwahuwa"];
			}
			return animationCount;
		}

		static cachePictures() {
			if (!bootCachePictures) return;

			sPictureLists.forEach(function(pictureList) {
				ImageManager.loadPicture(pictureList.imageName);
			});
		}
	}

	const _Scene_Map_update = Scene_Map.prototype.update;
	Scene_Map.prototype.update = function() {
		_Scene_Map_update.apply(this, arguments);
		ExStandingPicture.update(this);
	};

	const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
	Scene_Map.prototype.createDisplayObjects = function() {
		_Scene_Map_createDisplayObjects.apply(this, arguments);
		ExStandingPicture.create(this);
	};

	const _Scene_Battle_update = Scene_Battle.prototype.update;
	Scene_Battle.prototype.update = function() {
		_Scene_Battle_update.apply(this, arguments);
		ExStandingPicture.update(this);
	};

	const _Scene_Battle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
	Scene_Battle.prototype.createDisplayObjects = function() {
		_Scene_Battle_createDisplayObjects.apply(this, arguments);
		ExStandingPicture.create(this);
	};

	const _Window_Message_updateClose = Window_Message.prototype.updateClose;
	Window_Message.prototype.updateClose = function() {
		// ピクチャ消去判定
		if (this._closing && this.openness === 255) {
			if (!$gameSystem._LL_StandingPicture_holdSPicture) {
				($gameSystem._LL_StandingPicture_pictures || []).forEach(function(picture) {
					picture.show = false;
					picture.motion = "";
				});
			}
	    }
		_Window_Message_updateClose.apply(this, arguments);
	};

	const _Window_Message_startMessage = Window_Message.prototype.startMessage;
	Window_Message.prototype.startMessage = function() {
		const messageAllText = $gameMessage.allText();
		exStandingPictureParseChar(messageAllText);

		_Window_Message_startMessage.apply(this, arguments);
	};

	const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
	Window_Base.prototype.convertEscapeCharacters = function(text) {
		// 立ち絵呼び出し用の制御文字(\V[n]内包)を追加
		text = text.replace(/\\F\[\\V\[(\d+)\]\]/gi, "");
		text = text.replace(/\\FF\[\\V\[(\d+)\]\]/gi, "");
		text = text.replace(/\\FFF\[\\V\[(\d+)\]\]/gi, "");
		text = text.replace(/\\FFFF\[\\V\[(\d+)\]\]/gi, "");
		text = text.replace(/\\F[12345678]\[\\V\[(\d+)\]\]/gi, "");

		// 立ち絵呼び出し用の制御文字を追加
		text = text.replace(/\\F\[(\w+)\]/gi, "");
		text = text.replace(/\\FF\[(\w+)\]/gi, "");
		text = text.replace(/\\FFF\[(\w+)\]/gi, "");
		text = text.replace(/\\FFFF\[(\w+)\]/gi, "");
		text = text.replace(/\\F[12345678]\[(\w+)\]/gi, "");
		text = text.replace(/\\M\[(\w+)\]/gi, "");
		text = text.replace(/\\MM\[(\w+)\]/gi, "");
		text = text.replace(/\\MMM\[(\w+)\]/gi, "");
		text = text.replace(/\\MMMM\[(\w+)\]/gi, "");
		text = text.replace(/\\M[12345678]\[(\w+)\]/gi, "");
		text = text.replace(/\\AA\[(\w+)\]/gi, "");
		text = text.replace(/\\FH\[(\w+)\]/gi, "");

		return _Window_Base_convertEscapeCharacters.call(this, text);
	};


	const _Scene_Boot_onDatabaseLoaded = Scene_Boot.prototype.onDatabaseLoaded;
	Scene_Boot.prototype.onDatabaseLoaded = function() {
		_Scene_Boot_onDatabaseLoaded.apply(this, arguments);

		// 立ち絵画像を事前読み込み
		ExStandingPicture.cachePictures();
	};


	//-----------------------------------------------------------------------------
	// Sprite_LL_SPicture
	//
	// 立ち絵を表示するための独自のスプライトを追加定義します。

	function Sprite_LL_SPicture() {
		this.initialize.apply(this, arguments);
	}

	Sprite_LL_SPicture.prototype = Object.create(Sprite.prototype);
	Sprite_LL_SPicture.prototype.constructor = Sprite_LL_SPicture;

	Sprite_LL_SPicture.prototype.initialize = function() {
		Sprite.prototype.initialize.call(this);

		this.bitmap = null;
		this.opacity = 0;
		this.opening = false;
		this.closing = false;
		this.originX = 0;
		this.originY = 0;
		this.showing = false;

		this.setOverlayBitmap();
		this.initMembers();
	};

	Sprite_LL_SPicture.prototype.setOverlayBitmap = function() {
		this._spriteBlink = new Sprite();
		this._spriteBlink.visible = false;
		this.addChild(this._spriteBlink);
		this._spriteBlink2 = new Sprite();
		this._spriteBlink2.visible = false;
		this.addChild(this._spriteBlink2);
	};

	Sprite_LL_SPicture.prototype.initMembers = function() {
		this._blinkInterval = 0;
		this._blinkWait = 0;
		this._blinkAnimation = 0;
	};

	Sprite_LL_SPicture.prototype.update = function() {
		Sprite.prototype.update.call(this);

		this.updateBlink();
	};

	Sprite_LL_SPicture.prototype.updateBlink = function() {
		if (this.opening || this.closing) {
			this._spriteBlink.visible = false;
			this._spriteBlink2.visible = false;
			return;
		}

		if (this._blinkInterval <= 0) {
			this._blinkWait--;
			if (this._blinkWait <= 0) {
				this._blinkAnimation++;
				if (this._blinkAnimation > 2 || (this._blinkAnimation === 2 && !this._spriteBlink2.bitmap)) {
					this._blinkAnimation = 0;
				}

				switch (this._blinkAnimation) {
					case 1:
						this._spriteBlink.visible = true;
						this._spriteBlink2.visible = false;
						this._blinkWait = blinkWaitCount;
						this._blinkInterval = 0;
						break;
					case 2:
						this._spriteBlink.visible = false;
						this._spriteBlink2.visible = true;
						this._blinkWait = blinkWaitCount;
						this._blinkInterval = 0;
						break;
					default:
						this._spriteBlink.visible = false;
						this._spriteBlink2.visible = false;
						this._blinkWait = blinkWaitCount;
						this._blinkInterval = Math.randomInt(blinkInterval * 2);
						break;
				}
			}
		} else {
			this._blinkInterval--;
		}
	};

	Sprite_LL_SPicture.prototype.setPicture = function(sPicture) {
		// ベース画像
		this.bitmap = null;
		this.bitmap = ImageManager.loadPicture(sPicture.imageName);
		// 瞬き1
		this._spriteBlink.bitmap = null;
		this._spriteBlink.bitmap = ImageManager.loadPicture(sPicture.imageNameBlink);
		this._spriteBlink.visible = false;
		// 瞬き2
		this._spriteBlink2.bitmap = null;
		this._spriteBlink2.bitmap = ImageManager.loadPicture(sPicture.imageNameBlink2);
		this._spriteBlink2.visible = false;

		this._blinkInterval = Math.randomInt(blinkInterval * 2);
		this._blinkWait = blinkWaitCount;
		this._blinkAnimation = 0;
	};

	Sprite_LL_SPicture.prototype.setBlendColor = function(color) {
		Sprite.prototype.setBlendColor.call(this, color);

		// MZでは不要 (MVでは必要)
		// this._spriteBlink.setBlendColor(this.getBlendColor());
		// this._spriteBlink2.setBlendColor(this.getBlendColor());
	};

	Sprite_LL_SPicture.prototype.setColorTone = function(tone) {
		Sprite.prototype.setColorTone.call(this, tone);

		// MZでは不要 (MVでは必要)
		// this._spriteBlink.setColorTone(this.getColorTone());
		// this._spriteBlink2.setColorTone(this.getColorTone());
	};

	Sprite_LL_SPicture.prototype.setBlendMode = function(mode) {
		this.blendMode = mode;
		this._spriteBlink.blendMode = mode;
		this._spriteBlink2.blendMode = mode;
	};
})();
