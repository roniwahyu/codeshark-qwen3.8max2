import type { AgeId } from "../lib/storage";
import type { Lang } from "../lib/highlight";

/* ============ KONFIGURASI ADAPTIF PER KELOMPOK USIA ============ */
export interface AgeCfg {
  id: AgeId;
  label: string;
  range: string;
  desc: string;
  accent: string;
  threatRate: number; // kenaikan ancaman per 100ms
  missPenalty: number; // ancaman per salah ketik
  relief: number; // penurunan ancaman saat 1 baris selesai
  hints: boolean; // tampilkan petunjuk karakter berikutnya
  arenaSize: string; // kelas ukuran font arena
  starWpm: number; // ambang WPM minimum untuk bintang 3 (bersama akurasi ≥95%)
  cheers: string[];
}

export const AGE_GROUPS: Record<AgeId, AgeCfg> = {
  junior: {
    id: "junior",
    label: "Kadet Samudra",
    range: "10–13 tahun",
    desc: "Santai & terbimbing — hiu berenang pelan, ada petunjuk ketik.",
    accent: "#ffc247",
    threatRate: 0.16,
    missPenalty: 5,
    relief: 28,
    hints: true,
    arenaSize: "text-lg md:text-xl",
    starWpm: 12,
    cheers: ["Wih, keren!", "Kamu jago!", "Mantap sekali!", "Terus begitu!", "Luar biasa!"],
  },
  teen: {
    id: "teen",
    label: "Ranger Laut",
    range: "13–15 tahun",
    desc: "Tempo sedang — tantangan mulai terasa, fokusmu diuji.",
    accent: "#2ee6c8",
    threatRate: 0.24,
    missPenalty: 7,
    relief: 24,
    hints: true,
    arenaSize: "text-base md:text-lg",
    starWpm: 20,
    cheers: ["Nice!", "Gas terus!", "Combo mantap!", "Keren banget!", "Jernih!"],
  },
  senior: {
    id: "senior",
    label: "Vanguard Arus",
    range: "16–19 tahun",
    desc: "Tempo cepat — hiu lebih agresif, tanpa petunjuk ketik.",
    accent: "#45c6ff",
    threatRate: 0.32,
    missPenalty: 8,
    relief: 21,
    hints: false,
    arenaSize: "text-base md:text-lg",
    starWpm: 28,
    cheers: ["Solid!", "Presisi!", "Bersih!", "Efisien!", "On fire!"],
  },
  academy: {
    id: "academy",
    label: "Master Palung",
    range: "Mahasiswa / Umum",
    desc: "Mode ekstrem — arus deras, kesalahan mahal, ritme tinggi.",
    accent: "#8be9fd",
    threatRate: 0.4,
    missPenalty: 9,
    relief: 18,
    hints: false,
    arenaSize: "text-sm md:text-base",
    starWpm: 35,
    cheers: ["Clean code!", "Efisien.", "Terstruktur.", "Rapi sekali.", "Level dewa."],
  },
};

/* ============ KONTEN PEMBELAJARAN ============ */
export type Block =
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  | { t: "code"; lang: Lang; code: string; caption?: string }
  | { t: "callout"; tone: "tip" | "warn" | "fun"; title: string; text: string }
  | { t: "quiz"; q: string; options: string[]; answer: number; explain: string };

export interface Slide {
  kicker: string;
  title: string;
  blocks: Block[];
}

export interface ModuleDef {
  id: string;
  num: number;
  title: string;
  subtitle: string;
  icon: "tag" | "brush" | "bolt";
  color: string;
  lang: Lang;
  slides: Slide[];
  practiceTitle: string;
  practiceIntro: string;
  code: string;
  preview: (typed: string) => string;
}

const CONSOLE_SHIM = `(function(){function s(t,a){try{parent.postMessage({__cs:true,type:t,text:a.map(function(x){try{return typeof x==="object"?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(" ")},"*")}catch(e){}}["log","info","warn","error"].forEach(function(m){console[m]=function(){s(m,[].slice.call(arguments))}});window.onerror=function(m){s("error",[m])};})();`;

