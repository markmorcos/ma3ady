/* eslint-disable no-undef */
/*
 * Build dashboard runtime.
 *
 * - Fetches the consuming repo's GitHub Releases on every page load, so
 *   deleting a release on github.com makes it disappear here on next
 *   refresh — no rebuild/redeploy of the Pages site needed.
 * - Parses build-tooling's tag convention to extract a profile chip
 *   (preview | development | other). Tags that don't match the convention
 *   still show up under "other" so the dashboard never hides a release.
 * - Generates QR codes client-side from the APK asset URL via the
 *   qrcode-generator library loaded in index.html.
 */

(function () {
  'use strict';

  // ---------- config ----------

  const META_REPO = document.querySelector('meta[name="x-build-repo"]');
  const META_APP = document.querySelector('meta[name="x-app-slug"]');
  const repo = META_REPO ? META_REPO.content.trim() : '';
  const app = META_APP ? META_APP.content.trim() : '';

  if (!repo || repo.includes('{{')) {
    showError(
      'Repo not configured. Re-run the publish-build-pages workflow to render this dashboard.',
    );
    return;
  }

  // ---------- DOM refs ----------

  const els = {
    appName: document.getElementById('app-name'),
    repoLink: document.getElementById('hdr-repo-link'),
    loading: document.getElementById('state-loading'),
    error: document.getElementById('state-error'),
    empty: document.getElementById('state-empty'),
    grid: document.getElementById('grid'),
    filters: document.getElementById('filters'),
  };

  els.appName.textContent = app || repo.split('/')[1] || repo;
  els.repoLink.href = 'https://github.com/' + repo + '/releases';
  els.repoLink.textContent = 'github.com/' + repo + '/releases';

  // ---------- main ----------

  fetchReleases(repo)
    .then((releases) => {
      const builds = releases
        .map((r) => parseRelease(r))
        .filter((b) => b !== null);
      render(builds);
    })
    .catch((err) => {
      console.error(err);
      const msg =
        err && err.message
          ? err.message
          : 'Failed to load releases. Check that the repo is public and the slug is correct.';
      showError(msg);
    });

  // ---------- fetch ----------

  /** Paginates the Releases API up to a few hundred entries. */
  function fetchReleases(repo) {
    const url =
      'https://api.github.com/repos/' + repo + '/releases?per_page=100';
    return fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
    }).then(function (res) {
      if (res.status === 404) {
        throw new Error(
          'github.com/' +
            repo +
            ' is private or does not exist — the public Releases API returns 404.',
        );
      }
      if (!res.ok) {
        throw new Error('GitHub API ' + res.status + ' ' + res.statusText);
      }
      return res.json();
    });
  }

  // ---------- parse ----------

  /**
   * Tag conventions we recognise (anything else falls through as "other"):
   *
   *   local-build-<app>-<profile>-YYYYMMDD-HHMMSS
   *
   * Other tags still render — we just can't pull a profile from the name,
   * so they get the neutral "other" chip and skip the timestamp parse.
   */
  function parseRelease(release) {
    if (release.draft) return null;
    const tag = release.tag_name || '';
    const apkAsset = (release.assets || []).find(function (a) {
      return /\.apk$/i.test(a.name);
    });
    const downloadUrl = apkAsset
      ? apkAsset.browser_download_url
      : release.html_url;

    let profile = 'other';
    let when = release.published_at
      ? new Date(release.published_at)
      : new Date(release.created_at);

    const m = tag.match(
      /^local-build-(.+?)-(preview|development|production)-(\d{8})-(\d{6})$/,
    );
    if (m) {
      profile = m[2];
      const d = m[3];
      const t = m[4];
      const iso =
        d.slice(0, 4) +
        '-' +
        d.slice(4, 6) +
        '-' +
        d.slice(6, 8) +
        'T' +
        t.slice(0, 2) +
        ':' +
        t.slice(2, 4) +
        ':' +
        t.slice(4, 6) +
        'Z';
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) when = parsed;
    }

    return {
      tag: tag,
      name: release.name || tag,
      profile: profile,
      when: when,
      sha: release.target_commitish || '',
      downloadUrl: downloadUrl,
      releaseUrl: release.html_url,
      hasApk: !!apkAsset,
    };
  }

  // ---------- render ----------

  function render(builds) {
    els.loading.hidden = true;
    if (builds.length === 0) {
      els.empty.hidden = false;
      return;
    }

    builds.sort(function (a, b) {
      return b.when - a.when;
    });

    renderFilters(builds);
    renderCards(builds);
  }

  function renderFilters(builds) {
    const counts = builds.reduce(
      function (acc, b) {
        acc[b.profile] = (acc[b.profile] || 0) + 1;
        acc.all++;
        return acc;
      },
      { all: 0 },
    );

    // Always include the buckets that are present, plus "all" pinned first.
    const buckets = ['all'].concat(
      ['production', 'preview', 'development', 'other'].filter(function (k) {
        return counts[k] > 0;
      }),
    );

    els.filters.innerHTML = '';
    buckets.forEach(function (key) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-pill';
      btn.dataset.profile = key;
      btn.setAttribute('aria-pressed', key === 'all' ? 'true' : 'false');
      const label = document.createElement('span');
      label.textContent = key === 'all' ? 'All' : capitalize(key);
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = '(' + counts[key] + ')';
      btn.appendChild(label);
      btn.appendChild(count);
      btn.addEventListener('click', function () {
        applyFilter(key);
      });
      els.filters.appendChild(btn);
    });
  }

  function applyFilter(profile) {
    const cards = els.grid.querySelectorAll('.card');
    cards.forEach(function (card) {
      if (profile === 'all' || card.dataset.profile === profile) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
    els.filters.querySelectorAll('.filter-pill').forEach(function (b) {
      b.setAttribute(
        'aria-pressed',
        b.dataset.profile === profile ? 'true' : 'false',
      );
    });
  }

  function renderCards(builds) {
    els.grid.innerHTML = '';
    builds.forEach(function (b) {
      els.grid.appendChild(renderCard(b));
    });
    els.grid.hidden = false;
  }

  function renderCard(b) {
    const li = document.createElement('li');
    li.className = 'card';
    li.dataset.profile = b.profile;

    // ---- head row ----
    const head = document.createElement('div');
    head.className = 'card-head';
    const profile = document.createElement('span');
    profile.className =
      'card-profile card-profile-' +
      (['preview', 'development', 'production'].indexOf(b.profile) >= 0
        ? b.profile
        : 'other');
    profile.textContent = b.profile;
    const time = document.createElement('span');
    time.className = 'card-time';
    time.textContent = relativeTime(b.when);
    time.title = b.when.toISOString();
    head.appendChild(profile);
    head.appendChild(time);
    li.appendChild(head);

    // ---- tag ----
    const tag = document.createElement('div');
    tag.className = 'card-tag';
    tag.textContent = b.tag;
    li.appendChild(tag);

    // ---- meta (sha + link) ----
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    if (b.sha) {
      const sha = document.createElement('a');
      sha.href = 'https://github.com/' + repo + '/commit/' + b.sha;
      sha.target = '_blank';
      sha.rel = 'noopener';
      sha.textContent = b.sha.slice(0, 7);
      meta.appendChild(sha);
    }
    const relLink = document.createElement('a');
    relLink.href = b.releaseUrl;
    relLink.target = '_blank';
    relLink.rel = 'noopener';
    relLink.textContent = 'release';
    meta.appendChild(relLink);
    li.appendChild(meta);

    // ---- body: QR + actions ----
    const body = document.createElement('div');
    body.className = 'card-body';

    const qr = document.createElement('div');
    qr.className = 'card-qr';
    if (b.hasApk) {
      qr.innerHTML = makeQr(b.downloadUrl);
    } else {
      qr.style.display = 'none';
    }
    body.appendChild(qr);

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const dl = document.createElement('a');
    dl.className = 'btn btn-primary';
    dl.href = b.downloadUrl;
    dl.textContent = b.hasApk ? 'Download APK' : 'View release';
    actions.appendChild(dl);

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn';
    copy.textContent = 'Copy link';
    copy.addEventListener('click', function () {
      copyToClipboard(b.downloadUrl, copy);
    });
    actions.appendChild(copy);

    body.appendChild(actions);
    li.appendChild(body);

    return li;
  }

  // ---------- helpers ----------

  function makeQr(value) {
    if (typeof qrcode !== 'function') {
      return '';
    }
    // typeNumber: 0 = auto-pick smallest size that fits the data; M error
    // correction is the sweet spot for short URLs printed/displayed small.
    const q = qrcode(0, 'M');
    q.addData(value);
    q.make();
    // 2px per module is plenty when the container is 96px wide.
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }

  function copyToClipboard(text, btn) {
    const restore = btn.textContent;
    const restoreClass = btn.className;
    function flash(msg) {
      btn.textContent = msg;
      btn.className = restoreClass + ' btn-toast';
      setTimeout(function () {
        btn.textContent = restore;
        btn.className = restoreClass;
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          flash('Copied');
        },
        function () {
          flash('Copy failed');
        },
      );
    } else {
      flash('Clipboard unavailable');
    }
  }

  function relativeTime(date) {
    const now = Date.now();
    const diffSec = Math.floor((now - date.getTime()) / 1000);
    if (diffSec < 60) return diffSec + 's ago';
    const min = Math.floor(diffSec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const day = Math.floor(hr / 24);
    if (day < 30) return day + 'd ago';
    return date.toISOString().slice(0, 10);
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function showError(msg) {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = msg;
  }
})();
