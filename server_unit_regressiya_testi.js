"use strict";

const fs = require("fs");
const path = require("path");
const {
  spawnSync
} = require("child_process");

const UNIT_TESTLERI = [
  "baza_yerdeyisme_dovlet_kilidi_client_testi.js",
  "berpa_kodu_yaradilma_kilidi_testi.js",
  "dovlet_baza_birbasa_postgres_testi.js",
  "dovlet_konvoy_runtime_client_sync_testi.js",
  "dovlet_konvoy_runtime_pvp_status_testi.js",
  "doyus_itki_stat_v2_testi.js",
  "doyus_merheleli_resolver_testi.js",
  "doyus_qosun_lifecycle_testi.js",
  "doyus_qosun_stat_inteqrasiya_testi.js",
  "doyus_raport_pg_mutasiya_testi.js",
  "dusmen_movqeyi_pg_mutasiya_testi.js",
  "email_dev_log_qoruma_testi.js",
  "email_tesdiq_kodu_yaradilma_kilidi_testi.js",
  "email_tesdiq_kodu_yoxlama_kilidi_testi.js",
  "hesab_pin_deyisiklik_icaze_legv_testi.js",
  "hesab_pin_icaze_atomiklik_testi.js",
  "hesab_provayder_cavab_uygunlugu_testi.js",
  "hesab_sifre_qaydalari_testi.js",
  "hesab_silme_pin_atomiklik_testi.js",
  "iki_oyuncu_state_mutasiya_postgres_testi.js",
  "kesfiyyat_pg_mutasiya_testi.js",
  "konvoy_emeliyyat_pg_mutasiya_testi.js",
  "konvoy_formasiya_sira_tutumu_testi.js",
  "konvoy_ikinci_kamp_unlock_testi.js",
  "konvoy_mesgul_sistemi_testi.js",
  "konvoy_pg_mutasiya_testi.js",
  "konvoy_pvp_info_qayda_override_testi.js",
  "konvoy_texnologiya_inkisaf_inteqrasiya_testi.js",
  "konvoy_tutum_formulu_testi.js",
  "konvoy_tutum_texnologiya_disabled_testi.js",
  "konvoy_unity_contract_testi.js",
  "konvoy_yola_hazirliq_sistemi_testi.js",
  "missiya_mukafat_pg_mutasiya_testi.js",
  "missiya_smoke_testi.js",
  "oyun_state_cox_oyuncu_kilidi_testi.js",
  "oyun_state_mutasiya_postgres_testi.js",
  "pvp_anbar_qoruma_sistemi_testi.js",
  "pvp_baza_hucum_catma_xidmeti_testi.js",
  "pvp_baza_hucum_start_xidmeti_testi.js",
  "pvp_baza_live_handler_testi.js",
  "pvp_doyus_raport_sistemi_testi.js",
  "pvp_doyus_resolver_testi.js",
  "pvp_doyus_settlement_sistemi_testi.js",
  "pvp_doyus_snapshot_sistemi_testi.js",
  "pvp_hucum_emeliyyat_sistemi_testi.js",
  "pvp_qoruma_sistemi_testi.js",
  "pvp_resurs_talani_sistemi_testi.js",
  "pvp_seher_davamliliq_sistemi_testi.js",
  "pvp_settlement_live_override_testi.js",
  "pvp_shield_item_sistemi_testi.js",
  "pvp_zeroing_konvoy_recall_postcommit_testi.js",
  "pvp_zeroing_yerdeyisme_sistemi_testi.js",
  "qehreman_exp_pg_mutasiya_testi.js",
  "qehreman_exp_progression_testi.js",
  "qehreman_inkisaf_sistemi_testi.js",
  "qehreman_recruit_pg_mutasiya_testi.js",
  "qehreman_skill_sistemi_testi.js",
  "qehreman_tapshiriq_pg_mutasiya_testi.js",
  "qehreman_tapshiriq_saglamliq_testi.js",
  "qosun_doyus_stat_sistemi_testi.js",
  "qosun_kataloqu_testi.js",
  "qosun_telimi_inkisaf_override_testi.js",
  "qosun_telimi_pg_mutasiya_testi.js",
  "qosun_telimi_tikinti_yekunlasma_regressiya_testi.js",
  "resurs_inkisaf_korpu_testi.js",
  "resurs_inkisaf_runtime_inteqrasiya_testi.js",
  "server_client_state_qosun_compat_testi.js",
  "server_hessas_mesaj_log_qoruma_testi.js",
  "server_unity_mesaj_muqavilesi_testi.js",
  "texnologiya_inkisaf_korpu_testi.js",
  "texnologiya_inkisaf_xerc_runtime_testi.js",
  "texnologiya_inkisaf_xerc_testi.js",
  "ticaret_inkisaf_korpu_testi.js",
  "tikinti_inkisaf_korpu_testi.js",
  "tikinti_inkisaf_runtime_inteqrasiya_testi.js",
  "tutorial_doyus_pg_mutasiya_testi.js",
  "xerite_dusmen_doyus_sistemi_testi.js",
  "xerite_dusmen_qaydalari_testi.js",
  "xerite_resurs_toplama_pg_mutasiya_testi.js",
  "xestexana_inkisaf_override_testi.js",
  "xestexana_pg_mutasiya_testi.js"
];

