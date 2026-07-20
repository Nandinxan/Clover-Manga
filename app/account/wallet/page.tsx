"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { ArrowLeft, Wallet, Calendar, BookOpen, Clock, ShieldCheck } from "lucide-react";

interface UnlockedChapter {
  mangaId: string;
  mangaTitle: string;
  chapterNum: number;
  unlockedAt: string; 
  expiresAt: string;  
}

// 🚀 БҮХ ХУГАЦААГ ЗӨВХӨН ОН-САР-ӨДӨР БОЛГОЖ ФОРМАТЛАХ УХААЛАГ ФУНКЦ
const formatDate = (isoString: string | null | undefined): string => {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; 
  } catch (e) {
    return "-";
  }
};

// 🚀 ХУГАЦАА ДУУССАН ЭСЭХИЙГ ШАЛГАХ ФУНКЦ
const isExpired = (isoString: string | null | undefined): boolean => {
  if (!isoString) return false;
  try {
    const expiryDate = new Date(isoString);
    return new Date() > expiryDate; 
  } catch (e) {
    return false;
  }
};
export default function WalletPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unlockedChapters, setUnlockedChapters] = useState<UnlockedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeProfile = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            let updates: any = {}; 
            const nowISO = new Date().toISOString();

            // 🚀 1. VIP ЭРХ ДУУССАН ЭСЭХИЙГ АВТОМАТ ШАЛГАЖ ХААХ
            if (data.accessType && data.accessType !== "Free" && data.accessEnd) {
              if (isExpired(data.accessEnd)) {
                updates.accessType = "Free";
                updates.accessEnd = null;
                updates.accessStart = null; 
              }
            }

            // 🚀 ЗАСВАР: ЗӨВХӨН PREMIUM ЭРХТЭЙ ҮЕД ЭХЭЛСЭН ӨДРИЙГ НӨХӨХ ЛОГИК
            if (data.accessType && data.accessType !== "Free" && !data.accessStart) {
              const startDate = data.createdAt 
                ? (data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date(data.createdAt).toISOString())
                : nowISO;
              updates.accessStart = startDate;
              data.accessStart = startDate;
            }

            setProfile({ ...data, ...updates });

            // 🚀 2. КОЙНООР НЭЭСЭН БҮЛГҮҮДИЙН 1 ЖИЛИЙН ХУГАЦААГ ШАЛГАЖ АВТОМАТ ТҮГЖИХ
            if (data.unlockedChapters) {
              const chaptersData = data.unlockedChapters;
              const list: UnlockedChapter[] = [];
              let chapterUpdates: any = { ...chaptersData };
              let hasExpiredChapters = false;

              Object.keys(chaptersData).forEach(key => {
                if (chaptersData[key] === true || typeof chaptersData[key] === 'string') {
                  const parts = key.split("_ch");
                  const mId = parts[0] || "unknown";
                  const chNum = parseInt(parts[1] || "0", 10);
                  
                  const unlockedDateStr = typeof chaptersData[key] === 'string' 
                    ? chaptersData[key] 
                    : (data.createdAt 
                        ? (data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date(data.createdAt).toISOString())
                        : nowISO);
                  
                  const unlockedDate = new Date(unlockedDateStr);
                  const expiryDate = new Date(unlockedDateStr);
                  expiryDate.setFullYear(unlockedDate.getFullYear() + 1); 

                  // 🔒 Хугацаа нь дууссан бол АВТОМАТ УСТГАЖ ТҮГЖИНЭ
                  if (isExpired(expiryDate.toISOString())) {
                    delete chapterUpdates[key]; 
                    hasExpiredChapters = true;
                  } else {
                    list.push({
                      mangaId: mId,
                      mangaTitle: mId.replace(/-/g, " ").toUpperCase(),
                      chapterNum: chNum,
                      unlockedAt: unlockedDate.toISOString(),
                      expiresAt: expiryDate.toISOString()
                    });
                  }
                }
              });

              if (hasExpiredChapters) {
                updates.unlockedChapters = chapterUpdates;
              }
              setUnlockedChapters(list);
            }

            if (Object.keys(updates).length > 0) {
              await updateDoc(userRef, updates);
            }
          }
        }, (error) => {
          console.error("Хэтэвчний дата уншихад алдаа гарлаа:", error);
        });

      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </main>
    );
  }
  // Хэрэглэгч VIP эрхтэй эсэхийг шалгах ухаалаг хувьсагч
  const isPremiumUser = profile?.accessType && profile.accessType !== "Free";

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Миний хэтэвч</h1>
          <button
            onClick={() => router.back()}
            className="rounded-full border border-[#232A35] p-2 hover:border-green-500 text-gray-400 hover:text-white transition active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
        </div>

        {/* ҮНДСЭН ХЭТЭВЧНИЙ КАРТ */}
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

            {/* 🚀 ЗАСВАР: ЗӨВХӨН VIP ЭРХТЭЙ ҮЕД Л ХУГАЦААНЫ МӨРҮҮДИЙГ ХАРАГДУУЛНА */}
            {isPremiumUser && (
              <>
                <div className="flex items-center justify-between border-b border-[#232A35]/30 pb-2.5">
                  <div className="flex items-center gap-2 text-gray-400 font-medium">
                    <Calendar size={14} className="text-gray-500" />
                    <span>Эхэлсэн өдөр</span>
                  </div>
                  <span className="text-gray-300 font-mono text-xs">
                    {formatDate(profile.accessStart)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 font-medium">
                    <Clock size={14} className="text-gray-500" />
                    <span>Дуусах өдөр</span>
                  </div>
                  <span className="text-gray-300 font-mono text-xs">
                    {formatDate(profile.accessEnd)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Coin нэмж цэнэглэх товчлуур */}
          <button
            onClick={() => router.push("/get-access")}
            className="mt-6 w-full rounded-2xl bg-green-500 py-4 text-sm font-black text-black transition-all hover:bg-green-400 active:scale-[0.99] uppercase tracking-wider shadow-lg shadow-green-500/5"
          >
            Coin болон Эрх авах
          </button>
        </div>

        {/* КОЙНООР НЭЭСЭН БҮЛГҮҮДИЙН ТҮҮХ */}
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
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
              {unlockedChapters.map((ch, index) => (
                <div
                  key={index}
                  onClick={() => router.push(`/manga/${ch.mangaId}`)}
                  className="flex flex-col gap-2 rounded-2xl border border-[#232A35] bg-[#0B0F14]/60 p-4 cursor-pointer hover:border-green-500/40 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-green-500/5 p-2 text-green-400 border border-green-500/10 group-hover:bg-green-500 group-hover:text-black transition-all duration-200">
                        <BookOpen size={14} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-gray-200 truncate group-hover:text-green-400 transition-colors">
                          {ch.mangaTitle}
                        </h4>
                      </div>
                    </div>
                    
                    <span className="rounded-xl bg-[#141922] border border-[#232A35] px-3 py-1 text-xs font-bold text-green-500 font-mono flex-shrink-0">
                      Бүлэг {ch.chapterNum}
                    </span>
                  </div>

                  {/* НЭЭСЭН ӨДӨР БОЛОН АВТОМАТ 1 ЖИЛИЙН ДАРАА ДУУСАХ ӨДӨР */}
                  <div className="flex flex-col gap-1 border-t border-[#232A35]/30 pt-2 text-[10px] text-gray-400 font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><Calendar size={10} className="text-gray-500" /> Нээсэн өдөр:</span>
                      <span className="text-gray-300 font-mono">{formatDate(ch.unlockedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><Clock size={10} className="text-gray-500" /> Дуусах өдөр (1 жил):</span>
                      <span className="text-green-400 font-mono">{formatDate(ch.expiresAt)}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
