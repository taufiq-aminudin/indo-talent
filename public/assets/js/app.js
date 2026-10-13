(() => {
  const $ = (s) => document.querySelector(s);
  const grid = $('#jobGrid'); if (!grid) return;
  const search = $('#searchInput'), category = $('#categoryFilter'), type = $('#typeFilter');
  const dialog = $('#jobDialog'), dialogContent = $('#dialogContent');
  let jobs = [];

  const escapeHTML = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel = (d) => {
    if(!d) return 'Tanggal tidak tersedia';
    const dt = new Date(`${d}T00:00:00`);
    return Number.isNaN(dt.getTime()) ? d : new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(dt);
  };
  const posterClass = (i) => `poster-${(i % 4)+1}`;

  function posterMarkup(job, i, large=false) {
    if(job.poster && /^https?:\/\//i.test(job.poster)) {
      return `<div class="job-poster ${posterClass(i)}" style="padding:0"><img src="${escapeHTML(job.poster)}" alt="Poster ${escapeHTML(job.title)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>`;
    }
    return `<div class="${large ? 'dialog-poster' : 'job-poster ' + posterClass(i)}">
      <span class="poster-top">INDO-TALENT / INFORMASI KARIER</span>
      <span class="poster-pattern"></span>
      <h2>${escapeHTML(job.title)}</h2>
      <div class="poster-bottom">
        <span>${escapeHTML(job.category||'LOWONGAN KERJA').toUpperCase()}</span>
        <span>PELUANG KERJA ↗</span>
      </div>
    </div>`;
  }

  function card(job, i) {
    const closed = job.status === 'closed' || (job.deadline && new Date(`${job.deadline}T23:59:59`) < new Date());
    return `<article class="job-card">
      ${posterMarkup(job, i)}
      <div class="job-card-body">
        <div class="job-meta">
          <span class="job-category">${escapeHTML(job.category||'Lainnya')}</span>
          <span class="job-status ${closed ? 'closed' : ''}">${closed ? 'Ditutup' : 'Informasi lowongan'}</span>
        </div>
        <h3>${escapeHTML(job.title)}</h3>
        <div class="company-line">${escapeHTML(job.company||'Perusahaan tidak dicantumkan')}</div>
        <div class="job-location">⌖ &nbsp;${escapeHTML(job.location||'Lokasi tidak dicantumkan')} · ${escapeHTML(job.jobType||'Tipe kerja tidak dicantumkan')}</div>
        <p class="job-caption">${escapeHTML(job.caption||'Buka detail untuk membaca informasi lowongan.')}</p>
        <div class="job-card-footer">
          <span class="job-date">Dipublikasikan ${escapeHTML(dateLabel(job.publishedAt))}</span>
          <button class="text-action" type="button" data-open="${escapeHTML(job.id)}">Detail <span>↗</span></button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const q = search.value.trim().toLowerCase(), cat = category.value, typ = type.value;
    const hasFilter = Boolean(q || cat || typ);

    const filtered = jobs.filter(j => {
      const hay = [j.title, j.company, j.location, j.category, j.caption, j.description].join(' ').toLowerCase();
      const closed = j.status === 'closed' || (j.deadline && new Date(`${jobDeadline(j)}`) < new Date());
      return (!q || hay.includes(q)) && (!cat || j.category === cat) && (!typ || j.jobType === typ) && !closed;
    });

    function jobDeadline(j) {
      return j.deadline ? `${j.deadline}T23:59:59` : '';
    }

    grid.innerHTML = filtered.length ? filtered.map(j => card(j, jobs.indexOf(j))).join('') : '';
    $('#resultCount').textContent = `${filtered.length} lowongan tersedia`;

    const emptyState = $('#emptyState');
    if (emptyState) {
      if (filtered.length === 0) {
        emptyState.hidden = false;
        grid.hidden = true;
        const emptyTitle = emptyState.querySelector('h3');
        const emptyDesc = emptyState.querySelector('p');
        const emptyResetBtn = $('#emptyReset');

        if (jobs.length === 0) {
          if (emptyTitle) emptyTitle.textContent = 'Belum ada lowongan yang tersedia';
          if (emptyDesc) emptyDesc.innerHTML = 'Saat ini belum ada lowongan kerja aktif.<br><a href="admin.html" style="color:#1c5947;font-weight:700;text-decoration:underline;">Masuk ke Panel Admin</a> untuk menambahkan lowongan baru.';
          if (emptyResetBtn) emptyResetBtn.style.display = 'none';
        } else {
          if (emptyTitle) emptyTitle.textContent = 'Belum ada lowongan yang cocok';
          if (emptyDesc) emptyDesc.textContent = 'Coba kata kunci atau filter yang berbeda.';
          if (emptyResetBtn) emptyResetBtn.style.display = hasFilter ? 'inline-flex' : 'none';
        }
      } else {
        emptyState.hidden = true;
        grid.hidden = false;
      }
    }

    grid.querySelectorAll('[data-open]').forEach(b => {
      b.addEventListener('click', () => openJob(b.dataset.open));
    });
  }

  function openJob(id) {
    const j = jobs.find(x => x.id === id);
    if (!j) return;
    const closed = j.status === 'closed' || (j.deadline && new Date(`${j.deadline}T23:59:59`) < new Date());
    const apply = j.applicationUrl && /^https?:\/\//i.test(j.applicationUrl)
      ? `<a class="button-dark" href="${escapeHTML(j.applicationUrl)}" target="_blank" rel="noopener noreferrer">Daftar melalui kanal resmi ↗</a>`
      : '';
    const email = j.applicationEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(j.applicationEmail)
      ? `<a class="button-outline" href="mailto:${escapeHTML(j.applicationEmail)}?subject=${encodeURIComponent('Lamaran - ' + j.title)}">Kirim email ↗</a>`
      : '';
    const source = j.sourceUrl && /^https?:\/\//i.test(j.sourceUrl)
      ? `<p class="dialog-source">Sumber: <a href="${escapeHTML(j.sourceUrl)}" target="_blank" rel="noopener noreferrer">Lihat pengumuman asli ↗</a></p>`
      : '';

    const shareSlug = j.slug || j.id;
    const shareUrl = `${window.location.origin}${window.location.pathname}#job-${encodeURIComponent(shareSlug)}`;
    const shareTitle = `${j.title} di ${j.company} — Indo-Talent`;
    const shareText = `Lowongan Kerja: ${j.title} di ${j.company} (${j.location}). Baca persyaratan dan cara mendaftar:`;

    const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    const tgLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    const inLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    const xLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const fbLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    const emailLink = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
    const canNativeShare = typeof navigator.share === 'function';

    dialogContent.innerHTML = `
      ${posterMarkup(j, jobs.indexOf(j), true)}
      <div class="job-meta">
        <span class="job-category">${escapeHTML(j.category||'Lainnya')}</span>
        <span class="job-status ${closed ? 'closed' : ''}">${closed ? 'Ditutup' : 'Informasi lowongan'}</span>
      </div>
      <h2>${escapeHTML(j.title)}</h2>
      <p class="dialog-company">${escapeHTML(j.company)} · ${escapeHTML(j.location)} · ${escapeHTML(j.jobType||'')}</p>
      <p class="job-caption">${escapeHTML(j.caption||'')}</p>
      <h3>Detail pekerjaan</h3>
      <div class="dialog-description">${escapeHTML(j.description||'Informasi detail belum tersedia.')}</div>
      <p class="dialog-source">Dipublikasikan: ${escapeHTML(dateLabel(j.publishedAt))}${j.deadline ? ' · Batas lamaran: ' + escapeHTML(dateLabel(j.deadline)) : ''}</p>
      <div class="dialog-actions">
        ${!closed ? (apply + email || '<span class="job-status">Tautan pendaftaran belum tersedia. Verifikasi dengan sumber resmi.</span>') : '<span class="job-status closed">Informasi lowongan ini ditandai ditutup.</span>'}
      </div>

      <!-- SHARE FEATURE SECTION -->
      <div class="dialog-share-card">
        <div class="share-card-header">
          <span class="share-card-title">🔗 Bagikan Lowongan Ini</span>
          <span id="shareFeedback" class="share-feedback-pill" style="display:none">Tautan disalin! ✓</span>
        </div>
        <div class="share-copy-container">
          <input type="text" id="shareUrlInput" class="share-url-box" readonly value="${escapeHTML(shareUrl)}" aria-label="Tautan lowongan">
          <button type="button" id="copyShareBtn" class="share-copy-button" aria-label="Salin tautan">
            <span class="copy-text">Salin Tautan</span>
          </button>
        </div>
        <div class="share-social-label">Atau bagikan via media sosial:</div>
        <div class="share-social-grid">
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="share-network-btn wa" title="Bagikan ke WhatsApp">
            <span>💬</span> WhatsApp
          </a>
          <a href="${tgLink}" target="_blank" rel="noopener noreferrer" class="share-network-btn tg" title="Bagikan ke Telegram">
            <span>✈️</span> Telegram
          </a>
          <a href="${inLink}" target="_blank" rel="noopener noreferrer" class="share-network-btn in" title="Bagikan ke LinkedIn">
            <span>💼</span> LinkedIn
          </a>
          <a href="${xLink}" target="_blank" rel="noopener noreferrer" class="share-network-btn x" title="Bagikan ke X / Twitter">
            <span>𝕏</span> Twitter / X
          </a>
          <a href="${fbLink}" target="_blank" rel="noopener noreferrer" class="share-network-btn fb" title="Bagikan ke Facebook">
            <span>👥</span> Facebook
          </a>
          <a href="${emailLink}" class="share-network-btn email" title="Kirim via Email">
            <span>✉️</span> Email
          </a>
          ${canNativeShare ? `<button type="button" id="deviceShareBtn" class="share-network-btn native-device" title="Buka menu berbagi perangkat"><span>📱</span> Aplikasi Lain...</button>` : ''}
        </div>
      </div>

      ${source}
      <p class="dialog-source">Verifikasi persyaratan dan status lowongan sebelum melamar. Indo-Talent hanya menyediakan informasi.</p>
    `;

    if (typeof dialog.showModal === 'function') dialog.showModal();

    // Wire Copy Button
    const copyBtn = $('#copyShareBtn');
    const urlInput = $('#shareUrlInput');
    const feedback = $('#shareFeedback');

    if (copyBtn && urlInput) {
      copyBtn.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
          } else {
            urlInput.select();
            document.execCommand('copy');
          }
          copyBtn.classList.add('copied');
          copyBtn.querySelector('.copy-text').textContent = '✓ Disalin!';
          if (feedback) feedback.style.display = 'inline-block';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.querySelector('.copy-text').textContent = 'Salin Tautan';
            if (feedback) feedback.style.display = 'none';
          }, 2500);
        } catch (err) {
          urlInput.select();
          document.execCommand('copy');
          copyBtn.querySelector('.copy-text').textContent = '✓ Disalin!';
          setTimeout(() => {
            copyBtn.querySelector('.copy-text').textContent = 'Salin Tautan';
          }, 2500);
        }
      });

      urlInput.addEventListener('click', () => {
        urlInput.select();
      });
    }

    // Wire Device Share Button if present
    const deviceBtn = $('#deviceShareBtn');
    if (deviceBtn) {
      deviceBtn.addEventListener('click', async () => {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
          });
        } catch (err) {}
      });
    }

    // Update location hash without jumping
    try {
      history.replaceState(null, '', `#job-${encodeURIComponent(shareSlug)}`);
    } catch (e) {}
  }

  function populateFilters() {
    const cats = [...new Set(jobs.map(j => j.category).filter(Boolean))].sort();
    const types = [...new Set(jobs.map(j => j.jobType).filter(Boolean))].sort();
    category.innerHTML = '<option value="">Semua bidang</option>' + cats.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
    type.innerHTML = '<option value="">Semua tipe</option>' + types.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
  }

  function checkHashJob() {
    if (location.hash.startsWith('#job-')) {
      const slug = decodeURIComponent(location.hash.slice(5));
      const j = jobs.find(x => x.slug === slug || x.id === slug);
      if (j) openJob(j.id);
    }
  }

  fetch('/api/jobs?t=' + Date.now())
    .then(r => {
      if (!r.ok) return fetch('jobs.json?t=' + Date.now()).then(res => res.json());
      return r.json();
    })
    .then(data => {
      jobs = Array.isArray(data) ? data : [];
      populateFilters();
      render();
      checkHashJob();
    })
    .catch(() => {
      grid.innerHTML = '';
      jobs = [];
      render();
    });

  [search, category, type].forEach(el => el.addEventListener('input', render));

  function reset() {
    search.value = '';
    category.value = '';
    type.value = '';
    render();
  }

  $('#resetFilters').addEventListener('click', reset);
  const emptyReset = $('#emptyReset');
  if (emptyReset) emptyReset.addEventListener('click', reset);

  function closeDialog() {
    dialog.close();
    if (location.hash.startsWith('#job-')) {
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (e) {}
    }
  }

  $('#dialogClose').addEventListener('click', closeDialog);
  dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(); });

  window.addEventListener('hashchange', checkHashJob);
  $('#year').textContent = new Date().getFullYear();
})();

