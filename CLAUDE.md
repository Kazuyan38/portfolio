# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

個人ポートフォリオサイトの**仮実装**。素の HTML / CSS / JavaScript のみで構成する。

- ビルドツール・npm・フレームワーク・パッケージマネージャは**一切使わない**
- 公開は当面しない。ローカルでの表示確認のみ
- コンテンツは仮（ダミー）。後から本文・実作品に差し替える前提で作る

**デザイン判断の根拠は `DESIGN.md`**（このファイルが規則の what、DESIGN.md が why）。トークンの追加・変更、新しい UI の設計をするときは、先に DESIGN.md の該当章を読み、規則にない判断をしたら DESIGN.md に根拠を追記してから実装する。

## 最重要制約：`file://` で開いて動くこと

このプロジェクトの設計は、ほぼすべてこの一点から導かれる。`index.html` をダブルクリックしただけで全機能が動く状態を維持する。ローカルサーバーの起動を前提にしてはならない。

`file://` プロトコルでは Origin が `null` になるため、以下が **CORS エラーで動作しない**。使用禁止。

| 禁止 | 理由 | 代替 |
|---|---|---|
| `<script type="module">` / `import` / `export` | モジュール読込が CORS で失敗 | クラシックスクリプト（`<script src>` を並べる）。共有は `window` 直下の名前空間オブジェクト 1 つに集約 |
| `fetch()` / `XMLHttpRequest` | ローカルファイル取得が失敗 | データは `assets/js/data.js` に JS オブジェクトとして直接書く |
| CSS/JS/画像の絶対パス（`/assets/...`） | ドライブのルートを指してしまう | 相対パス（`assets/...`、`../assets/...`）のみ |
| 外部 CDN のフォント・CSS・画像 | オフラインで壊れる。仮サイトに外部依存を持ち込まない | システムフォントスタック、インライン SVG、ローカル画像 |
| Service Worker / IndexedDB | `file://` で登録不可・制限あり | 使わない。状態は `localStorage` まで |

新しくページや機能を追加したら、必ず `file://` で開いて DevTools の Console にエラーが出ないことを確認する。

## ディレクトリ構成

```
index.html          トップ（ヒーロー＋実績抜粋＋連絡先への導線）
about.html          プロフィール・経歴・スキル
works.html          制作実績一覧
contact.html        連絡先
assets/
  css/
    style.css       全スタイル（単一ファイル）
  js/
    data.js         UI 文言・設定値の定数。DOM に触れない
    main.js         DOM 操作・イベント。data.js の後に読み込む
  img/
    bg-yugen.webp   全ページ共通の固定背景アート
    profile-placeholder.svg
    works/          作品画像
  video/
    chaotic-yugen.mp4   トップのヒーロー背景動画
```

**コンテンツの単一の情報源は HTML**。作品一覧などの本文を `data.js` に持たせて JS で描画しない（JS 無効時に何も表示されなくなるため）。`data.js` が持つのは UI 文言や設定値だけ。

ページを増やす場合もルート直下にフラットに置く。`file://` では階層を深くするほど相対パスの事故が増えるため、サブディレクトリを切らない。

### CSS を単一ファイルにする理由

ビルドがないため `@import` は追加のラウンドトリップになり、描画がちらつく。分割せず `style.css` 1 枚に集約し、内部をコメントで区切って構造を保つ。

```css
/* ============================================
   Tokens
   ============================================ */
```

セクション順は固定：`Tokens` → `Reset` → `Base` → `Layout` → `Components` → `Pages` → `Utilities`。この順序が詳細度の衝突を防ぐので、新しい規則は該当セクションの末尾に追加する。

## 確認方法

```powershell
# 既定ブラウザで開く（これが基本）
Invoke-Item index.html

# 特定ブラウザで開く
Start-Process chrome (Resolve-Path index.html)
```

`file://` で動くことが要件なので、ローカルサーバーは原則不要。どうしても必要な場合のみ以下を使い、**サーバー前提のコードは書かない**。

```powershell
python -m http.server 8000
```

## HTML ルール

- 全ページで同じ `<head>`（charset → viewport → color-scheme → title → description → CSS）と、同じヘッダー／フッターのマークアップを使う。ビルドによる共通化ができないため、**コピーで揃える**。ヘッダーを変更したら全ページに手で反映する
- セクション要素は `<header> <nav> <main> <section> <footer>` を使い分ける。`<div>` はスタイル目的のラッパーに限定
- `<h1>` は 1 ページ 1 つ。見出しレベルを飛ばさない
- 画像には必ず `alt`、`width`、`height` を書く。`width`/`height` はレイアウトシフト防止のため装飾画像でも省略しない
- 装飾目的の画像は `alt=""` とし、意味のある画像は内容を説明する
- 現在ページのナビゲーションリンクには `aria-current="page"` を付ける