const htmlCode = `<!DOCTYPE html>
<html>
  <head>
    <title>Kartu Nama Raka</title>
  </head>
  <body>
    <h1>Halo, aku Raka!</h1>
    <p>Aku sedang belajar HTML.</p>
    <h2>Hobiku:</h2>
    <ul>
      <li>Berenang</li>
      <li>Membaca komik</li>
      <li>Main game</li>
    </ul>
    <p>Salam kenal, ya!</p>
  </body>
</html>`;

const cssCode = `body {
  background: #072a3f;
  color: #eaf6ff;
  font-family: sans-serif;
  text-align: center;
}
h1 {
  color: #ffc247;
}
p {
  color: #9ad7f5;
}
button {
  background: #2ee6c8;
  color: #04222b;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
}`;

const jsCode = `const tombol = document.querySelector("button");
const pesan = document.querySelector("#pesan");
let jumlah = 0;

tombol.addEventListener("click", function () {
  jumlah = jumlah + 1;
  pesan.textContent = "Tombol diklik " + jumlah + " kali!";
  console.log("Klik ke-" + jumlah);
});

console.log("Halo dari JavaScript!");`;

export const MODULES: ModuleDef[] = [
  {
    id: "html",
    num: 1,
    title: "HTML Dasar",
    subtitle: "Kerangka Tulang Halaman Web",
    icon: "tag",
    color: "#4dd9c0",
    lang: "html",
    practiceTitle: "Misi Ketik: Kartu Nama",
    practiceIntro:
      "Ketik ulang kode halaman kartu nama di bawah ini persis seperti aslinya. Perhatikan huruf besar, tanda kutip, dan tag penutup!",
    code: htmlCode,
    preview: (typed) => typed,
    slides: [
      {
        kicker: "Materi 1 • Fondasi",
        title: "Apa itu HTML?",
        blocks: [
          {
            t: "p",
            text: "HTML (HyperText Markup Language) adalah kerangka dari setiap halaman web. Sebelum sebuah halaman punya warna atau bisa diklik, HTML menyusun strukturnya lebih dulu: mana judul, mana paragraf, mana daftar, mana gambar.",
          },
          {
            t: "p",
            text: "HTML ditulis memakai tag — perintah pendek yang dibungkus tanda kurung sudut. Sebagian besar tag berpasangan: ada tag pembuka dan tag penutup yang memakai garis miring.",
          },
          {
            t: "code",
            lang: "html",
            code: `<h1>Judul Halaman</h1>\n<p>Ini paragraf pertamaku.</p>`,
            caption: "Tag pembuka <h1> … dan tag penutup </h1>",
          },
          {
            t: "callout",
            tone: "fun",
            title: "Analogi mudah",
            text: "Kalau website adalah tubuh manusia: HTML itu tulangnya, CSS itu kulit dan bajunya, JavaScript itu otot yang membuatnya bergerak.",
          },
        ],
      },
      {
        kicker: "Materi 2 • Struktur",
        title: "Struktur Dasar Halaman",
        blocks: [
          {
            t: "p",
            text: "Setiap halaman HTML punya bentuk dasar yang sama. <!DOCTYPE html> memberi tahu browser bahwa ini halaman HTML modern, <html> membungkus segalanya, <head> menyimpan info yang tak terlihat seperti judul tab, dan <body> berisi semua yang tampil di layar.",
          },
          {
            t: "code",
            lang: "html",
            code: `<!DOCTYPE html>\n<html>\n  <head>\n    <title>Judul Tab</title>\n  </head>\n  <body>\n    <h1>Halo Dunia!</h1>\n  </body>\n</html>`,
            caption: "Kerangka wajib setiap halaman HTML",
          },
          {
            t: "list",
            items: [
              "<head> = otak halaman: judul tab dan pengaturan, tidak terlihat pengunjung.",
              "<body> = tubuh halaman: teks, gambar, tombol — semua yang terlihat.",
              "Indentasi (spasi di awal baris) tidak wajib, tapi bikin kode rapi dan mudah dibaca.",
            ],
          },
          {
            t: "callout",
            tone: "tip",
            title: "Tips pro",
            text: "Selalu tutup tag yang kamu buka. Satu </p> yang hilang bisa bikin tampilan berantakan!",
          },
        ],
      },
      {
        kicker: "Materi 3 • Tag Penting",
        title: "Tag yang Wajib Kamu Kenal",
        blocks: [
          {
            t: "list",
            items: [
              "<h1> sampai <h6> — judul, dari yang paling besar sampai paling kecil.",
              "<p> — paragraf teks.",
              "<ul> dan <li> — daftar poin (bullet list).",
              "<a> — link ke halaman lain, pakai atribut href.",
              "<img> — gambar, pakai atribut src.",
              "<button> — tombol yang bisa diklik.",
            ],
          },
          {
            t: "code",
            lang: "html",
            code: `<h2>Hobiku</h2>\n<ul>\n  <li>Berenang</li>\n  <li>Membaca</li>\n</ul>\n<a href="https://example.com">Situs favoritku</a>`,
            caption: "Atribut = info tambahan di dalam tag pembuka",
          },
          {
            t: "quiz",
            q: "Tag mana yang menghasilkan judul paling besar?",
            options: ["<p>", "<h1>", "<li>", "<title>"],
            answer: 1,
            explain: "<h1> adalah judul level 1 — paling besar dan paling penting. <h2> dan seterusnya makin kecil.",
          },
        ],
      },
      {
        kicker: "Materi 4 • Teks & Media",
        title: "Teks, Gambar, dan Link",
        blocks: [
          {
            t: "p",
            text: "Selain judul dan paragraf, ada tag untuk menekankan teks: <strong> untuk tebal (penting!) dan <em> untuk miring (penekanan). Link dibuat dengan tag <a> yang memakai atribut href — mengkliknya membawa pengunjung ke halaman lain. Gambar dipasang dengan <img> yang punya atribut src sebagai alamat file, dan alt sebagai deskripsi bila gambar gagal dimuat.",
          },
          {
            t: "code",
            lang: "html",
            code: `<p>Hati-hati, air ini <strong>dalam</strong>!</p>\n<a href="https://developer.mozilla.org">Belajar lagi di MDN</a>\n<img src="hiu.png" alt="Ilustrasi hiu" />`,
            caption: "<img> tidak butuh tag penutup — disebut tag tunggal",
          },
          {
            t: "callout",
            tone: "tip",
            title: "Jangan lupa alt",
            text: "Isi selalu atribut alt pada gambar. Selain tampil saat gambar gagal dimuat, alt dibaca oleh pembaca layar untuk teman-teman tunanetra.",
          },
          {
            t: "quiz",
            q: "Atribut apa yang menentukan alamat tujuan sebuah link <a>?",
            options: ["src", "link", "href", "url"],
            answer: 2,
            explain: "<a> memakai href (hypertext reference) untuk alamat tujuan, sedangkan <img> memakai src.",
          },
        ],
      },
      {
        kicker: "Materi 5 • Formulir",
        title: "Formulir: Input & Tombol",
        blocks: [
          {
            t: "p",
            text: "Formulir adalah cara halaman web bertanya kepada pengunjung: nama, pesan, atau pilihan. <form> membungkus seluruh isian, <input> adalah kolom yang bisa diketik, dan <label> memberi nama pada kolom supaya mudah diklik dan terbaca alat bantu.",
          },
          {
            t: "code",
            lang: "html",
            code: `<form>\n  <label for="nama">Nama:</label>\n  <input id="nama" type="text" placeholder="Tulis namamu" />\n  <button type="submit">Kirim</button>\n</form>`,
            caption: 'type="text", "checkbox", "email", "password" — banyak jenis input',
          },
          {
            t: "list",
            items: [
              'type="text" → kolom teks satu baris.',
              'type="checkbox" → kotak centang, boleh pilih banyak.',
              'type="radio" → bulatan pilihan, hanya boleh satu.',
              "placeholder → teks samar panduan sebelum mengetik.",
            ],
          },
          {
            t: "callout",
            tone: "warn",
            title: "Hati-hati!",
            text: "Setiap <input> sebaiknya punya <label> dengan for yang sama dengan id input-nya. Tanpa itu, formulir sulit dipakai dan membingungkan.",
          },
          {
            t: "quiz",
            q: "Tag mana yang membuat kolom isian yang bisa diketik pengunjung?",
            options: ["<box>", "<input>", "<type>", "<field>"],
            answer: 1,
            explain: "<input> adalah kolom isian. Jenisnya diatur lewat atribut type, misalnya text atau email.",
          },
        ],
      },
    ],
  },
  {
    id: "css",
    num: 2,
    title: "CSS Dasar",
    subtitle: "Dandani Halaman Jadi Cantik",
    icon: "brush",
    color: "#ffc247",
    lang: "css",
    practiceTitle: "Misi Ketik: Dandani Halaman",
    practiceIntro:
      "Ketik ulang aturan CSS ini untuk mendandani sebuah halaman. Perhatikan titik dua, titik koma, dan tanda kurung kurawal!",
    code: cssCode,
    preview: (typed) =>
      `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${typed}\n</style>\n</head>\n<body>\n<h1>Halaman Pertamaku</h1>\n<p>Halaman ini jadi cantik karena CSS!</p>\n<button>Tombol Keren</button>\n<p>Coba ganti-ganti nilainya nanti.</p>\n</body>\n</html>`,
    slides: [
      {
        kicker: "Materi 1 • Gaya",
        title: "Apa itu CSS?",
        blocks: [
          {
            t: "p",
            text: "CSS (Cascading Style Sheets) adalah makeup dan lemari pakaian halaman web. Warna, jenis huruf, jarak, sampai bentuk sudut — semua diatur CSS. Kerangka HTML yang polos langsung jadi menarik.",
          },
          {
            t: "p",
            text: "Bentuk dasar aturan CSS: pilih elemennya (selector), lalu tulis properti dan nilai di dalam kurung kurawal.",
          },
          {
            t: "code",
            lang: "css",
            code: `h1 {\n  color: #ffc247;\n  font-size: 32px;\n}`,
            caption: "Selector h1 → dua properti: color dan font-size",
          },
          {
            t: "callout",
            tone: "fun",
            title: "Bayangkan begini",
            text: "HTML tanpa CSS itu seperti roti tawar — bisa dimakan, tapi hambar. CSS adalah meses coklatnya!",
          },
        ],
      },
      {
        kicker: "Materi 2 • Aturan",
        title: "Selector, Properti, Nilai",
        blocks: [
          {
            t: "p",
            text: "Selector memilih elemen mana yang mau dihias. Properti menentukan apa yang diubah. Nilai menentukan hasilnya. Satu selector bisa punya banyak properti, dan satu file CSS bisa mendandani seluruh halaman.",
          },
          {
            t: "code",
            lang: "css",
            code: `body {\n  background: #072a3f;\n  color: #eaf6ff;\n  text-align: center;\n}`,
            caption: "body = seluruh isi halaman",
          },
          {
            t: "list",
            items: [
              "color → warna teks.",
              "background → warna atau gambar latar.",
              "padding → jarak antara isi dan tepi elemen.",
              "border-radius → membuat sudut melengkung.",
              "text-align → rata kiri, tengah, atau kanan.",
            ],
          },
        ],
      },
      {
        kicker: "Materi 3 • Warna & Kotak",
        title: "Warna dan Kotak",
        blocks: [
          {
            t: "p",
            text: "Warna bisa ditulis dengan nama Inggris seperti red, atau kode HEX seperti #ff6b57. Dan satu rahasia besar: setiap elemen HTML sebenarnya adalah kotak — CSS memberi kamu kuas untuk menghias kotak itu sebebas-bebasnya.",
          },
          {
            t: "code",
            lang: "css",
            code: `button {\n  background: #2ee6c8;\n  color: #04222b;\n  border: none;\n  border-radius: 10px;\n  padding: 10px 20px;\n}`,
            caption: "Tombol kotak jadi pil yang cantik",
          },
          {
            t: "quiz",
            q: "Properti mana yang mengubah warna TEKS?",
            options: ["font-color", "color", "text-style", "warna"],
            answer: 1,
            explain: "Dalam CSS, warna teks cukup ditulis color. Warna latar memakai background.",
          },
        ],
      },
    ],
  },
  {
    id: "js",
    num: 3,
    title: "JavaScript Dasar",
    subtitle: "Buat Halamanmu Hidup & Interaktif",
    icon: "bolt",
    color: "#45c6ff",
    lang: "js",
    practiceTitle: "Misi Ketik: Counter Klik",
    practiceIntro:
      "Ketik ulang kode JavaScript pembuat counter klik ini. Perhatikan tanda kutip, kurung, dan titik koma — JS itu sensitif!",
    code: jsCode,
    preview: (typed) =>
      `<!DOCTYPE html>\n<html>\n<head>\n<style>\nbody{font-family:sans-serif;background:#0b2036;color:#eaf6ff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;gap:14px}\nbutton{background:#2ee6c8;color:#04222b;border:none;border-radius:12px;padding:12px 26px;font-size:17px;font-weight:bold;cursor:pointer}\nbutton:hover{filter:brightness(1.1)}\n#pesan{font-size:18px;color:#9ad7f5;min-height:24px}\nh2{margin:0}\n</style>\n</head>\n<body>\n<h2>Counter Klik</h2>\n<p id="pesan">Belum ada klik.</p>\n<button>Klik Aku!</button>\n<script>${CONSOLE_SHIM}\n${typed}\n<\/script>\n</body>\n</html>`,
    slides: [
      {
        kicker: "Materi 1 • Logika",
        title: "Apa itu JavaScript?",
        blocks: [
          {
            t: "p",
            text: "JavaScript (JS) adalah otot dan otak halaman web. Dengan JS, halaman bisa bereaksi terhadap klik, menghitung, memvalidasi formulir, bahkan mengambil data dari internet — tanpa perlu memuat ulang halaman.",
          },
          {
            t: "list",
            items: [
              "HTML = isi dan struktur.",
              "CSS = tampilan dan gaya.",
              "JavaScript = perilaku dan logika.",
            ],
          },
          {
            t: "callout",
            tone: "fun",
            title: "Di sekitarmu",
            text: "Setiap kali kamu menekan tombol like dan angkanya bertambah — itu JavaScript yang bekerja.",
          },
        ],
      },
      {
        kicker: "Materi 2 • Variabel",
        title: "Variabel dan console.log",
        blocks: [
          {
            t: "p",
            text: "Variabel adalah kotak penyimpan data yang diberi nama. Pakai const untuk nilai yang tetap, dan let untuk nilai yang boleh berubah. console.log() mencetak nilai ke konsol browser — senjata debug andalan semua programmer.",
          },
          {
            t: "code",
            lang: "js",
            code: `const nama = "Raka";\nlet skor = 0;\n\nskor = skor + 10;\nconsole.log("Halo, " + nama);\nconsole.log("Skor: " + skor);`,
            caption: "Tanda + menggabungkan teks dan nilai",
          },
          {
            t: "callout",
            tone: "tip",
            title: "Kebiasaan bagus",
            text: "Beri nama variabel yang jelas: skor lebih baik daripada s. Kode dibaca manusia, bukan cuma mesin.",
          },
        ],
      },
      {
        kicker: "Materi 3 • Event",
        title: "Event: Saat Sesuatu Terjadi",
        blocks: [
          {
            t: "p",
            text: "Event adalah sinyal bahwa sesuatu terjadi: klik, tekan tombol keyboard, atau halaman selesai dimuat. Dengan addEventListener, kita memasang fungsi yang otomatis berjalan saat event itu terjadi.",
          },
          {
            t: "code",
            lang: "js",
            code: `const tombol = document.querySelector("button");\n\ntombol.addEventListener("click", function () {\n  console.log("Tombol diklik!");\n});`,
            caption: "querySelector mencari elemen, addEventListener mendengarkan",
          },
          {
            t: "quiz",
            q: "Kata kunci mana untuk membuat variabel yang nilainya boleh berubah?",
            options: ["const", "static", "let", "fix"],
            answer: 2,
            explain: "let = fleksibel, bisa diubah. const = konstan, tidak bisa diisi ulang.",
          },
        ],
      },
    ],
  },
];

export const getModule = (id: string): ModuleDef =>
  MODULES.find((m) => m.id === id) ?? MODULES[0];
