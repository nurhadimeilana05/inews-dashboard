"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Tv,
  Clock,
  Film,
  Layers,
  Database,
  RefreshCw,
  FolderCheck,
  AlertCircle,
  Search,
} from "lucide-react";

function Youtube({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

// Komponen Empty State jika chart belum memiliki data di folder Google Drive
function EmptyChartState({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[280px] text-center">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 text-amber-400" />
      </div>
      <h3 className="text-sm font-bold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 max-w-md mt-1">{description}</p>
      <span className="mt-4 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300">
        Belum Ada Data
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "tv_layer" | "daypart" | "programs" | "mbm_grid" | "digital" | "other_layers"
  >("tv_layer");
  const [periodMode, setPeriodMode] = useState<"yearly" | "monthly" | "weekly">("monthly");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiPayload, setApiPayload] = useState<any>(null);

  const fetchDriveData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/drive-data", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data");
      setApiPayload(json);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveData();
  }, []);

  const datasets = apiPayload?.datasets || {};
  const status = apiPayload?.dataStatus || {};
  const detectedFiles = apiPayload?.detectedFiles || [];

  const filteredMbm = useMemo(() => {
    const list = datasets.mbmGridData || [];
    return list.filter((item: any) => {
      const matchCh = channelFilter === "ALL" || item.channel === channelFilter;
      const q = searchQuery.toLowerCase();
      const matchQ =
        !q ||
        String(item.bigTopic).toLowerCase().includes(q) ||
        String(item.tema).toLowerCase().includes(q) ||
        String(item.genre).toLowerCase().includes(q) ||
        String(item.program).toLowerCase().includes(q);
      return matchCh && matchQ;
    });
  }, [datasets.mbmGridData, channelFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-extrabold text-lg">
              iN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">
                  iNEWS GROUP DASHBOARD — GOOGLE DRIVE API SYNC
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE SPREADSHEET
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Terhubung otomatis ke Folder Google Drive ({detectedFiles.length} Spreadsheet terdeteksi)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchDriveData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-red-400" : ""}`} />
              {loading ? "Menyinkronkan Drive..." : "Sync Google Drive"}
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="max-w-7xl mx-auto mt-4 flex flex-wrap gap-1.5">
          {[
            { id: "tv_layer", label: "1. Layer Data TV", icon: Tv },
            { id: "daypart", label: "2. Share & Kontribusi Daypart", icon: Clock },
            { id: "programs", label: "3. Program Detail", icon: Film },
            { id: "mbm_grid", label: "4. MBM All Platform", icon: Layers },
            { id: "digital", label: "5. YouTube & Sosmed", icon: Youtube },
            { id: "other_layers", label: "6. RKAT, Library & Promo", icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  active
                    ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* STATUS KONEKSI FOLDER GOOGLE DRIVE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FolderCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-white">File Spreadsheet di Folder Google Drive: </span>
              {detectedFiles.length > 0 ? (
                <span className="text-slate-300">
                  {detectedFiles.map((f: any) => f.name).join(" • ")}
                </span>
              ) : (
                <span className="text-amber-400">
                  Belum ada file Spreadsheet yang terdeteksi atau kredensial belum diisi.
                </span>
              )}
            </div>
          </div>
          {apiPayload?.syncedAt && (
            <span className="text-[11px] text-slate-400 shrink-0">
              Update Terakhir: {new Date(apiPayload.syncedAt).toLocaleTimeString("id-ID")} WIB
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-200 rounded-xl p-4 text-xs">
            <strong>Peringatan Koneksi Google Drive API:</strong> {errorMsg}
          </div>
        )}

        {/* =======================================
            TAB 1: LAYER DATA TV
           ======================================= */}
        {activeTab === "tv_layer" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Performa Audience Share (%) — FTA & Pay TV
                </h2>
                <p className="text-xs text-slate-400">
                  Otomatis membaca tab PERFORMANCE YEARLY, MONTHLY, dan WEEKLY dari Google Spreadsheet
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["yearly", "monthly", "weekly"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPeriodMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase ${
                      periodMode === m ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {!status.hasTvLayer ? (
              <EmptyChartState
                title="Grafik Performa TV (FTA & Pay TV)"
                description="File Spreadsheet 'RAW INEWS (Layer DATA TV)' belum ditemukan di dalam folder Google Drive."
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">
                    FTA News Channel Share (%) — {periodMode.toUpperCase()}
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={
                          periodMode === "yearly"
                            ? datasets.yearlyData
                            : periodMode === "monthly"
                            ? datasets.monthlyData
                            : datasets.weeklyData
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey={
                            periodMode === "yearly"
                              ? "year"
                              : periodMode === "monthly"
                              ? "month"
                              : "week"
                          }
                          stroke="#94a3b8"
                          fontSize={11}
                        />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="INEWS" stroke="#ef4444" strokeWidth={3} />
                        <Line type="monotone" dataKey="TVONE" stroke="#f59e0b" strokeWidth={2} />
                        <Line type="monotone" dataKey="KOMPASTV" stroke="#3b82f6" strokeWidth={2} />
                        <Line type="monotone" dataKey="METRO" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">
                    Pay TV Share (%) — SindoNews TV & IDX Channel ({periodMode.toUpperCase()})
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={
                          periodMode === "yearly"
                            ? datasets.yearlyData
                            : periodMode === "monthly"
                            ? datasets.monthlyData
                            : datasets.weeklyData
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey={
                            periodMode === "yearly"
                              ? "year"
                              : periodMode === "monthly"
                              ? "month"
                              : "week"
                          }
                          stroke="#94a3b8"
                          fontSize={11}
                        />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                        />
                        <Legend />
                        <Bar dataKey="SINDONEWS" name="SindoNews TV" fill="#06b6d4" />
                        <Bar dataKey="IDX" name="IDX Channel" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =======================================
            TAB 2: SHARE & KONTRIBUSI DAYPART
           ======================================= */}
        {activeTab === "daypart" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!status.hasDaypart ? (
              <EmptyChartState
                title="Share Daypart Monthly"
                description="Belum ada data pada sheet 'SHARE DAYPART MONTHLY'."
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4">
                  Perbandingan Share per Daypart (02:00 – 25:59)
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datasets.daypartMonthlyData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                      <YAxis
                        dataKey="daypart"
                        type="category"
                        stroke="#94a3b8"
                        fontSize={11}
                        width={95}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                      />
                      <Legend />
                      <Bar dataKey="INEWS" fill="#ef4444" />
                      <Bar dataKey="TVONE" fill="#f59e0b" />
                      <Bar dataKey="KOMPASTV" fill="#3b82f6" />
                      <Bar dataKey="METRO" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {!datasets.kontribusiDaypartData?.length ? (
              <EmptyChartState
                title="Kontribusi Audience By Daypart (000s)"
                description="Belum ada data pada sheet 'Kontribusi By Daypart'."
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4">
                  Rata-rata Kontribusi Audience iNews per Daypart (000s)
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datasets.kontribusiDaypartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="daypart" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="inews_000s"
                        name="Audience iNews (000s)"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =======================================
            TAB 3: PROGRAM DETAIL REV2
           ======================================= */}
        {activeTab === "programs" && (
          <div>
            {!status.hasProgramDetail ? (
              <EmptyChartState
                title="Evaluasi Program Detail REV2"
                description="Belum ada data pada sheet 'Program Detail REV2'."
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-x-auto">
                <h3 className="text-sm font-bold text-white mb-4">
                  Tabel Performa Program (Sheet: Program Detail REV2)
                </h3>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-3">Tanggal</th>
                      <th className="py-3 px-3">Program</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3">Level 1</th>
                      <th className="py-3 px-3">Daypart</th>
                      <th className="py-3 px-3 text-right">Durasi</th>
                      <th className="py-3 px-3 text-right">TVR</th>
                      <th className="py-3 px-3 text-right">Share (%)</th>
                      <th className="py-3 px-3 text-right">000s</th>
                      <th className="py-3 px-3 text-right">Reach 000s</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {datasets.programDetailData.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400">{p.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{p.program}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.category === "Fresh"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {p.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{p.level1}</td>
                        <td className="py-2.5 px-3 text-slate-400">{p.daypart}</td>
                        <td className="py-2.5 px-3 text-right">{p.dur}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{p.tvr}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-red-400">
                          {p.share}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {Number(p.aud_000s).toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {Number(p.reach_000s).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =======================================
            TAB 4: MBM CONTENT GRID ALL PLATFORM
           ======================================= */}
        {activeTab === "mbm_grid" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {["ALL", "INEWS", "TVONE", "KOMPAS", "SINDONEWS"].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      channelFilter === ch
                        ? "bg-red-600 text-white"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari Big Topic, Tema, Genre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {!status.hasMbmGrid ? (
              <EmptyChartState
                title="MBM Content Grid (iNews, tvOne, Kompas, SindoNews)"
                description="File Spreadsheet 'Database All Platform' belum ditemukan di dalam folder Google Drive."
              />
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-3">File Sumber</th>
                      <th className="py-3 px-3">Channel</th>
                      <th className="py-3 px-3">Program</th>
                      <th className="py-3 px-3">Waktu</th>
                      <th className="py-3 px-3 text-right">TVR</th>
                      <th className="py-3 px-3 text-right">Share (%)</th>
                      <th className="py-3 px-3">Genre</th>
                      <th className="py-3 px-3">Big Topics</th>
                      <th className="py-3 px-3">Tema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredMbm.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">
                          {row.sourceFile}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-red-400">{row.channel}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{row.program}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {row.date} ({row.time})
                        </td>
                        <td className="py-2.5 px-3 text-right">{row.tvr}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          {row.share}%
                        </td>
                        <td className="py-2.5 px-3">{row.genre}</td>
                        <td className="py-2.5 px-3 font-semibold text-amber-300">
                          {row.bigTopic}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs">{row.tema}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =======================================
            TAB 5: DIGITAL ECOSYSTEM (YOUTUBE & SOSMED)
           ======================================= */}
        {activeTab === "digital" && (
          <div className="space-y-6">
            {!status.hasDigital ? (
              <EmptyChartState
                title="Digital Ecosystem (YouTube & Social Media)"
                description="Sheet YOUTUBE & SOCIAL MEDIA belum ditemukan di dalam folder Google Drive."
              />
            ) : (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-x-auto">
                  <h3 className="text-sm font-bold text-white mb-4">
                    Top Konten YouTube Terbaca dari Seluruh Spreadsheet di Drive
                  </h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-3">Channel</th>
                        <th className="py-3 px-3">Format</th>
                        <th className="py-3 px-3">Judul Video</th>
                        <th className="py-3 px-3">Isu Final</th>
                        <th className="py-3 px-3 text-right">Views</th>
                        <th className="py-3 px-3 text-right">Likes</th>
                        <th className="py-3 px-3 text-right">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {datasets.youtubeData?.map((yt: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-white">{yt.channel}</td>
                          <td className="py-2.5 px-3">{yt.format}</td>
                          <td className="py-2.5 px-3 text-slate-200 max-w-md">{yt.title}</td>
                          <td className="py-2.5 px-3 text-amber-300">{yt.isu}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {Number(yt.views).toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {Number(yt.likes).toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {Number(yt.comments).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-x-auto">
                  <h3 className="text-sm font-bold text-white mb-4">
                    Top Social Media Post Terbaca dari Folder Drive
                  </h3>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-3 px-3">Platform</th>
                        <th className="py-3 px-3">Akun</th>
                        <th className="py-3 px-3">Post</th>
                        <th className="py-3 px-3">Isu Final</th>
                        <th className="py-3 px-3 text-right">Views</th>
                        <th className="py-3 px-3 text-right">Likes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {datasets.socmedData?.map((sm: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-blue-400">
                            {sm.platform}
                          </td>
                          <td className="py-2.5 px-3 text-white">{sm.akun}</td>
                          <td className="py-2.5 px-3 text-slate-300 max-w-md">{sm.post}</td>
                          <td className="py-2.5 px-3 text-amber-300">{sm.isu}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {Number(sm.views).toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-3 text-right">{sm.likes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* =======================================
            TAB 6: CHART YANG BELUM ADA DATANYA
           ======================================= */}
        {activeTab === "other_layers" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <EmptyChartState
              title="Target RKAT, Revenue & EBITDA"
              description="Belum ada Spreadsheet dengan nama 'RKAT' di dalam folder Google Drive Anda."
            />
            <EmptyChartState
              title="Audit Size & Durasi Master On-Air"
              description="Belum ada Spreadsheet 'audit-size-master-on-air' di dalam folder Google Drive Anda."
            />
            <EmptyChartState
              title="Pemetaan Copy Product & Promo"
              description="Belum ada Spreadsheet 'pemetaan-copy-product-promo' di dalam folder Google Drive Anda."
            />
          </div>
        )}
      </main>
    </div>
  );
}