// Bu testlər real PostgreSQL, SMTP və ya işləyən WebSocket server tələb edir.
// Onlar ayrıca integration script-ləri ilə işə salınır; standart unit suite
// xarici servisə yazı etmir.
const INTEGRATION_TESTLERI = [
  "email_birbasa_testi.js",
  "email_tesdiq_postgres_testi.js",
  "hesab_db_testi.js",
  "hesab_pin_postgres_testi.js",
  "hesab_provayder_idare_testi.js",
  "hesab_yaddasi_postgres_testi.js",
  "server_auth_qoruma_testi.js",
  "server_hesab_genisletme_testi.js",
  "server_hesab_login_testi.js",
  "server_hesab_silme_testi.js",
  "server_hesab_smoke_testi.js",
  "server_sifre_reset_smoke_testi.js",
  "sifre_sifirlama_postgres_testi.js",
  "verilenler_bazasi_testi.js"
];

const ugursuzTestler = [];
const baslamaVaxti = Date.now();

for (const testFayli of UNIT_TESTLERI) {
  const tamYol = path.join(__dirname, testFayli);

  if (!fs.existsSync(tamYol)) {
    console.error(
      `::error file=${testFayli}::Unit test faylı tapılmadı: ${testFayli}`
    );
    ugursuzTestler.push(testFayli);
    continue;
  }

  console.log(`\n[UNIT_SUITE] START ${testFayli}`);

  const netice = spawnSync(
    process.execPath,
    [tamYol],
    {
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: "test"
      },
      stdio: "pipe",
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 60000
    }
  );

  if (netice.stdout) {
    process.stdout.write(netice.stdout);
  }
  if (netice.stderr) {
    process.stderr.write(netice.stderr);
  }

  if (netice.status === 0 && !netice.error) {
    console.log(`[UNIT_SUITE] PASS  ${testFayli}`);
    continue;
  }

  const sebeb = netice.error
    ? netice.error.message
    : netice.signal
      ? `signal=${netice.signal}`
      : `exit=${netice.status}`;

  const xetaMetni = String(netice.stderr || netice.stdout || sebeb)
    .trim()
    .split(/\r?\n/)
    .slice(-4)
    .join(" | ")
    .slice(-1200)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");

  console.error(
    `::error file=${testFayli}::Unit regression uğursuzdur: ${sebeb} | ${xetaMetni}`
  );
  ugursuzTestler.push(testFayli);
}

const muddetMs = Date.now() - baslamaVaxti;

if (ugursuzTestler.length > 0) {
  console.error(
    `[UNIT_SUITE] ${ugursuzTestler.length}/${UNIT_TESTLERI.length} test uğursuz oldu: ` +
    ugursuzTestler.join(", ")
  );
  process.exitCode = 1;
}
else {
  console.log(
    `\n[UNIT_SUITE] ${UNIT_TESTLERI.length} test uğurla keçdi (${muddetMs} ms). ` +
    `${INTEGRATION_TESTLERI.length} xarici-servis testi ayrıca saxlanılır.`
  );
}
