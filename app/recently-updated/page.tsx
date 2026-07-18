"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Clock, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; 
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from "firebase/firestore";

interface RecentMangaType {
  id: string;
  title: string;
  coverUrl: string;
  chapter: string;
  genre: string;
  time: string;
  views: string;
}

export default function RecentlyUpdatedPage() {
  const router = useRouter();
  
  // 🚀 Бодит дата унших болон ачааллах төлөвүүд
  const [recentList, setRecentList] = useState<RecentMangaType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentUpdates = async () => {
      try {
        // 1. chapters цуглуулгаас хамгийн сүүлд нэмэгдсэн 10 бүлгийг шүүнэ
        const chapQuery = query(
          collection(db, "chapters"), 
          orderBy("chapter_number", "desc"), 
          limit(10)
        );
        const chapSnap = await getDocs(chapQuery);
        
        if (chapSnap.empty) {
          setLoading(false);
          return;
        }

        // Давхардаагүй мангын ID-нуудыг шүүж авах ухаалаг логик (6 ширхэгийг харуулна)
        const uniqueMangaIds = Array.from(new Set(chapSnap.docs.map(d => d.data().manga_id))).slice(0, 6);

        // 2. Манга бүрийн үндсэн мэдээллийг давхар хайж цуглуулна
        const list = await Promise.all(uniqueMangaIds.map(async (mangaId) => {
          const mangaRef = doc(db, "manga", mangaId);
          const mangaSnap = await getDoc(mangaRef);
          
          if (!mangaSnap.exists()) return null;
          const mangaData = mangaSnap.data();

          // Тухайн мангын хамгийн сүүлийн бүлгийн дугаарыг олно
          const specificChapQuery = query(collection(db, "chapters"), where("manga_id", "==", mangaId));
          const specificChapSnap = await getDocs(specificChapQuery);
          
          let maxChapter = 1;
          if (!specificChapSnap.empty) {
            const numbers = specificChapSnap.docs.map(d => d.data().chapter_number || 1);
            maxChapter = Math.max(...numbers);
          }

          // Үзэлтийн тоог K, M хэлбэрт шилжүүлэх
          const rawViews = mangaData.views || 0;
          const formattedViews = rawViews >= 1000000 
            ? `${(rawViews / 1000000).toFixed(1)}M` 
            : rawViews >= 1000 
              ? `${(rawViews / 1000).toFixed(1)}K` 
              : `${rawViews}`;

          return {
            id: mangaId,
            title: mangaData.title || "Гарчиггүй",
            coverUrl: mangaData.cover_image || "/placeholder-cover.jpg",
            chapter: `Бүлэг ${maxChapter}`,
            genre: mangaData.genres ? mangaData.genres.join(" • ") : "Манга",
            views: formattedViews,
            time: "Шинэ"
          };
        }));

        setRecentList(list.filter(item => item !== null) as RecentMangaType[]);
        setLoading(false);
      } catch (error) {
        console.error("Саяхан нэмэгдсэнийг уншихад алдаа гарлаа:", error);
        setLoading(false);
      }
    };

    fetchRecentUpdates();
  }, []);

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="mx-auto max-w-7xl px-6 md:px-8 py-10">

        {/* Гарчиг болон Буцах товчлуур */}
        <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Саяхан нэмэгдсэн
            </h1>
          </div>

          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-[#232A35] bg-[#141922] p-2.5 text-gray-400 hover:border-green-500 hover:text-green-500 transition active:scale-95 flex items-center justify-center shadow-lg"
            title="Буцах"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* НҮҮР ХУУДАСНЫ КАРТТАЙ ИЖИЛ ТОМ СҮРЛЭГ ГРИД БҮТЭЦ */}
        <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {loading ? (
            // 🚀 Дата уншиж байх явцад харагдах Skeleton маск
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`recent-page-skeleton-${idx}`} className="animate-pulse border border-[#222933] bg-[#141922]/40 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-[340px]">
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
          ) : (
            recentList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.replaceState({ usr: { from: "/recently-updated" } }, "");
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
                  <div className="absolute top-2 left-2 rounded-lg bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[9px] font-bold text-green-400 uppercase tracking-wider backdrop-blur-md flex items-center gap-1">
                    <Clock size={10} /> Шинэ бүлэг
                  </div>
                </div>

                {/* Мэдээллийн Хэсэг */}
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

                  {/* Доод талбар */}
                  <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between text-[10px] md:text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 hover:text-gray-400 transition-colors">
                        <Eye size={12} className="text-gray-600" /> {item.views}
                      </span>
                    </div>
                    
                    <span className="text-green-500 font-bold flex items-center gap-1 bg-green-500/5 px-2 py-0.5 rounded-lg border border-green-500/10">
                      {item.time}
                    </span>
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
