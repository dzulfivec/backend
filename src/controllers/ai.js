// gemini.js
const { GoogleGenAI } = require("@google/genai");

// Ganti dengan API key kamu dari Google AI Studio
const ai = new GoogleGenAI({
  apiKey: "",
});

async function aimodel(text) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Ubah nama lengkap berikut agar lebih mudah diucapkan secara jelas dan alami oleh AI Text-to-Speech. Pecahlah nama menjadi bagian-bagian per suku kata atau per kata, dan ubah ejaan hanya jika diperlukan untuk memperbaiki pelafalan, tanpa mengubah makna atau identitas nama aslinya. jika nama awal terdiri dari lebih dari satu kata, maka pisahkan perkata dengan batasan tanda koma, barulah anda pecah sesuai pelafalan di setiap kata tersebut menjadi beberapa bagian (tidak harus, jika kata susah di ucapkan saja , baru lakukan pemecahan).  jangan Gunakan tanda baca seperti titik atau spasi antar bagian nama dan jangan gunakan karakter lainnya sperti - _, agar AI tidak membacanya terlalu cepat atau menyatu. jika nama terdiri dari 3 kata, maka coba filtering, apakah ada kata dalam nama yang susah untuk dieja, maka hapus kata tersebut dari nama.   Pastikan hasil akhir terdengar jelas, tidak membingungkan, dan tetap mempertahankan keindahan nama saat dibacakan oleh AI. Berikan hanya nama hasil olahan, tanpa penjelasan atau teks tambahan apa pun. Berikut nama nya : ${text}`,
  });
  console.log(response.text);

  return response.text
}

module.exports = { aimodel };
