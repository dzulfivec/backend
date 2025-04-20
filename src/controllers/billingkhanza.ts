export default {
	async submit() {
		let transactionSuccessful = true;
		let failedQueries = [];
		// Menjalankan format jurnal dan nota secara bersamaan
		await Promise.all([
			formatNoJurnal.formatJurnal(),
			formatNoNota.formatNota()
		]);
		const tgl_byr = moment().format("YYYY-MM-DD"); // Mendapatkan tanggal pembayaran saat ini
		const no_rawat = appsmith.store.no_rawat; // Mengambil no_rawat dari store
		let detailJurnal = [{akun:117004,debet:0,kredit:appsmith.store.tagihan.total_semua}]
		let billingData = [
			{ noindex: 0, no_rawat, tgl_byr, no: "No.Nota", nm_perawatan: `: ${appsmith.store.noNota}`, pemisah: "", biaya: 0.0, jumlah: 0.0, tambahan: 0.0, totalbiaya: 0.0, status: "-" },
			{ noindex: 1, no_rawat, tgl_byr, no: "Nama Pasien", nm_perawatan: `: ${checkRegist.data[0].pasien}`, pemisah: "", biaya: 0.0, jumlah: 0.0, tambahan: 0.0, totalbiaya: 0.0, status: "-" }]
		try {

			// Validasi jumlah pembayaran
			if (appsmith.store.billMethod.name === "PIUTANG" && !opsi_piutang.selectedOptionValue) {
				showAlert("Pilih Rekening Piutang Dulu!", "warning");
				return;
			}
			// if (parseInt(jml_bayar.text) !== appsmith.store.tagihan.total_bulat &&appsmith.store.billMethod.name !== "PIUTANG") {
				// showAlert("Masukkan Nominal Bayar Sesuai Dengan Nominal Tagihan!", "warning");
				// return;
			// }
			if	(appsmith.store.billMethod.name === "QRIS" ||appsmith.store.billMethod.name === "KARTU DEBET/ KREDIT") {
				if(no_qris.text==0||no_qris.text==""||no_qris.text.length<12){
					showAlert("Masukkan No. Transfer  atau No. Qris Terlebih Dahulu Yang Lengkap!", "warning");
					return;

				}
				if(appsmith.store.billMethod.name === "KARTU DEBET/ KREDIT"&&!opsi_debit.selectedOptionValue){
					showAlert("Pilih Bank Dulu", "warning");
					return;

				}

			}



			// Menyimpan keterangan jurnal
			const keteranganJurnal = `PEMBAYARAN PASIEN RAWAT JALAN ${checkRegist.data[0].no_rkm_medis} ${checkRegist.data[0].pasien}` +
						(appsmith.store.billMethod.name === "QRIS" ||appsmith.store.billMethod.name === "KARTU DEBET/ KREDIT"? `${opsi_debit.selectedOptionValue ? opsi_debit.selectedOptionLabel : ''} No. Transaksi : ${no_qris.text}` : '') +
						`, DIPOSTING OLEH ${appsmith.store.username} Dengan Web`;
			await storeValue("ket_jurnal", keteranganJurnal);

			await Promise.all([
				addJurnal.run().catch(() => failedQueries.push("addJurnal")),

			]);


			// Menangani metode pembayaran PIUTANG
			if (appsmith.store.billMethod.name === "PIUTANG") {
				detailJurnal.push({ akun: appsmith.store.piutangSelected.kd_rek, debet: appsmith.store.tagihan.total_semua , kredit: 0 });
				await addPiutangPasien.run()
				addNotaJalanPiutang.run().catch(() => failedQueries.push("addNotaJalanPiutang"))

			} else if  (appsmith.store.billMethod.name === "KARTU DEBET/ KREDIT"){
				const jumlah= parseInt(jml_bayar.text)*opsi_debit.selectedOptionValue/100
				detailJurnal.push({ akun: appsmith.store.billMethod.akun, debet: jml_bayar.text-jumlah , kredit: 0 });
				detailJurnal.push({ akun: 530127, debet: jumlah , kredit: 0 });
				
				addNotaJalan.run({caraBayar:opsi_debit.selectedOptionLabel}).catch(() => failedQueries.push("addNotaJalan"))

			}
			else{
				detailJurnal.push({ akun: appsmith.store.billMethod.akun, debet: jml_bayar.text , kredit: 0 });
				addNotaJalan.run({caraBayar:appsmith.store.billMethod.name}).catch(() => failedQueries.push("addNotaJalan"))

			}

			// Fungsi untuk memproses biaya tambahan dan potongan biaya
			const processCosts = async (costs) => {
				detailJurnal.push(costs);
			};

			// Menjalankan pemrosesan biaya tambahan dan potongan biaya jika ada
			if (appsmith.store.tagihan.tambahan_biaya.length > 0 &&appsmith.store.billMethod.name !== "PIUTANG") {
				// if (appsmith.store.tagihan.tambahan_biaya.length > 0 ) {

				const tambahan = appsmith.store.tagihan.tambahan_biaya;
				const total_kredit = tambahan.reduce((acc, { kredit }) => acc + (kredit || 0), 0);
				const allTambahan = {akun: appsmith.store.tagihan.tambahan_biaya[0].akun, debet: 0, kredit: total_kredit};
				await processCosts(allTambahan);
			}
			// if (appsmith.store.tagihan.pot_biaya?.length > 0 ) {
			if (appsmith.store.tagihan.pot_biaya?.length > 0 &&appsmith.store.billMethod.name !== "PIUTANG") {
				const diskon = appsmith.store.tagihan.pot_biaya;
				const total_debet = diskon.reduce((acc, { debet }) => acc + (debet || 0), 0);
				const allDiskon = {akun: appsmith.store.tagihan.pot_biaya[0].akun, debet: total_debet, kredit: 0};
				await processCosts(allDiskon);
			}

			for (const d of detailJurnal) {
				console.log("detailJurnal", d); // Menampilkan data billing di konsol
				await jurnalDetail.run(d).catch(() => failedQueries.push("detailJurnal"));
			}

			// Memeriksa apakah ada tambahan biaya dan menambahkannya ke billingData
			if (appsmith.store.tagihan.tambahan_biaya.length > 0) {
				for (const d of appsmith.store.tagihan.tambahan_biaya) {
					billingData.push({ noindex: 3, no_rawat, tgl_byr, no: "Tambahan", nm_perawatan: d.nama,pemisah: "", biaya: d.nominal, jumlah: 1, tambahan: 0, totalbiaya: d.nominal, status: "Tambahan" });
				}
			}
			// Memeriksa apakah ada potongan biaya dan menambahkannya ke billingData
			if (appsmith.store.tagihan.pot_biaya.length > 0) {
				for (const d of appsmith.store.tagihan.pot_biaya) {
					billingData.push({ noindex: 4, no_rawat, tgl_byr, no: "Potongan", nm_perawatan: d.nama,pemisah: "", biaya: d.nominal, jumlah: 1, tambahan: 0, totalbiaya: (d.nominal * -1), status: "Potongan" });

				}
			}

			// Mengirimkan setiap item billingData ke fungsi billing.run
			for (const d of billingData) {
				await billing.run(d); // Menjalankan fungsi billing untuk setiap item
			}

			console.log(detailJurnal,"detail")

			// Mengecek ulang billing setelah transaksi
			await billingCheck.run().catch(() => failedQueries.push("billingCheck"));

			if(appsmith.store.billMethod.name === "PIUTANG"){
				if(billingCheck.data[0].total>0){
					await getNotaPiutang.run()
					storeValue("metodeBayar", getNotaPiutang.data[0].nama_bayar)
					storeValue("besarBayar", getNotaPiutang.data[0].totalpiutang)
				}
			}
			else {
				await getNotaJalan.run()
				storeValue("metodeBayar", getNotaJalan.data[0].nama_bayar)
				storeValue("besarBayar",getNotaJalan.data[0].besar_bayar)
			}

			// Reset input dan state terkait
			await Promise.all([
				jml_bayar.setValue(0),
				no_qris.setValue(""),
				removeValue("noNota"),
				removeValue("isEdit"),
				storeValue("focus2", true)
			]);

			// Menutup modal billing
			closeModal("ModalBill");
			showAlert("Data Billing berhasil disimpan!", "success");
			console.log(appsmith.store.no_jurnal)
		} catch (error) {
			if (failedQueries.length > 0) {
				transactionSuccessful = false;
				await rollBackBilling.run();
				await rollBackJurnal.run()
				showAlert(`Gagal menyimpan data Billing! Error pada query: ${failedQueries.join(", ")}`, "error");
			}
			showAlert(`Gagal menyimpan data Billing!`, "error");
			await rollBackJurnal.run()
			await rollBackBilling.run();
			console.error("Terjadi kesalahan:", error);
		}
	}
};
