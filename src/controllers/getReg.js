const express = require("express");
const router = express.Router();
const pool = require("../config/allDatabase");
const { aimodel } = require("./ai");

// Fungsi untuk ambil data lab berdasarkan no_rawat
async function getLabRequestByNoRawat(no_rawat) {
  const query = `
    SELECT 
        pl.noorder,
        pl.no_rawat,
        rp.no_rkm_medis,
        ps.nm_pasien,
        pl.tgl_permintaan,
        IF(pl.jam_permintaan = '00:00:00', '', pl.jam_permintaan) AS jam_permintaan,
        rp.kd_pj,
        pj.png_jawab,
        IF(pl.tgl_sampel = '0000-00-00', '', pl.tgl_sampel) AS tgl_sampel,
        IF(pl.jam_sampel = '00:00:00', '', pl.jam_sampel) AS jam_sampel,
        IF(pl.tgl_hasil = '0000-00-00', '', pl.tgl_hasil) AS tgl_hasil,
        IF(pl.jam_hasil = '00:00:00', '', pl.jam_hasil) AS jam_hasil,
        pl.dokter_perujuk,
        d.nm_dokter AS nama_dokter,
        d.nm_dokter AS nm_perujuk,
        p.nm_poli,
        pl.informasi_tambahan,
        pl.diagnosa_klinis,
        IFNULL(total.total_biaya, 0) AS total_biaya,
        IFNULL(total.total_biaya, 0) AS total_biaya2,
        IFNULL(total.tarif_dokter, 0) AS tarif_dokter,
        IFNULL(total.tarif_petugas, 0) AS tarif_petugas
    FROM permintaan_lab pl
    INNER JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
    INNER JOIN pasien ps ON rp.no_rkm_medis = ps.no_rkm_medis
    INNER JOIN dokter d ON pl.dokter_perujuk = d.kd_dokter
    INNER JOIN poliklinik p ON rp.kd_poli = p.kd_poli
    INNER JOIN penjab pj ON rp.kd_pj = pj.kd_pj
    LEFT JOIN (
        SELECT 
            noorder,
            SUM(jpl.total_byr) AS total_biaya,
            SUM(jpl.tarif_perujuk) AS tarif_dokter,
            SUM(jpl.tarif_tindakan_petugas) AS tarif_petugas
        FROM permintaan_pemeriksaan_lab ppl
        INNER JOIN jns_perawatan_lab jpl ON ppl.kd_jenis_prw = jpl.kd_jenis_prw
        GROUP BY noorder
    ) AS total ON total.noorder = pl.noorder
    WHERE pl.status = 'ralan' 
    AND pl.no_rawat = ?
    ORDER BY pl.tgl_permintaan DESC, pl.jam_permintaan DESC;
  `;

  return new Promise((resolve, reject) => {
    pool.query(query, [no_rawat], (err, result) => {
      if (err) {
        console.error("Error query lab:", err);
        return reject(err);
      }
      resolve(result);
    });
  });
}

router.post("/", async function (req, res) {
  const { tgl_awal, tgl_akhir, search_text } = req.body;
  console.log(tgl_awal, tgl_akhir);
  if (!tgl_awal || !tgl_akhir) {
    return res.status(400).send("Tanggal awal dan akhir wajib diisi.");
  }

  const stringQuery = `
    SELECT 
      reg_periksa.no_reg, 
      reg_periksa.no_rawat, 
      reg_periksa.tgl_registrasi, 
      reg_periksa.jam_reg, 
      reg_periksa.kd_dokter, 
      reg_periksa.kd_dokter AS kode_dokter, 
      dokter.nm_dokter, 
      reg_periksa.no_rkm_medis, 
      pasien.nm_pasien, 
      pasien.nm_pasien AS nama, 
      pasien.jk, 
      CONCAT(reg_periksa.umurdaftar, ' ', reg_periksa.sttsumur) AS umur, 
      poliklinik.nm_poli, 
      reg_periksa.p_jawab, 
      reg_periksa.almt_pj, 
      reg_periksa.hubunganpj, 
      reg_periksa.biaya_reg, 
      reg_periksa.stts_daftar, 
      penjab.png_jawab, 
      pasien.no_tlp, 
      pasien.alamat,
      reg_periksa.stts, 
      reg_periksa.status_poli, 
      reg_periksa.kd_poli, 
      reg_periksa.kd_poli AS kode_poli, 
      reg_periksa.kd_pj, 
      reg_periksa.status_bayar 
    FROM reg_periksa 
    INNER JOIN dokter ON reg_periksa.kd_dokter = dokter.kd_dokter 
    INNER JOIN pasien ON reg_periksa.no_rkm_medis = pasien.no_rkm_medis 
    INNER JOIN poliklinik ON reg_periksa.kd_poli = poliklinik.kd_poli 
    INNER JOIN penjab ON reg_periksa.kd_pj = penjab.kd_pj 
    WHERE poliklinik.kd_poli <> 'IGDK' 
      AND reg_periksa.tgl_registrasi BETWEEN ? AND ?
      AND (pasien.nm_pasien LIKE ? OR reg_periksa.no_rawat LIKE ?)
    ORDER BY reg_periksa.tgl_registrasi DESC, reg_periksa.jam_reg DESC
  `;

  const searchParam = `%${search_text || ""}%`;

  try {
    const dataUsers = await new Promise((resolve, reject) => {
      pool.query(
        stringQuery,
        [tgl_awal, tgl_akhir, searchParam, searchParam],
        (error, result) => {
          if (error) {
            console.error("Error executing query:", error);
            return reject(error);
          }
          resolve(result);
        }
      );
    });

    const updatedData = await Promise.all(
      dataUsers.map(async (item) => {
        // const updatedName = await aimodel(item.nm_pasien);
        const listLab = await getLabRequestByNoRawat(item.no_rawat);
        return {
          ...item,
          // nama: updatedName,
          listLab: listLab,
        };
      })
    );

    const dataLab = updatedData.filter((a) => a.listLab.length > 0);

    console.log("Query sukses:", updatedData.length, "data ditemukan & diubah");
    res.json(updatedData);
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    res.status(500).send("Gagal mengambil data.");
  }
});

module.exports = router;
