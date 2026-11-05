import { NextResponse } from "next/server";
import { google } from "googleapis";

function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Memastikan karakter baris baru (\n) pada Private Key terbaca dengan benar di Vercel
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("Kredensial GOOGLE_SERVICE_ACCOUNT_EMAIL atau GOOGLE_PRIVATE_KEY belum diatur.");
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
}

function toNum(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  const cleaned = String(val).replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export async function GET() {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json(
        { error: "GOOGLE_DRIVE_FOLDER_ID belum diatur di Environment Variables." },
        { status: 400 }
      );
    }

    const auth = getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    // 1. Pindai seluruh file Google Spreadsheet di dalam Folder Google Drive
    const driveRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: "files(id, name, modifiedTime)",
      orderBy: "name",
      pageSize: 50,
    });

    const files = driveRes.data.files || [];

    // Kategorikan file berdasarkan namanya di dalam folder Drive
    const rawTvFile = files.find((f) => f.name?.toUpperCase().includes("RAW INEWS"));
    const allPlatformFiles = files.filter((f) =>
      f.name?.toUpperCase().includes("DATABASE ALL PLATFORM")
    );
    const rkatFile = files.find((f) => f.name?.toUpperCase().includes("RKAT"));
    const auditFile = files.find((f) => f.name?.toUpperCase().includes("AUDIT"));
    const promoFile = files.find((f) => f.name?.toUpperCase().includes("PROMO"));

    // Struktur penampung hasil
    let yearlyData: any[] = [];
    let monthlyData: any[] = [];
    let weeklyData: any[] = [];
    let daypartMonthlyData: any[] = [];
    let kontribusiDaypartData: any[] = [];
    let programDetailData: any[] = [];

    // 2. BACA FILE "RAW INEWS (Layer DATA TV)" JIKA ADA DI FOLDER
    if (rawTvFile?.id) {
      const batchTv = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: rawTvFile.id,
        ranges: [
          "'PERFORMANCE YEARLY'!A1:Z25",
          "'PERFORMANCE MONTHLY'!A1:Z40",
          "'PERFORMANCE WEEKLY'!A1:Z60",
          "'SHARE DAYPART MONTHLY'!A1:V120",
          "'Kontribusi By Daypart'!A1:M150",
          "'Program Detail REV2'!A1:T300",
        ],
      });

      const valueRanges = batchTv.data.valueRanges || [];

      // A. Parse PERFORMANCE YEARLY (Baris ke-2 adalah header YEAR, INEWS, TVONE, KOMPASTV, METRO...)
      const yearlyRows = valueRanges[0]?.values || [];
      yearlyData = yearlyRows
        .slice(2)
        .filter((r) => r[0] && String(r[0]).trim() !== "")
        .map((r) => ({
          year: String(r[0]),
          INEWS: toNum(r[1]),
          TVONE: toNum(r[2]),
          KOMPASTV: toNum(r[3]),
          METRO: toNum(r[4]),
          SINDONEWS: toNum(r[23]),
          IDX: toNum(r[24]),
        }));

      // B. Parse PERFORMANCE MONTHLY (Share di bagian atas, Reach di bagian bawah)
      const monthlyRows = valueRanges[1]?.values || [];
      const reachHeaderIdx = monthlyRows.findIndex(
        (r) => r[0] && String(r[0]).toUpperCase().includes("REACH")
      );
      const shareRows = monthlyRows.slice(2, reachHeaderIdx > 0 ? reachHeaderIdx : 14);
      const reachRows = reachHeaderIdx > 0 ? monthlyRows.slice(reachHeaderIdx + 2) : [];

      const reachMap: Record<string, any> = {};
      reachRows.forEach((r) => {
        if (r[0]) {
          reachMap[String(r[0]).trim().toUpperCase()] = {
            reach_inews: toNum(r[1]),
            reach_tvone: toNum(r[2]),
            reach_kompas: toNum(r[3]),
            reach_metro: toNum(r[4]),
          };
        }
      });

      monthlyData = shareRows
        .filter((r) => r[0] && !String(r[0]).includes("2026"))
        .map((r) => {
          const mKey = String(r[0]).trim().toUpperCase();
          return {
            month: String(r[0]).slice(0, 3),
            INEWS: toNum(r[1]),
            TVONE: toNum(r[2]),
            KOMPASTV: toNum(r[3]),
            METRO: toNum(r[4]),
            SINDONEWS: toNum(r[23]),
            IDX: toNum(r[24]),
            ...(reachMap[mKey] || {
              reach_inews: 0,
              reach_tvone: 0,
              reach_kompas: 0,
              reach_metro: 0,
            }),
          };
        });

      // C. Parse PERFORMANCE WEEKLY
      const weeklyRows = valueRanges[2]?.values || [];
      weeklyData = weeklyRows
        .slice(2)
        .filter((r) => r[0] && String(r[0]).trim() !== "")
        .slice(-15) // Ambil 15 minggu terakhir
        .map((r) => ({
          week: `W${r[0]}`,
          INEWS: toNum(r[1]),
          TVONE: toNum(r[2]),
          KOMPASTV: toNum(r[3]),
          METRO: toNum(r[4]),
          SINDONEWS: toNum(r[23]),
          IDX: toNum(r[24]),
        }));

      // D. Parse SHARE DAYPART MONTHLY
      const dpRows = valueRanges[3]?.values || [];
      daypartMonthlyData = dpRows
        .slice(1)
        .filter((r) => r[0] && r[1])
        .slice(-8) // Ambil 8 daypart pada bulan terbaru
        .map((r) => ({
          month: r[0],
          daypart: r[1],
          INEWS: toNum(r[2]),
          TVONE: toNum(r[3]),
          KOMPASTV: toNum(r[4]),
          METRO: toNum(r[5]),
        }));

      // E. Parse Kontribusi By Daypart
      const kontribRows = valueRanges[4]?.values || [];
      const inewsKontrib = kontribRows
        .slice(1)
        .filter((r) => r[4] && String(r[4]).toUpperCase() === "INEWS");
      if (inewsKontrib.length > 0) {
        const daypartLabels = [
          "02:00 - 04:29",
          "04:30 - 09:59",
          "10:00 - 12:59",
          "13:00 - 15:59",
          "16:00 - 17:59",
          "18:00 - 21:59",
          "22:00 - 23:59",
          "24:00 - 25:59",
        ];
        kontribusiDaypartData = daypartLabels.map((dp, idx) => {
          const avg000s =
            inewsKontrib.reduce((acc, row) => acc + toNum(row[5 + idx]), 0) /
            inewsKontrib.length;
          return {
            daypart: dp,
            inews_000s: Math.round(avg000s),
          };
        });
      }

      // F. Parse Program Detail REV2
      const progRows = valueRanges[5]?.values || [];
      programDetailData = progRows
        .slice(1)
        .filter((r) => r[5])
        .slice(0, 50)
        .map((r) => ({
          month: r[0] || "-",
          date: r[2] || "-",
          channel: r[4] || "INEWS",
          program: r[5] || "-",
          level1: r[6] || "-",
          daypart: r[10] || "-",
          category: r[11] || "-",
          tvr: toNum(r[13]),
          share: toNum(r[14]),
          dur: toNum(r[15]),
          aud_000s: toNum(r[16]),
          reach_000s: toNum(r[17]),
        }));
    }

    // 3. BACA & GABUNGKAN SELURUH FILE "DATABASE ALL PLATFORM" DI FOLDER DRIVE
    let mbmGridData: any[] = [];
    let youtubeData: any[] = [];
    let socmedData: any[] = [];

    for (const file of allPlatformFiles) {
      if (!file.id) continue;
      try {
        // Cek daftar sheet di dalam file Database All Platform tersebut
        const meta = await sheets.spreadsheets.get({ spreadsheetId: file.id });
        const sheetNames =
          meta.data.sheets?.map((s) => s.properties?.title || "") || [];

        const rangesToFetch: string[] = [];
        const tvChannels = ["INEWS", "TVONE", "KOMPAS", "SINDONEWS"];

        tvChannels.forEach((ch) => {
          if (sheetNames.includes(ch)) {
            rangesToFetch.push(`'${ch}'!A1:Z60`); // Ambil sampel baris teratas per file
          }
        });
        if (sheetNames.includes("YOUTUBE")) rangesToFetch.push("'YOUTUBE'!A1:N40");
        if (sheetNames.includes("SOCIAL MEDIA"))
          rangesToFetch.push("'SOCIAL MEDIA'!A1:P40");

        if (rangesToFetch.length === 0) continue;

        const batchPlatform = await sheets.spreadsheets.values.batchGet({
          spreadsheetId: file.id,
          ranges: rangesToFetch,
        });

        for (const vr of batchPlatform.data.valueRanges || []) {
          const rangeName = vr.range?.split("!")[0]?.replace(/'/g, "") || "";
          const rows = vr.values || [];
          if (rows.length <= 1) continue;

          if (tvChannels.includes(rangeName)) {
            const isSindo = rangeName === "SINDONEWS";
            rows.slice(1, 25).forEach((r) => {
              if (!r[0]) return;
              mbmGridData.push({
                sourceFile: file.name,
                channel: rangeName,
                program: r[0] || "-",
                date: r[2] || "-",
                time: r[7] || "-",
                tvr: toNum(r[8]),
                share: toNum(r[9]),
                part: isSindo ? r[11] || "-" : r[10] || "-",
                subPart: isSindo ? r[12] || "-" : r[11] || "-",
                genre: isSindo ? r[14] || "-" : r[13] || "-",
                bigTopic: isSindo ? r[15] || "-" : r[14] || "-",
                tema: isSindo ? r[17] || "-" : r[17] || "-",
                host: isSindo ? r[21] || "-" : r[24] || "-",
                narsum: isSindo ? r[20] || "-" : r[20] || "-",
              });
            });
          } else if (rangeName === "YOUTUBE") {
            rows.slice(1, 20).forEach((r) => {
              if (!r[3]) return;
              youtubeData.push({
                sourceFile: file.name,
                cluster: r[0] || "iNews",
                channel: r[1] || "-",
                title: r[3] || "-",
                date: r[4] || "-",
                format: r[6] || "VOD",
                durasi: r[7] || "-",
                views: toNum(r[8]),
                likes: toNum(r[9]),
                comments: toNum(r[10]),
                er: toNum(r[11]),
                isu: r[12] || "-",
              });
            });
          } else if (rangeName === "SOCIAL MEDIA") {
            rows.slice(1, 20).forEach((r) => {
              if (!r[4]) return;
              socmedData.push({
                sourceFile: file.name,
                platform: r[0] || "-",
                akun: r[1] || "-",
                tanggal: r[3] || "-",
                post: r[4] || "-",
                views: toNum(r[6]),
                likes: toNum(r[7]),
                comments: toNum(r[8]),
                shares: toNum(r[9]),
                er: toNum(r[10]) * 100,
                isu: r[11] || "-",
              });
            });
          }
        }
      } catch (innerErr) {
        console.warn(`Gagal membaca file ${file.name}:`, innerErr);
      }
    }

    // Urutkan YouTube & Sosmed berdasarkan Views tertinggi
    youtubeData.sort((a, b) => b.views - a.views);
    socmedData.sort((a, b) => b.views - a.views);

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      detectedFiles: files.map((f) => ({
        name: f.name,
        modifiedTime: f.modifiedTime,
      })),
      dataStatus: {
        hasTvLayer: yearlyData.length > 0 || monthlyData.length > 0,
        hasDaypart: daypartMonthlyData.length > 0,
        hasProgramDetail: programDetailData.length > 0,
        hasMbmGrid: mbmGridData.length > 0,
        hasDigital: youtubeData.length > 0 || socmedData.length > 0,
        hasRkat: Boolean(rkatFile),
        hasAuditLibrary: Boolean(auditFile),
        hasPromoMap: Boolean(promoFile),
      },
      datasets: {
        yearlyData,
        monthlyData,
        weeklyData,
        daypartMonthlyData,
        kontribusiDaypartData,
        programDetailData,
        mbmGridData,
        youtubeData: youtubeData.slice(0, 30),
        socmedData: socmedData.slice(0, 30),
      },
    });
  } catch (error: any) {
    console.error("Google Drive API Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data dari Google Drive API" },
      { status: 500 }
    );
  }
}