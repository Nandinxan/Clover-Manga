"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Star, BookOpen, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth"; 
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"; 

interface HistoryMangaType {
  id: string;
  title: string;
  genre: string;
  chapter: string;
  progress: number;
  rating: number;
  views: string;
  coverUrl: string;
  totalChaptersCount: number; 
  readChaptersCount: number;  
}

export default function ContinueReadingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [mangaList, setMangaList] = useState<HistoryMangaType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          
          if (snap.exists() && snap.data().history) {
            const historyData = snap.data().history;
            const historyKeys = Object.keys(historyData);

            const chaptersSnap = await getDocs(collection(db, "chapters"));
            const allChapters = chaptersSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

            const list = await Promise.all(historyKeys.map(async (key) => {
              const mangaRef = doc(db, "manga", key);
              const mangaSnap = await getDoc(mangaRef);
              const mangaDbData = mangaSnap.exists() ? mangaSnap.data() : {};

              const lastChapterStr = historyData[key].lastChapter || "Бүлэг 1";
              const currentChapterNum = parseInt(lastChapterStr.replace(/[^0-9]/g, "")) || 1;
              
              const totalChapters = allChapters.filter(c => c.manga_id === key).length || 1;
              const calculatedProgress = Math.min(Math.round((currentChapterNum / totalChapters) * 100), 100);

              const rawViews = mangaDbData.views || 0;
              const formattedViews = rawViews >= 1000000 
                ? `${(rawViews / 1000000).toFixed(1)}M` 
                : rawViews >= 1000 
                  ? `${(rawViews / 1000).toFixed(1)}K` 
                  : `${rawViews}`;

              return {
                id: key,
                title: historyData[key].title || "Гарчиггүй manga",
                genre: mangaDbData.genres ? mangaDbData.genres.join(" • ") : "Манга",
                chapter: lastChapterStr,
                progress: calculatedProgress,
                rating: mangaDbData.rating || 5.0,
                views: formattedViews,
                coverUrl: historyData[key].coverUrl || "/placeholder-cover.jpg",
                updatedAt: historyData[key].updatedAt || "",
                totalChaptersCount: totalChapters, 
                readChaptersCount: currentChapterNum 
              };
            }));
            
            list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            setMangaList(list);
          }
        } catch (error) {
          console.error("Түүх уншихад алдаа гарлаа:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!isMounted) {
    return <div className="min-h-screen bg-[#0B0F14]" />;
  }
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="mx-auto max-w-7xl px-6 md:px-8 py-10">
        {/* Гарчиг болон Буцах товчлуур */}
        <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Үргэлжлүүлэн унших
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">Одоогоор үргэлжлүүлэн уншиж байгаа цувралууд</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-[#232A35] bg-[#141922] p-2.5 text-gray-400 hover:border-green-500 hover:text-green-500 transition active:scale-95 flex items-center justify-center shadow-lg"
            title="Буцах"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-400 font-medium mb-8">
          Таны уншиж буй түүх болон явцын мэдээлэл.
        </p>

        {/* НҮҮР ХУУДАСНЫ КАРТТАЙ ИЖИЛ ТОМ СҮРЛЭГ ГРИД БҮТЭЦ */}
        <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {loading ? (
            // 🚀 Дата уншиж байх явцад харагдах Skeleton маск
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`continue-skeleton-${idx}`} className="animate-pulse border border-[#222933] bg-[#141922]/40 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-[340px]">
                <div className="aspect-[3/4] w-full bg-[#232A35]/30" />
                <div className="p-3 md:p-5 flex flex-col flex-1 justify-between bg-[#141922] space-y-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-[#232A35]/50 rounded w-3/4" />
                    <div className="h-3 bg-[#232A35]/30 rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-[#232A35]/20 rounded w-full border-t border-white/[0.03] pt-3" />
                </div>
              </div>
            ))
          ) : mangaList.length === 0 ? (
            // 🚀 Хэрэглэгч нэвтрээгүй эсвэл түүх нь хоосон байвал цагаан харагдуулахгүй
            <div className="col-span-full py-16 text-center text-gray-500 text-sm font-medium">
              Танд одоогоор үргэлжлүүлэн уншиж буй түүх байхгүй байна.
            </div>
          ) : (
            mangaList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.replaceState({ usr: { from: "/continue-reading" } }, "");
                  }
                  router.push(`/manga/${item.id}?from=all`);
                }}
                className="group overflow-hidden rounded-2xl md:rounded-3xl border border-[#222933] bg-[#141922] transition duration-300 hover:-translate-y-1 hover:border-green-500 cursor-pointer flex flex-col h-full hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)] animate-fadeIn"
              >
                {/* Босоо 3:4 кавер зураг */}
                <div className="aspect-[3/4] w-full bg-[#232A35]/40 relative overflow-hidden">
                  <img 
                    src={item.coverUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Текстийн хэмжээ, зай, фонтыг Completed хуудастай 100% ижил том, сүрлэг хатуу болгов */}
                <div className="p-3 md:p-5 flex flex-col flex-1 justify-between bg-[#141922]">
                  <div>
                    <h2 className="text-sm md:text-lg font-bold truncate text-gray-200 group-hover:text-green-400 transition-colors duration-200 tracking-wide">
                      {item.title}
                    </h2>
                    
                    <div className="mt-1.5 flex items-center justify-between text-[11px] md:text-xs font-bold text-green-500">
                      <span className="truncate max-w-[60%]">{item.genre}</span>
                      <span className="text-gray-400 flex items-center gap-1 font-medium flex-shrink-0">
                        <BookOpen size={11} /> {item.chapter}
                      </span>
                    </div>
                  </div>

                  {/* Доод талын Прогресс баар болон Үнэлгээ харуулдаг хэсэг */}
                  <div className="mt-4 pt-3 border-t border-white/[0.03] flex flex-col gap-2 text-[10px] md:text-xs text-gray-500 font-medium">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2B313D]">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="text-green-500 font-bold flex items-center gap-0.5 bg-green-500/5 px-1.5 py-0.5 rounded-lg border border-green-500/10">
                        {item.progress}% уншсан ({item.readChaptersCount}/{item.totalChaptersCount})
                      </span>
                      <span className="text-green-500 font-bold flex items-center gap-0.5 bg-green-500/5 px-1.5 py-0.5 rounded-lg border border-green-500/10">
                        <Star size={11} className="fill-green-500" /> {item.rating}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}