## CSS ルール

### デザイントークン

色・余白・フォントサイズ・モーションを直値で書かない。`:root` のカスタムプロパティを経由する。トークンの実値と導出根拠（60-30-10 の割当、モジュラースケール r=1.25、近接バンド規則、伝統色の対応）は `DESIGN.md` と `style.css` の Tokens セクションが正。

- 余白は必ず `--sp-*` スケールから選ぶ。`13px` のような中間値を使いたくなったら、まずレイアウトを疑う
- モーションは必ず `--dur-*` / `--ease-*` を経由する。`0.3s` のような直値 duration を書かない
- 明朝（`--font-display-ja`）は font-weight 600・`--fs-xl`（25px）以上のみ。それ未満はゴシック（Windows の游明朝が細く滲むため）
- `!important` の唯一の例外は Base の reduced-motion リセットブロック。それ以外では使わない

### カラーテーマ（単一ダーク）

**このサイトは夜の海（ダーク）一色にコミットする。** OS のライト設定でもダークのまま表示する（ユーザー決定事項）。

```css
:root {
  color-scheme: dark;
  --c-bg: #041f2f;    /* 濃藍 */
  --c-text: #eaf2f7;  /* 月白 */
  /* … */
}
```

- `@media (prefers-color-scheme: ...)` によるテーマ上書きを**書かない**（ライトテーマは存在しない）
- 色は必ず `:root` のトークンで一度定義してから使う
- 全ページの `<head>` に `<meta name="color-scheme" content="dark">` を置く（CSS 読込前の UA 既定色もダークにする。head の共通構造は charset → viewport → color-scheme → title → description → CSS）
- フォーム要素を将来追加する場合も `color-scheme: dark` が UA スタイルを暗色にするため個別対応は不要

### 命名

BEM を簡略化した `block__element--modifier` を使う。

```css
.work-card { }
.work-card__title { }
.work-card__title--featured { }
```

- ID セレクタでスタイルを当てない（ID はアンカーと JS の取得用）
- `style` 属性（インラインスタイル）を書かない。1 プロパティだけの調整は `Utilities` の `.mt-4` 等を使い、無ければ追加する
- JS が付け外しするフックは属性セレクタ（`[data-work-list]`）にし、スタイル用のクラス名を JS から参照しない
- `!important` は使わない
- ネストの深さは 2 レベルまで
- 要素セレクタ単体（`div`, `p`）へのスタイルは `Base` セクションのみ

### 固定背景アート

全ページ共通の背景画像（`assets/img/bg-yugen.webp`）は `body::before` の `position: fixed` レイヤーで敷いている（`background-attachment: fixed` は iOS で効かないため使わない）。ベールは `--c-veil-l`（左 = 紙質感の明部側 = 濃く沈める）/ `--c-veil-r`（右 = 夜空と月の側 = 薄くして月を滲ませる）の左右グラデーション。濃度の根拠と実測コントラスト表は DESIGN.md 2 章。この方式は以下の前提で成立しているので破らないこと。

- `html` に background を書かない（`body` 背景の伝播が止まり、固定レイヤーが覆われて背景が消える）
- `body` に `transform` / `filter` / `contain` を書かない（fixed の基準が body になり、スクロールで背景が流れる）
- muted テキストを素の（透明な）背景に直接置くのは画面の左〜中央のみ。右 1/3 は月と暗部で、コントラストはベール濃度に依存している
- 月の領域（画像右上）は不透明ヘッダーとリード面（surface-veil）が覆う構造を崩さない
- `.section--surface` / `.wave__svg` の fill / `.site-footer` は必ず同じ `--c-surface-veil` を使う。別の値にすると波とバンドに継ぎ目が出る
- `--c-veil-l` を 0.85 未満、`--c-overlay` を 0.65 未満にしない（AA 割れ。DESIGN.md 2 章の実測表）

### レスポンシブ

モバイルファースト。基本スタイルを狭い画面向けに書き、`min-width` で広げる。ブレークポイントは 2 つに限定する。

```css
@media (min-width: 600px)  { }  /* タブレット */
@media (min-width: 1024px) { }  /* デスクトップ */
```

固定 `px` 幅を持つ要素を作らない。`max-width` + `width: 100%` を使う。

## JavaScript ルール

