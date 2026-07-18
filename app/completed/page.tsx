"use client";

import { ArrowLeft, Star, BookOpen, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface MangaType {
  id: string;
  title: string;
  genre: string;
  chapters: string;
  rating: number;
  views: string;
  reviews: string;
  coverUrl: string;
}

export default function CompletedPage() {
  const router = useRouter();
  const [mangaList, setMangaList] = useState<MangaType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedManga = async () => {
      try {
        const q = query(collection(db, "manga"), where("status", "==", "completed"));
        const querySnapshot = await getDocs(q);
        
        const list = await Promise.all(querySnapshot.docs.map(async (mangaDoc) => {
          const data = mangaDoc.data();
          
          let totalChaptersText = "0 бүлэг";
          try {
            const chapQuery = query(collection(db, "chapters"), where("manga_id", "==", mangaDoc.id));
            const chapSnap = await getDocs(chapQuery);
            if (!chapSnap.empty) {
              totalChaptersText = `${chapSnap.size} бүлэг`;
            }
          } catch (e) { console.error(e); }

          const rawViews = data.views || 0;
          const formattedViews = rawViews >= 1000000 
            ? `${(rawViews / 1000000).toFixed(1)}M` 
            : rawViews >= 1000 
              ? `${(rawViews / 1000).toFixed(1)}K` 
              : `${rawViews}`;

          return {
            id: mangaDoc.id,
            title: data.title || "Гарчиггүй",
            genre: data.genres ? data.genres.join(" • ") : "Манга",
            chapters: totalChaptersText,
            rating: data.rating || 5.0,
            views: formattedViews,
            reviews: "0",
            coverUrl: data.cover_image || "/placeholder-cover.jpg",
          };
        }));

        setMangaList(list);
        setLoading(false);
      } catch (error) {
        console.error("Дууссан манга уншихад алдаа гарлаа:", error);
        setLoading(false);
      }
    };

    fetchCompletedManga();
  }, []);
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="mx-auto max-w-7xl px-6 md:px-8 py-10">
        
        {/* Гарчиг болон Буцах товчлуур */}
        <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Дууссан манга
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
            // 🚀 all-manga шиг гоё ачааллах маск (Skeleton) харагддаг болгов
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`completed-skeleton-${idx}`} className="animate-pulse border border-[#222933] bg-[#141922]/40 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col h-[340px]">
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
            mangaList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.replaceState({ usr: { from: "/completed" } }, "");
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
                  <div className="absolute top-2 left-2 rounded-lg bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[9px] font-bold text-green-400 uppercase tracking-wider backdrop-blur-md">
                    Дуuссан
                  </div>
                </div>

                {/* Текстийн мэдээллийн хэсэг */}
                <div className="p-3 md:p-5 flex flex-col flex-1 justify-between bg-[#141922]">
                  <div>
                    <h2 className="text-sm md:text-lg font-bold truncate text-gray-200 group-hover:text-green-400 transition-colors duration-200 tracking-wide">
                      {item.title}
                    </h2>
                    
                    {/* Төрөл болон Бүлгийн мэдээлэл */}
                    <div className="mt-1.5 flex items-center justify-between text-[11px] md:text-xs font-bold text-green-500">
                      <span className="truncate max-w-[60%]">{item.genre}</span>
                      <span className="text-gray-400 flex items-center gap-1 font-medium flex-shrink-0">
                        <BookOpen size={11} /> {item.chapters}
                      </span>
                    </div>
                  </div>

                  {/* Хандалт, Сэтгэгдэл болон Одон үнэлгээний доод талбар */}
                  <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between text-[10px] md:text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 hover:text-gray-400 transition-colors">
                        <Eye size={12} className="text-gray-600" /> {item.views}
                      </span>
                      <span className="flex items-center gap-1 hover:text-gray-400 transition-colors">
                        <MessageSquare size={11} className="text-gray-600" /> {item.reviews}
                      </span>
                    </div>
                    
                    <span className="text-green-500 font-bold flex items-center gap-0.5 bg-green-500/5 px-1.5 py-0.5 rounded-lg border border-green-500/10">
                      <Star size={11} className="fill-green-500" /> {item.rating}
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
