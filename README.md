# Indo-Talent — Job Information Portal

Paket frontend statis untuk konsep baru Indo-Talent: pusat informasi lowongan kerja yang mengarahkan pengunjung ke email/formulir/portal pendaftaran resmi. Tidak ada ATS, screening AI, akun kandidat, atau unggah CV.

## Struktur
- `public/index.html` — landing page/feed lowongan
- `public/about.html` — tentang dan disclaimer
- `public/admin.html` — alat lokal untuk mengedit dan mengekspor data lowongan JSON
- `public/jobs.json` — data lowongan contoh
- `public/assets/` — CSS dan JavaScript
- `public/robots.txt`, `public/sitemap.xml`, `public/ads.txt`

## Preview lokal
Buka `public/index.html` langsung di browser untuk tampilan dasar. Untuk hasil yang lebih akurat, jalankan server statis dari folder `public`, misalnya:

```bash
python -m http.server 8080 --directory public
```

Kemudian buka `http://localhost:8080`.

## Deployment
Unggah isi folder `public/` ke hosting static site (misalnya Cloudflare Pages atau Netlify). Jika repository lama memakai Cloudflare Worker + D1, jangan mengganti konfigurasi Worker/database lama secara membabi buta; audit konfigurasi deployment terlebih dahulu.

## Mengelola postingan
Buka `/admin.html`. Halaman admin ini adalah editor lokal tanpa login/backend: perubahan tidak otomatis tersimpan ke server. Unduh `jobs.json` setelah mengedit, lalu ganti `public/jobs.json` di repository dan deploy ulang. Jangan memasukkan data kandidat atau informasi pribadi.

## Sebelum publikasi
1. Ganti semua contoh lowongan dengan lowongan yang benar-benar terverifikasi.
2. Pastikan tautan pendaftaran dan email berasal dari sumber resmi.
3. Ubah `sitemap.xml` ke URL kanonis yang benar jika domain berubah.
4. Isi `ads.txt` hanya dengan entri publisher AdSense resmi milik Anda.
5. Tambahkan analitik dengan persetujuan/konfigurasi privasi yang sesuai jika diperlukan.
