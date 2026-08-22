/* data.js
 * UI 文言と設定値の定数。DOM には触れない。
 *
 * 作品などのコンテンツ本文はここに置かない。
 * JS 無効でも読めるようにするため、コンテンツは HTML 側が単一の情報源。
 */
(function () {
  'use strict';

  window.Portfolio = window.Portfolio || {};

  window.Portfolio.ui = {
    filterLabel: '制作実績の絞り込み',
    filterAll: 'すべて',
    carouselPrev: '前の作品へ',
    carouselNext: '次の作品へ',
    navOpen: 'メニューを開く',
    navClose: 'メニューを閉じる'
  };
})();
