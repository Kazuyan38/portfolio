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

    var targets = document.querySelectorAll('[data-reveal], [data-reveal-item]');
    if (targets.length === 0) {
      return;
    }

    /* 同じコールバックで現れた要素にだけ 0,1,2… の順番を渡す。CSS 側が
       transition-delay: calc(--dur-stagger * --reveal-i) で連なりを作る。
       スクロールで 1 つずつ入ってきた場合は毎回 0 になり、遅延なしで現れる。
       カスタムプロパティの書き込みはインラインスタイル禁止の例外
       （クラスでは表現できない連番。DESIGN.md 6章） */
    var observer = new IntersectionObserver(function (entries) {
      var shown = [];
      var i;

      for (i = 0; i < entries.length; i += 1) {
        if (entries[i].isIntersecting) {
          shown.push(entries[i]);
        }
      }

      /* entries の順序は仕様で保証されないため、画面上の縦位置で並べ替えてから
         番号を振る。並べ替えないと連なりが下から上に流れることがある */
      shown.sort(function (a, b) {
        return a.boundingClientRect.top - b.boundingClientRect.top;
      });

      /* --reveal-i を書くのは [data-reveal-item] だけ。カスタムプロパティは
         継承するため、コンテナ側に書くと入れ子の item が親の番号を拾ってしまう。
         番号も item どうしで数える（コンテナを混ぜると先頭が 0 にならない） */
      var order = 0;
      for (i = 0; i < shown.length; i += 1) {
        if (shown[i].target.hasAttribute('data-reveal-item')) {
          shown[i].target.style.setProperty('--reveal-i', String(order));
          order += 1;
        }
        shown[i].target.classList.add('is-revealed');
        observer.unobserve(shown[i].target);
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

  /* --- ヘッダーのスクロール連動縮小 --- */
  /* reduced-motion では CSS のグローバルブロックが transition を止めるため、
     JS 側での分岐は不要（クラスの付け外しだけなら害がない） */
  function initHeaderScroll() {
    var header = document.querySelector('[data-site-header]');
    if (!header) {
      return;
    }

    var THRESHOLD = 24;
    var ticking = false;

    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > THRESHOLD);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* --- ヒーロー動画の視差効果 --- */
  /* translate プロパティで動かす（CSS 側の transform: scale と独立に合成
     されるため、可動域を確保する scale を消さずに済む）。
     連続値のため style 属性の直接操作が必要な唯一の例外（DESIGN.md 6章） */
  function initHeroParallax() {
    if (prefersReducedMotion()) {
      return;
    }

    var media = document.querySelector('[data-hero-video]');
    var hero = media && media.closest('.hero');
    if (!hero) {
      return;
    }

    var MAX_OFFSET = 80;
    var FACTOR = 0.15;
    var ticking = false;

    function update() {
      var rect = hero.getBoundingClientRect();
      var offset = Math.min(MAX_OFFSET, Math.max(0, -rect.top) * FACTOR);
      media.style.translate = '0 ' + offset + 'px';
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* --- 実績カルーセルの前へ / 次へ --- */
  /* ボタンは JS で生成する。HTML に静的に書くと JS 無効時に反応しないボタンが
     残るため（CLAUDE.md）。ボタンが無くても、カルーセル本体は overflow-x の
     ネイティブスクロールと tabindex="0" + 矢印キーで操作できる */
  function initCarousel() {
    var carousel = document.querySelector('[data-carousel]');
    var track = carousel && carousel.querySelector('[data-carousel-track]');
    if (!track) {
      return;
    }

    var nav = document.createElement('div');
    var dirs = [
      { dir: -1, label: ui.carouselPrev || '前へ', glyph: '←' },
      { dir: 1, label: ui.carouselNext || '次へ', glyph: '→' }
    ];
    var i;

    nav.className = 'carousel__nav';

    for (i = 0; i < dirs.length; i += 1) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'carousel__btn';
      btn.setAttribute('data-carousel-dir', String(dirs[i].dir));
      btn.setAttribute('aria-label', dirs[i].label);
      btn.textContent = dirs[i].glyph;
      nav.appendChild(btn);
    }

    carousel.parentNode.insertBefore(nav, carousel.nextSibling);

    /* 送り幅はカード 1 枚 + gap。実測するのでカード幅を変えても追従する */
    function cardStep() {
      var card = track.firstElementChild;
      if (!card) {
        return carousel.clientWidth;
      }
      var gap = parseFloat(window.getComputedStyle(track).columnGap);
      return card.getBoundingClientRect().width + (gap || 0);
    }

    /* 端に着いたら押せなくする。全カードが収まって送る余地が無い場合は
       ボタン自体を隠す（押せないだけのものを置かない） */
    function syncNav() {
      var max = carousel.scrollWidth - carousel.clientWidth;
      var buttons = nav.querySelectorAll('[data-carousel-dir]');
      var j;

      nav.hidden = max <= 1;
      for (j = 0; j < buttons.length; j += 1) {
        var dir = Number(buttons[j].getAttribute('data-carousel-dir'));
        buttons[j].disabled = dir < 0
          ? carousel.scrollLeft <= 1
          : carousel.scrollLeft >= max - 1;
      }
    }

    nav.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-carousel-dir]');
      if (!btn || btn.disabled) {
        return;
      }
      carousel.scrollBy({
        left: Number(btn.getAttribute('data-carousel-dir')) * cardStep(),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    });

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          syncNav();
          ticking = false;
        });
        ticking = true;
      }
    }

    carousel.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    /* 画像が遅延読込で入るとカードの高さと scrollWidth が変わるため、
       読み終わりでも取り直す */
    window.addEventListener('load', syncNav);

    syncNav();
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
    initHeaderScroll();
    initHeroParallax();
    initYear();
    initWorkFilter();
    initCarousel();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
