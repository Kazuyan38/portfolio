/* main.js
 * DOM 操作とイベント。data.js の後に読み込むこと。
 *
 * ここで行うのは装飾のみ。JS が無効でも全コンテンツが読め、
 * 全ページに遷移できる状態を壊さないこと。
 */
(function () {
  'use strict';

  var ui = (window.Portfolio && window.Portfolio.ui) || {};
  var ALL = ui.filterAll || 'すべて';

  /* --- スクロール連動フェードイン --- */
  /* 属性付与は IIFE 実行時（初回描画前）に行う。DOMContentLoaded まで遅らせると
     コンテンツが一瞬見えてから隠れるちらつきが出る。
     JS 無効・IntersectionObserver 非対応・reduced-motion では属性が付かず、
     CSS の非表示化が一切発動しない（常時表示のフォールバック）。 */
  function prefersReducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function canReveal() {
    return 'IntersectionObserver' in window && !prefersReducedMotion();
  }

  if (canReveal()) {
    document.documentElement.setAttribute('data-js-reveal', '');
  }

  function initReveal() {
    if (!document.documentElement.hasAttribute('data-js-reveal')) {
      return;
    }

    var targets = document.querySelectorAll('[data-reveal]');
    if (targets.length === 0) {
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var i;
      for (i = 0; i < entries.length; i += 1) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-revealed');
          observer.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px' });

    var i;
    for (i = 0; i < targets.length; i += 1) {
      observer.observe(targets[i]);
    }
  }

  /* --- 背景動画の制御 --- */
  /* reduced-motion では CSS が display:none にするが、それだけでは動画を
     ダウンロードしてしまうため、自動再生と先読みも止める。
     停止ボタンは置かない（ユーザー決定。DESIGN.md 5章の判断記録） */
  function initHeroVideo() {
    var video = document.querySelector('[data-hero-video]');
    if (!video || !prefersReducedMotion()) {
      return;
    }

    video.removeAttribute('autoplay');
    video.preload = 'none';
    video.pause();
  }

  /* --- フッターの年号を現在年に更新 --- */
  function initYear() {
    var target = document.querySelector('[data-year]');
    if (!target) {
      return;
    }
    target.textContent = String(new Date().getFullYear());
  }

  /* --- 制作実績の絞り込み --- */
  function collectTags(cards) {
    var tags = [];
    var i;
    var j;
    var cardTags;

    for (i = 0; i < cards.length; i += 1) {
      cardTags = (cards[i].getAttribute('data-tags') || '').split(',');
      for (j = 0; j < cardTags.length; j += 1) {
        var tag = cardTags[j].trim();
        if (tag !== '' && tags.indexOf(tag) === -1) {
          tags.push(tag);
        }
      }
    }
    return tags;
  }

  function buildFilter(tags) {
    var group = document.createElement('div');
    var i;

    group.className = 'filter';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', ui.filterLabel || '絞り込み');

    for (i = 0; i < tags.length; i += 1) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter__btn';
      btn.setAttribute('data-filter', tags[i]);
      btn.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      btn.textContent = tags[i];
      group.appendChild(btn);
    }
    return group;
  }

  function applyFilter(cards, empty, tag) {
    var visible = 0;
    var i;

    for (i = 0; i < cards.length; i += 1) {
      var cardTags = (cards[i].getAttribute('data-tags') || '').split(',');
      var j;
      var match = tag === ALL;

      for (j = 0; j < cardTags.length && !match; j += 1) {
        if (cardTags[j].trim() === tag) {
          match = true;
        }
      }

      cards[i].classList.toggle('is-hidden', !match);
      if (match) {
        visible += 1;
      }
    }

    if (empty) {
      empty.hidden = visible > 0;
    }
  }

  function initWorkFilter() {
    var list = document.querySelector('[data-work-list]');
    if (!list) {
      return;
    }

    var cards = list.querySelectorAll('[data-tags]');
    if (cards.length === 0) {
      return;
    }

    var empty = document.querySelector('[data-work-empty]');
    var tags = [ALL].concat(collectTags(cards));

    /* Hick の法則: 絞り込みタブは最大 7（DESIGN.md 5章）。超えたら統廃合を検討 */
    if (tags.length > 7) {
      console.warn('絞り込みタブが ' + tags.length + ' 件あります。DESIGN.md 5章の上限は 7 件です。タグの統廃合を検討してください。');
    }

    var group = buildFilter(tags);

    list.parentNode.insertBefore(group, list);

    /* 親でデリゲート。フックは属性セレクタ（スタイル用クラスを JS から参照しない） */
    group.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-filter]');
      if (!btn || !group.contains(btn)) {
        return;
      }

      var buttons = group.querySelectorAll('[data-filter]');
      var i;
      for (i = 0; i < buttons.length; i += 1) {
        buttons[i].setAttribute('aria-pressed', buttons[i] === btn ? 'true' : 'false');
      }

      applyFilter(cards, empty, btn.getAttribute('data-filter'));
    });
  }

  function init() {
    initHeroVideo();
    initYear();
    initWorkFilter();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
