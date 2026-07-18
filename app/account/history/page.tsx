"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { ArrowLeft, BookOpen, Trash2, Clock, Calendar } from "lucide-react";

interface HistoryManga {
  id: string;
  title: string;
  coverUrl: string;
  lastChapter: string;
  updatedAt?: string;
}

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [historyList, setHistoryList] = useState<HistoryManga[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          
          if (snap.exists() && snap.data().history) {
            const historyData = snap.data().history;
            
            const list: HistoryManga[] = Object.keys(historyData).map(key => ({
              id: key,
              title: historyData[key].title || "Гарчиггүй манга",
              // 🚀 ТӨГС ЗАСВАРЛАВ: Хуучин буруу хадгалагдсан 'image' болон шинэ 'coverUrl'-ийн алиныг нь ч унахгүй уншина
              coverUrl: historyData[key].coverUrl || historyData[key].image || "/placeholder-cover.jpg",
              lastChapter: historyData[key].lastChapter || "Бүлэг дутуу",
              updatedAt: historyData[key].updatedAt || ""
            }));
            
            list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            setHistoryList(list);
          } else {
            setHistoryList([]);
          }
        } catch (error) {
          console.error("Уншсан түүх уншихад алдаа гарлаа:", error);
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const removeHistoryItem = async (mangaId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        [`history.${mangaId}`]: deleteField()
      });
      
      setHistoryList(prev => prev.filter(manga => manga.id !== mangaId));
    } catch (error) {
      console.error("Түүх устгахад алдаа гарлаа:", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent shadow-[0_0_15px_rgba(34,197,94,0.3)]"></div>
          <p className="text-xs text-gray-500 font-medium tracking-widest uppercase animate-pulse">Түүхийг ачаалж байна</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] bg-gradient-to-b from-[#0B0F14] to-[#070a0e] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-xl">
        
        {/* ТАНСАГ HEADER */}
        <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="rounded-2xl bg-green-500/10 p-2.5 text-green-400 border border-green-500/20 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.05)]">
              <Clock size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Уншсан түүх</h1>
              <p className="text-[11px] text-gray-500 font-medium tracking-wide mt-0.5">Таны хамгийн сүүлд уншсан манганууд</p>
            </div>
          </div>
          {/* 🟩 ЗАСВАРЛАВ: Шууд Миний аккаунт цэс рүү аюулгүй буцдаг болгов */}
          <button
            onClick={() => router.push("/account")}
            className="rounded-xl border border-white/5 bg-[#141922]/40 p-2.5 text-gray-400 hover:border-green-500/40 hover:text-green-400 hover:bg-green-500/5 transition-all duration-300 active:scale-95 backdrop-blur-md"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* ҮНДСЭН ХАЙРЦАГ */}
        <div className="rounded-3xl border border-white/5 bg-[#141922]/40 backdrop-blur-xl p-5 space-y-3.5 shadow-[0_0_40px_rgba(0,0,0,0.3)] border-t-white/[0.03]">
          {historyList.length === 0 ? (
            <div className="py-16 text-center space-y-6">
              <div className="mx-auto flex h-20 w-24 items-center justify-center rounded-3xl bg-white/[0.02] border border-white/5 text-gray-600 shadow-inner">
                <Clock size={40} strokeWidth={1.2} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-gray-300">Таны түүх хоосон байна</p>
                <p className="text-xs text-gray-500 max-w-[250px] mx-auto leading-relaxed">Таны уншсан манганы түүхүүд энд автоматаар хадгалагдах болно.</p>
              </div>
              <button 
                onClick={() => router.push("/")}
                className="rounded-2xl bg-green-500 px-7 py-3.5 text-xs font-black text-black transition-all duration-300 hover:scale-[1.03] hover:bg-green-400 active:scale-[0.98] mx-auto block uppercase tracking-widest shadow-lg shadow-green-500/20 font-black"
              >
                Унших
              </button>
            </div>
          ) : (
            historyList.map((manga) => (
              <div
                key={manga.id}
                onClick={() => router.push(`/manga/${manga.id}`)}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.03] bg-[#0B0F14]/70 p-3 cursor-pointer hover:border-green-500/30 hover:bg-[#141922]/50 transition-all duration-300 group hover:shadow-[0_0_25px_rgba(34,197,94,0.04)] relative overflow-hidden"
              >
                {/* Кавер зураг */}
                <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#141922] border border-white/5 shadow-xl relative">
                  <img
                    src={manga.coverUrl}
                    alt={manga.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Текст мэдээлэл */}
                <div className="flex-1 min-w-0 pr-2">
                  <h2 className="text-base font-bold text-gray-200 truncate group-hover:text-green-400 transition-colors duration-200 tracking-wide">
                    {manga.title}
                  </h2>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <span className="text-[11px] text-green-400 font-bold bg-green-500/10 border border-green-500/10 px-2 py-0.5 rounded-lg w-fit flex items-center gap-1">
                      <BookOpen size={10} strokeWidth={2.5} /> {manga.lastChapter}
                    </span>
                    {manga.updatedAt && (
                      <span className="text-[9px] text-gray-500 font-medium flex items-center gap-1.5 pl-0.5">
                        <Calendar size={10} className="text-gray-600" />
                        {new Date(manga.updatedAt).toLocaleDateString()} - {new Date(manga.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                </div>

                {/* Түүхээс устгах товчлуур */}
                <button
                  type="button"
                  onClick={(e) => removeHistoryItem(manga.id, e)}
                  className="rounded-xl p-2.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 opacity-60 hover:opacity-100 transition-all duration-200 flex-shrink-0 active:scale-90"
                  title="Түүхээс хасах"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}
