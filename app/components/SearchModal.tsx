"use client";

import { useEffect, useState } from "react";
import { Search, X, Clock, BookOpen, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; // Урд талын firebase холболтыг нэмэв
import { collection, getDocs } from "firebase/firestore"; // Шаардлагатай функцуудыг нэмэв

interface SearchMangaType {
  id: string;
  title: string;
  coverUrl: string;
  genre: string;
}

export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false); // 🟩 Hydration-оос сэргийлэх төлөв
  
  // 🚀 Гараар шивсэн датаны оронд датабаазаас унших State үүсгэв
  const [dbMangaList, setDbMangaList] = useState<SearchMangaType[]>([]);
  const router = useRouter();

  // 🟩 ШИНЭЧЛЭВ: Хуудас хөтөч дээр бүрэн ачаалж дууссаныг баталгаажуулна + Firebase-ээс дата урьдчилж ачааллана
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("recent-searches");
    if (saved) {
      setRecent(JSON.parse(saved));
    }

    // 🚀 Модал ажиллахад датабаазаас бүх мангыг нэг удаа уншиж авна
    const loadMangaForSearch = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "manga"));
        const list = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Гарчиггүй",
            coverUrl: data.cover_image || "https://unsplash.com",
            genre: data.genres ? data.genres.join(" • ") : "Манга",
          };
        });
        setDbMangaList(list);
      } catch (error) {
        console.error("Хайлтад зориулж дата уншихад алдаа гарлаа:", error);
      }
    };

    loadMangaForSearch();
  }, []);

  // 🚀 Гараар бичсэн дата биш бодит датабаазаас хайлтын үгээр шүүнэ
  const filtered = dbMangaList.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const saveRecent = (title: string) => {
    const updated = [title, ...recent.filter((r) => r !== title)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("recent-searches", JSON.stringify(updated));
  };

  const removeRecent = (title: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const updated = recent.filter((r) => r !== title);
    setRecent(updated);
    localStorage.setItem("recent-searches", JSON.stringify(updated));
  };

  // Хэрэв клиент тал дээр ачаалж дуусаагүй бол сервертэй зөрүүлэхгүйн тулд зөвхөн үндсэн товчийг харуулна
  if (!isMounted) {
    return (
      <button className="flex items-center gap-2 rounded-xl border border-[#232A35] bg-[#141922]/60 px-5 py-2.5 text-sm text-gray-400">
        <Search size={16} className="text-gray-400" />
        <span>Хайх</span>
      </button>
    );
  }

  return (
    <>
      {/* Хайлтын үндсэн товчлуур */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-[#232A35] bg-[#141922]/60 px-5 py-2.5 text-sm text-gray-400 backdrop-blur-sm transition-all duration-300 hover:border-green-500/50 hover:text-white active:scale-[0.98]"
      >
        <Search size={16} className="text-gray-400" />
        <span>Хайх</span>
      </button>
     {/* Попап модал цонх */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-20 px-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-white/5 bg-[#141922] p-6 shadow-2xl relative border-t-white/[0.03]">

            {/* Толгой хэсэг */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-green-500" />
                <h2 className="text-lg font-bold text-white tracking-wide">Манга хайх</h2>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                }}
                className="rounded-xl border border-white/5 bg-[#0B0F14]/50 p-2 text-gray-400 hover:border-red-500/30 hover:text-red-400 transition-all active:scale-90"
              >
                <X size={16} />
              </button>
            </div>

            {/* Оролтын талбар */}
            <div className="relative mt-2">
              <input
                autoFocus
                placeholder="Унших мангагаа бичнэ үү..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-[#232A35] bg-[#0B0F14] px-5 py-4 pl-12 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-300 focus:border-green-500/60 focus:shadow-[0_0_25px_rgba(34,197,94,0.1)]"
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>

            {/* Саяхны хайлтууд хэсэг */}
            {search === "" ? (
              <div className="mt-6 border-t border-white/5 pt-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-bold text-gray-400 tracking-wider uppercase">
                  <Clock size={12} className="text-gray-500" />
                  <h3>Саяхны хайлтууд</h3>
                </div>

                {recent.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">Саяхны хайлт байхгүй байна.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recent.map((item) => (
                      <div
                        key={item}
                        onClick={() => setSearch(item)}
                        className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#0B0F14]/60 px-3.5 py-2 text-xs font-semibold text-gray-300 cursor-pointer hover:border-green-500/40 hover:bg-green-500/5 hover:text-green-400 transition-all duration-200"
                      >
                        <span>{item}</span>
                        <button
                          onClick={(e) => removeRecent(item, e)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Илэрцийн жагсаалт харуулах хэсэг */
              <div className="mt-5 max-h-[320px] overflow-y-auto space-y-2 border-t border-white/5 pt-4 pr-1 scrollbar-thin">
                {filtered.map((manga) => {
                  return (
                    <button
                      key={manga.id}
                      onClick={() => {
                        saveRecent(manga.title);
                        setOpen(false);
                        setSearch("");
                        if (typeof window !== "undefined") {
                          window.history.replaceState({ usr: { from: "/" } }, "");
                        }
                        // 🚀 ЗАСВАРЛАВ: Гараар үүсгэсэн хаяг биш датабаазын жинхэнэ id-аар үсэрнэ
                        router.push(`/manga/${manga.id}?from=all`);
                      }}
                      className="flex w-full items-center gap-4 rounded-xl border border-transparent bg-transparent p-2 text-left transition-all duration-200 hover:border-white/5 hover:bg-[#0B0F14]/70 group"
                    >
                      <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#232A35]/40 border border-white/5 shadow-md">
                        <img
                          src={manga.coverUrl} // 🚀 ЗАСВАРЛАВ: manga.image-ийг coverUrl болгов
                          alt={manga.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-200 group-hover:text-green-400 transition-colors duration-200 truncate tracking-wide">
                          {manga.title}
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-1">
                          <BookOpen size={10} className="text-gray-500" />
                          {manga.genre}
                        </p>
                      </div>
                      
                      <ChevronRight size={16} className="text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-green-500 transition-all duration-200 mr-2" />
                    </button>
                  );
                })}

                {filtered.length === 0 && (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-sm font-bold text-gray-400">Манга олдсонгүй</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}