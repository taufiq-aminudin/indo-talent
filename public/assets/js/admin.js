(() => {
  const $ = s => document.querySelector(s);
  let jobs = [];
  let authToken = localStorage.getItem('indotalent_admin_token') || null;

  const fields = ['id', 'title', 'company', 'location', 'category', 'jobType', 'status', 'poster', 'caption', 'description', 'applicationUrl', 'applicationEmail', 'deadline', 'publishedAt', 'sourceUrl'];
  const ids = ['jobId', 'title', 'company', 'location', 'category', 'jobType', 'status', 'poster', 'caption', 'description', 'applicationUrl', 'applicationEmail', 'deadline', 'publishedAt', 'sourceUrl'];

  const today = () => new Date().toISOString().slice(0, 10);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function setMsg(text, type = 'success') {
    const el = $('#adminMessage');
    if (!el) return;
    if (!text) {
      el.textContent = '';
      el.className = 'admin-message';
      return;
    }
    el.textContent = text;
    el.className = `admin-message ${type}`;
    setTimeout(() => {
      if (el.textContent === text) {
        el.textContent = '';
        el.className = 'admin-message';
      }
    }, 6000);
  }

  function val(k) {
    const el = $('#' + k);
    return el ? el.value.trim() : '';
  }

  function slugify(s) {
    return s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90);
  }

  // --- Auth Management ---
  async function checkAuth() {
    if (!authToken) {
      showLoginView();
      return;
    }

    try {
      const res = await fetch('/api/auth/check', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        showDashboardView(data.email);
        loadJobs();
      } else {
        localStorage.removeItem('indotalent_admin_token');
        authToken = null;
        showLoginView();
      }
    } catch (err) {
      showLoginView();
    }
  }

  function showLoginView() {
    $('#loginSection').style.display = 'flex';
    $('#dashboardSection').style.display = 'none';
    $('#navAdminInfo').style.display = 'none';
    const err = $('#loginError');
    if (err) err.hidden = true;
  }

  function showDashboardView(email) {
    $('#loginSection').style.display = 'none';
    $('#dashboardSection').style.display = 'block';
    $('#navAdminInfo').style.display = 'flex';
    $('#navAdminEmail').textContent = email || 'admin';
    $('#displayAdminEmail').textContent = email || 'admin';
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const errEl = $('#loginError');
    const submitBtn = $('#loginSubmit');

    errEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memverifikasi...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal.');
      }

      authToken = data.token;
      localStorage.setItem('indotalent_admin_token', authToken);
      showDashboardView(data.email);
      await loadJobs();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Masuk ke Panel <span>→</span>';
    }
  }

  async function handleLogout() {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('indotalent_admin_token');
    authToken = null;
    showLoginView();
  }

  // --- Job Form & List Management ---
  function clearForm() {
    $('#jobForm').reset();
    $('#jobId').value = '';
    $('#publishedAt').value = today();
    $('#formTitle').textContent = 'Tambah Lowongan';
    $('#saveJobBtn').textContent = 'Simpan Lowongan ke Server';
  }

  function loadForm(j) {
    ids.forEach((id, i) => {
      const el = $('#' + id);
      if (el) el.value = j[fields[i]] || '';
    });
    $('#formTitle').textContent = 'Edit Lowongan: ' + j.title;
    $('#saveJobBtn').textContent = 'Perbarui Lowongan';
    window.scrollTo({ top: $('#dashboardSection').offsetTop + 80, behavior: 'smooth' });
  }

  async function loadJobs() {
    const listEl = $('#adminJobList');
    listEl.innerHTML = '<div class="admin-loading-jobs">Memuat data lowongan...</div>';

    try {
      const res = await fetch('/api/jobs?t=' + Date.now());
      if (!res.ok) throw new Error('Gagal memuat lowongan dari server');
      const data = await res.json();
      jobs = Array.isArray(data) ? data : [];
      renderJobs();
    } catch (err) {
      listEl.innerHTML = `<div class="admin-empty-jobs" style="color:#a4382e">Error: ${esc(err.message)}</div>`;
    }
  }

  function renderJobs() {
    $('#jobTotal').textContent = `${jobs.length} item`;
    const listEl = $('#adminJobList');

    if (!jobs.length) {
      listEl.innerHTML = '<div class="admin-empty-jobs">Belum ada lowongan kerja.<br>Gunakan form di samping untuk menambahkan lowongan pertama Anda.</div>';
      return;
    }

    listEl.innerHTML = jobs.map(j => `
      <article class="admin-job" data-id="${esc(j.id)}">
        <div>
          <h3>${esc(j.title)}</h3>
          <p><strong>${esc(j.company)}</strong> · ${esc(j.location)}</p>
          <p class="admin-job-meta-line">
            <span class="job-status ${j.status === 'closed' ? 'closed' : ''}">${j.status === 'closed' ? 'Ditutup' : 'Aktif'}</span>
            · ${esc(j.category || 'Umum')}
            · ${esc(j.jobType || 'Full-time')}
            · Dibuat: ${esc(j.publishedAt || '-')}
          </p>
        </div>
        <div class="admin-job-actions">
          <button type="button" class="edit-btn" data-edit="${esc(j.id)}">Edit</button>
          <button type="button" class="delete" data-delete="${esc(j.id)}">Hapus</button>
        </div>
      </article>
    `).join('');

    listEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const j = jobs.find(x => x.id === btn.dataset.edit);
        if (j) loadForm(j);
      });
    });

    listEl.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delete;
        const j = jobs.find(x => x.id === id);
        const title = j ? j.title : 'lowongan ini';
        if (confirm(`Apakah Anda yakin ingin menghapus lowongan “${title}”? Tindakan ini tidak dapat dibatalkan.`)) {
          deleteJob(id);
        }
      });
    });
  }

  async function saveJob(e) {
    e.preventDefault();
    const id = val('jobId') || `job-${Date.now()}`;
    const title = val('title');
    const company = val('company');
    const location = val('location');

    if (!title || !company || !location) {
      setMsg('Judul posisi, nama perusahaan, dan lokasi wajib diisi.', 'error');
      return;
    }

    const applicationUrl = val('applicationUrl');
    const sourceUrl = val('sourceUrl');
    const poster = val('poster');

    if (applicationUrl && !/^https?:\/\//i.test(applicationUrl)) {
      setMsg('URL pendaftaran resmi harus diawali http:// atau https://', 'error');
      return;
    }
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      setMsg('URL sumber informasi harus diawali http:// atau https://', 'error');
      return;
    }
    if (poster && !/^https?:\/\//i.test(poster)) {
      setMsg('URL poster harus diawali http:// atau https://', 'error');
      return;
    }

    const jobData = {
      id,
      title,
      company,
      location,
      category: val('category'),
      jobType: val('jobType') || 'Full-time',
      status: val('status') || 'active',
      poster,
      caption: val('caption'),
      description: val('description'),
      applicationUrl,
      applicationEmail: val('applicationEmail'),
      deadline: val('deadline'),
      publishedAt: val('publishedAt') || today(),
      sourceUrl,
      slug: slugify(title)
    };

    const submitBtn = $('#saveJobBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan ke server...';

    try {
      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(jobData)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Gagal menyimpan lowongan');
      }

      jobs = resData.jobs || [];
      renderJobs();
      clearForm();
      setMsg('✓ Lowongan berhasil disimpan ke server dan aktif di website!', 'success');
    } catch (err) {
      setMsg('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Simpan Lowongan ke Server';
    }
  }

  async function deleteJob(id) {
    try {
      const res = await fetch(`/api/admin/jobs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus lowongan');
      }

      jobs = data.jobs || [];
      renderJobs();
      setMsg('✓ Lowongan berhasil dihapus dari server.', 'success');
    } catch (err) {
      setMsg('Gagal menghapus: ' + err.message, 'error');
    }
  }

  // Event Listeners
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#logoutBtn').addEventListener('click', handleLogout);
  $('#dashboardLogoutBtn').addEventListener('click', handleLogout);

  $('#jobForm').addEventListener('submit', saveJob);
  $('#clearForm').addEventListener('click', clearForm);
  $('#newJob').addEventListener('click', () => {
    clearForm();
    window.scrollTo({ top: $('#dashboardSection').offsetTop + 80, behavior: 'smooth' });
  });

  $('#exportJobs').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(jobs, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jobs-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('Backup jobs.json berhasil diunduh.', 'success');
  });

  // Init
  clearForm();
  checkAuth();
})();
