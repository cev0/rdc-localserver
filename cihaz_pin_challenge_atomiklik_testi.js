"use strict";

const assert = require("assert");

const {
  cihazHashYarat,
  cihazPinSorqusunuYoxlaVeSessiyaYarat
} = require("./hesab_cihaz_pin_qoruma");

class SetrKilidi {
  constructor() {
    this.kilidlidir = false;
    this.novbe = [];
  }

  async al() {
    if (!this.kilidlidir) {
      this.kilidlidir = true;
      return;
    }

    await new Promise(resolve => {
      this.novbe.push(resolve);
    });
  }

  burax() {
    const novbeti = this.novbe.shift();

    if (novbeti) {
      novbeti();
      return;
    }

    this.kilidlidir = false;
  }
}

async function testiIslet() {
  const cihazId = "test-device-atomic";
  const paylasilanSorqu = {
    istifadeVaxti: null,
    kilid: new SetrKilidi()
  };

  let clientSayi = 0;
  let pinYoxlamaSayi = 0;
  let sessiyaYaratmaSayi = 0;
  let forUpdateGoruldu = false;
  let istifadeUpdateGoruldu = false;

  function clientYarat() {
    const clientId = ++clientSayi;

    return {
      transactionActive: false,
      setrKilidiVar: false,

      async query(sql) {
        const emr = String(sql || "");
        const yığcam = emr.trim().replace(/\s+/g, " ");

        if (yığcam === "BEGIN") {
          assert.strictEqual(this.transactionActive, false);
          this.transactionActive = true;
          return { rows: [] };
        }

        if (yığcam === "COMMIT" || yığcam === "ROLLBACK") {
          assert.strictEqual(this.transactionActive, true);
          this.transactionActive = false;

          if (this.setrKilidiVar) {
            this.setrKilidiVar = false;
            paylasilanSorqu.kilid.burax();
          }

          return { rows: [] };
        }

        assert.strictEqual(
          this.transactionActive,
          true,
          "Bütün challenge əməliyyatları eyni transaction-da qalmalıdır."
        );

        if (
          emr.includes("FROM hesab_cihaz_pin_sorqulari c") &&
          emr.includes("JOIN hesablar h")
        ) {
          assert.match(emr, /FOR UPDATE OF c, h/);
          forUpdateGoruldu = true;

          await paylasilanSorqu.kilid.al();
          this.setrKilidiVar = true;

          return {
            rows: [
              {
                sorqu_id: "challenge-1",
                hesab_id: "account-1",
                cihaz_hash: cihazHashYarat(cihazId),
                meqsed: "login",
                bitme_vaxti: new Date(Date.now() + 60_000),
                istifade_vaxti: paylasilanSorqu.istifadeVaxti,
                oyuncu_id: "player-1",
                esas_email: "",
                ikinci_email: "",
                email_tesdiqlenib: false,
                sifre_hash: "test",
                pin_hash: "test",
                pin_sehv_cehd_sayi: 0,
                pin_blok_vaxti: null,
                status: "aktiv",
                yaradilma_vaxti: new Date(),
                yenilenme_vaxti: new Date()
              }
            ]
          };
        }

        if (emr.includes("INSERT INTO hesab_etibarli_cihazlar")) {
          return { rows: [], rowCount: 1 };
        }

        if (
          emr.includes("UPDATE hesab_cihaz_pin_sorqulari") &&
          emr.includes("RETURNING sorqu_id")
        ) {
          istifadeUpdateGoruldu = true;

          if (paylasilanSorqu.istifadeVaxti) {
            return { rows: [], rowCount: 0 };
          }

          paylasilanSorqu.istifadeVaxti = new Date();

          return {
            rows: [{ sorqu_id: "challenge-1" }],
            rowCount: 1
          };
        }

        throw new Error(
          `Gözlənilməyən SQL (client ${clientId}): ${yığcam}`
        );
      },

      release() {
        assert.strictEqual(
          this.transactionActive,
          false,
          "Client açıq transaction ilə release edilə bilməz."
        );
        assert.strictEqual(this.setrKilidiVar, false);
      }
    };
  }

  const saxtaHovuz = {
    async connect() {
      return clientYarat();
    }
  };

  const secimler = {
    proqramHovuzunuAl() {
      return saxtaHovuz;
    },

    pinDuzgundur(pin) {
      return pin === "123456";
    },

    async pinYoxlamaDaxili(client) {
      assert.strictEqual(client.transactionActive, true);
      assert.strictEqual(client.setrKilidiVar, true);
      pinYoxlamaSayi++;
      await Promise.resolve();

      return {
        success: true,
        hasPin: true,
        attemptsRemaining: 5,
        message: "PIN düzgündür."
      };
    },

    async sessiyaYaratHesabUcunDaxili(client) {
      assert.strictEqual(client.transactionActive, true);
      assert.strictEqual(client.setrKilidiVar, true);
      sessiyaYaratmaSayi++;
      await Promise.resolve();

      return {
        success: true,
        account: {
          accountId: "account-1",
          playerId: "player-1"
        },
        session: {
          sessionId: "session-" + sessiyaYaratmaSayi,
          refreshToken: "refresh-test",
          expiresAtMs: Date.now() + 60_000
        }
      };
    }
  };

  const neticeler = await Promise.all([
    cihazPinSorqusunuYoxlaVeSessiyaYarat(
      "challenge-1",
      cihazId,
      "123456",
      secimler
    ),
    cihazPinSorqusunuYoxlaVeSessiyaYarat(
      "challenge-1",
      cihazId,
      "123456",
      secimler
    )
  ]);

  const ugurlular = neticeler.filter(netice => netice.success === true);
  const bloklananlar = neticeler.filter(netice => netice.success !== true);

  assert.strictEqual(ugurlular.length, 1);
  assert.strictEqual(bloklananlar.length, 1);
  assert.strictEqual(bloklananlar[0].expired, true);
  assert.strictEqual(pinYoxlamaSayi, 1);
  assert.strictEqual(sessiyaYaratmaSayi, 1);
  assert.strictEqual(forUpdateGoruldu, true);
  assert.strictEqual(istifadeUpdateGoruldu, true);
  assert.ok(paylasilanSorqu.istifadeVaxti instanceof Date);
}

testiIslet()
  .then(() => {
    console.log(
      "[CIHAZ_PIN_CHALLENGE_ATOMIKLIK_TEST] Paralel challenge istifadəsi bloklandı."
    );
  })
  .catch(xeta => {
    console.error(xeta);
    process.exitCode = 1;
  });
