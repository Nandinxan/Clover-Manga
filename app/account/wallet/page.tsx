"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { ArrowLeft, Wallet, Calendar, BookOpen, Clock, ShieldCheck } from "lucide-react";

interface UnlockedChapter {
  mangaId: string;
  mangaTitle: string;
  chapterNum: number;
}

export default function WalletPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unlockedChapters, setUnlockedChapters] = useState<UnlockedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          
          if (snap.exists()) {
            const data = snap.data();
            setProfile(data);

            // Койноор нээсэн бүлгүүдийн (unlockedChapters) датаг уншиж цэгцлэх
            if (data.unlockedChapters) {
              const chaptersData = data.unlockedChapters;
              const list: UnlockedChapter[] = Object.keys(chaptersData)
                .filter(key => chaptersData[key] === true)
                .map(key => {
                  // Жишээ хадгалалт: "solo-leveling_ch15" эсвэл "blue-lock_ch6"
                  const parts = key.split("_ch");
                  const mId = parts[0] || "unknown";
                  const chNum = parseInt(parts[1] || "0", 10);
                  
                  return {
                    mangaId: mId,
                    mangaTitle: mId.replace("-", " ").toUpperCase(),
                    chapterNum: chNum
                  };
                });
              setUnlockedChapters(list);
            }
          }
        } catch (error) {
          console.error("Мэдээлэл татахад алдаа гарлаа:", error);
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        
        {/* Header (Профайл хуудастай ижил сүрлэг том бүтэц) */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Миний хэтэвч</h1>
          <button
            onClick={() => router.back()}
            className="rounded-full border border-[#232A35] p-2 hover:border-green-500 text-gray-400 hover:text-white transition active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
        </div>

        {/* ҮНДСЭН ХЭТЭВЧНИЙ КАРТ (Профайл хуудастай ижил том бөөрөнхий хайрцаг) */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#232A35]/40 pb-4 mb-4">
            <div className="rounded-xl bg-green-500/10 p-2.5 text-green-400 border border-green-500/20">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Одоогийн үлдэгдэл</p>
              <h2 className="text-2xl font-black text-green-500 font-mono mt-0.5">
                {profile?.coins ?? 0} <span className="text-sm font-bold text-gray-400">Coin</span>
              </h2>
            </div>
          </div>

          {/* Эрхийн мэдээлэл харуулах хэсэг */}
          <div className="space-y-3 text-sm font-semibold">
            <div className="flex items-center justify-between border-b border-[#232A35]/30 pb-2.5">
              <span className="text-gray-400 font-medium">Эрхийн төрөл</span>
              <span className="rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-0.5 text-xs text-green-400 font-bold uppercase tracking-wide">
                {profile?.accessType ?? "Free"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-[#232A35]/30 pb-2.5">
              <div className="flex items-center gap-2 text-gray-400 font-medium">
                <Calendar size={14} className="text-gray-500" />
                <span>Эхэлсэн өдөр</span>
              </div>
              <span className="text-gray-300 font-mono text-xs">{profile?.accessStart || "-"}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 font-medium">
                <Clock size={14} className="text-gray-500" />
                <span>Дуусах өдөр</span>
              </div>
              <span className="text-gray-300 font-mono text-xs">{profile?.accessEnd || "-"}</span>
            </div>
          </div>

          {/* Койн нэмж цэнэглэх товчлуур */}
          <button
            onClick={() => router.push("/get-access")}
            className="mt-6 w-full rounded-2xl bg-green-500 py-4 text-sm font-black text-black transition-all hover:bg-green-400 active:scale-[0.99] uppercase tracking-wider shadow-lg shadow-green-500/5"
          >
            Coin болон Эрх авах
          </button>
        </div>

        {/* КОЙНООР НЭЭСЭН БҮЛГҮҮДИЙН ТҮҮХ (Том бөөрөнхий хайрцаг) */}
        <div className="mt-5 rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-green-400">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-base font-bold tracking-tight">Нээсэн бүлгүүд ({unlockedChapters.length})</h3>
          </div>

          {unlockedChapters.length === 0 ? (
            <div className="py-8 text-center text-gray-500 space-y-3">
              <BookOpen size={36} className="mx-auto text-gray-600" strokeWidth={1.5} />
              <p className="text-xs font-medium text-gray-400">Та одоогоор койноор бүлэг нээгээгүй байна.</p>
            </div>
          ) : (
            <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
              {unlockedChapters.map((ch, index) => (
                <div
                  key={index}
                  onClick={() => router.push(`/manga/${ch.mangaId}`)}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[#232A35] bg-[#0B0F14]/60 p-3.5 cursor-pointer hover:border-green-500/40 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-lg bg-green-500/5 p-2 text-green-400 border border-green-500/10 group-hover:bg-green-500 group-hover:text-black transition-all duration-200">
                      <BookOpen size={14} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-gray-200 truncate group-hover:text-green-400 transition-colors">
                        {ch.mangaTitle}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        Нээсэн бүлэг
                      </p>
                    </div>
                  </div>
                  
                  <span className="rounded-xl bg-[#141922] border border-[#232A35] px-3 py-1 text-xs font-bold text-green-500 font-mono flex-shrink-0">
                    Бүлэг {ch.chapterNum}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