- JS は**装飾**。JS が無効でも全コンテンツが読め、全ページに遷移できること
- 操作 UI（絞り込みボタン等）は JS が `createElement` で**生成**する。HTML に静的に書くと、JS 無効時に反応しないボタンが残る。実績ページの `.filter` がこの方式
- グローバル汚染を避けるため、公開するものは `window.Portfolio` 1 つに集約する

```javascript
// data.js
window.Portfolio = window.Portfolio || {};
window.Portfolio.works = [ /* … */ ];
```

- 各ファイルは IIFE で囲む（`'use strict';` を先頭に）
- DOM 取得は `document.querySelector` に統一
- イベントは要素ごとに付けず、親でデリゲートする
- `innerHTML` に変数を入れない。テキストは `textContent`、要素は `createElement` で組む
- 依存関係があるので読み込み順を守る：`data.js` → `main.js`。`<body>` 終了直前に置く

## 画像・アセット

- 形式は写真 `.webp`（フォールバック不要）、図版・ロゴ `.svg`
- 幅は表示サイズの 2 倍まで。1 枚 300KB を超えたら縮小する
- `loading="lazy"` をファーストビュー外の画像に付ける。ファーストビューの画像には**付けない**
- ファイル名は小文字ケバブケース（`work-thumbnail-01.webp`）。日本語・スペースを含めない（OneDrive 同期と `file://` の両方で事故る）

### 動画

`<video>` の相対パス再生は `file://` でも動く（禁止対象は fetch/XHR であり、メディア要素は対象外）。

- 形式は H.264 の `.mp4`。命名規則は画像と同じ
- 装飾用の背景動画は次をセットで守る。1 つでも欠けると特定環境で壊れる
  - `autoplay muted loop playsinline aria-hidden="true"`（属性のみで動く = JS 無効でも再生される。音声トラックは入れない）
  - ネイビーのオーバーレイ（`--c-overlay`）+ 白文字（`--c-on-media`）でコントラストを動画の内容に依存させない
  - コンテナにフォールバック背景色（`--c-accent`）。動画が出ない環境でも白文字が読める
  - `prefers-reduced-motion: reduce` で `display: none`
  - 実装例はトップの `.hero--video` 一式

## 仮コンテンツの扱い

後で必ず差し替えるので、**機械的に検出できる形**で入れる。

- 全ページの `<body>` 先頭に `.draft-banner`（「これは仮サイトです」）を置く。誤って共有されても仮だと分かるようにするため。本公開時はこの `<p>` と CSS の該当ブロックを削除する
- ダミーテキストの直前に `<!-- TODO:copy -->` を置く
- プレースホルダ画像はローカルに置く。外部プレースホルダサービス（`placeholder.com` 等）は使わない — オフラインで壊れ、仮であることも分からなくなる
- 未定のリンクは `href="#"` ではなく `href="#" data-todo="link"` とする。`href="#"` だけだと本物のアンカーと区別できない
- 差し替え漏れは検索で洗い出す

```powershell
Select-String -Path *.html -Pattern 'TODO:copy|data-todo'
```

実在しない受賞歴・経歴・企業名などを仮テキストとして書かない。差し替え漏れがそのまま経歴詐称になるため、プレースホルダは「ここに〇〇が入ります」と明示する。

## アクセシビリティ

- 本文と背景のコントラスト比 4.5:1 以上
- フォーカスリングを消さない。デザイン上変更する場合は `:focus-visible` で見える代替を必ず用意する
- ページ先頭にスキップリンク（`<a href="#main" class="skip-link">`）を置く
- キーボードだけで全ページを操作できること。ハンバーガーメニューを作る場合は Esc で閉じ、`aria-expanded` を更新する

## 本公開に移行するときのチェックリスト

このリストの項目は、公開が決まるまで対応不要。

- [ ] `TODO:copy` / `data-todo` の全消し込み（現在 32 箇所）
- [ ] `.draft-banner` の削除（全 4 ページ + CSS）
- [ ] プレースホルダ SVG を実際の作品画像（`.webp`）に差し替え
- [ ] `<title>` と `meta description` をページごとに固有の内容へ
- [ ] OGP / favicon の追加
- [ ] 連絡先の実アドレス化（スパム対策を検討）
- [ ] ヒーロー動画の再エンコード（現状 34MB / 27.5Mbps はローカル専用。Web 配信するなら 3〜5Mbps・5MB 前後へ圧縮し、`poster` 画像の追加も検討）
- [ ] 公開先が確定したら、`file://` 制約の解除可否を再検討する（サーバー配信になれば modules と fetch が解禁され、ルールを緩められる）
