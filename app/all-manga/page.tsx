"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteField, collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Heart, Star, Eye, Tag, BookOpen } from "lucide-react"; 

interface MangaType {
  id: string;
  title: string;
  genre: string;
  chapter: string;
  rating: number;
  views: number;
  status: string;
  image: string;
}

export default function AllMangaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // 🚀 Гараар шивсэн mangas массивын оронд датабаазаас унших State үүсгэв
  const [mangas, setMangas] = useState<MangaType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Хэрэглэгчийн төлөв болон дуртай жагсаалт унших
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().favorites) {
            setFavorites(Object.keys(snap.data().favorites));
          }
        } catch (error) {
          console.error("Дуртай жагсаалт уншихад алдаа гарлаа:", error);
        }
      } else {
        setFavorites([]);
      }
    });

    // 2. БҮХ МАНГЫГ ФАЙРБЕЙСЭЭС АВТОМАТ УНШИХ ЛОГИК
    const fetchAllManga = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "manga"));
        
        const list = await Promise.all(querySnapshot.docs.map(async (mangaDoc) => {
          const data = mangaDoc.data();
          
          // Хамгийн сүүлийн бүлгийг хайх ухаалаг засал
          let lastChapterText = data.status === "completed" ? "Дууссан" : "Бүлэг 1";
          try {
            const chapQuery = query(collection(db, "chapters"), where("manga_id", "==", mangaDoc.id));
            const chapSnap = await getDocs(chapQuery);
            if (!chapSnap.empty) {
              const chapNumbers = chapSnap.docs.map(d => d.data().chapter_number || 1);
              lastChapterText = `Бүлэг ${Math.max(...chapNumbers)}`;
            }
          } catch (e) { console.error(e); }

          return {
            id: mangaDoc.id,
            title: data.title || "Гарчиггүй",
            genre: data.genres ? data.genres.join(" / ") : "Манга",
            chapter: lastChapterText,
            rating: data.rating || 5.0, // Хэрэв админ дээр байхгүй бол 5.0 fallback
            views: data.views || 0,
            status: data.status === "completed" ? "Дууссан" : "Үргэлжилж буй",
            image: data.cover_image || "https://unsplash.com",
          };
        }));

        setMangas(list);
        setLoading(false);
      } catch (error) {
        console.error("Бүх мангыг уншихад алдаа гарлаа:", error);
        setLoading(false);
      }
    };

    fetchAllManga();
    return () => unsubscribe();
  }, []);

  const toggleFavorite = async (manga: any) => {
    if (!user) {
      alert("Та дуртай мангаар хадгалахын тулд эхлээд нэвтэрнэ үү.");
      router.push("/login");
      return;
    }

    const isFav = favorites.includes(manga.id);
    const userRef = doc(db, "users", user.uid);
    try {
      if (isFav) {
        await updateDoc(userRef, {
          [`favorites.${manga.id}`]: deleteField()
        });
        setFavorites(prev => prev.filter(id => id !== manga.id));
      } else {
        await updateDoc(userRef, {
          [`favorites.${manga.id}`]: {
            title: manga.title,
            coverUrl: manga.image,
            author: manga.genre
          }
        });
        setFavorites(prev => [...prev, manga.id]);
      }
    } catch (error) {
      console.error("Дуртай жагсаалтыг шинэчлэхэд алдаа гарлаа:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">

        {/* Header - Нарийхан, цэвэрхэн дизайн */}
        <div className="flex items-center justify-between border-b border-[#232A35]/30 pb-4">
          <button
            onClick={() => router.push("/")} 
            className="flex items-center gap-2 rounded-xl border border-[#232A35] bg-[#141922] px-4 py-2.5 text-xs font-semibold text-gray-400 transition-all hover:border-gray-500 hover:text-white"
          >
            <ArrowLeft size={14} /> Буцах
          </button>
          <h1 className="text-xl font-bold md:text-2xl tracking-wide text-white">Бүх манга</h1>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-[#141922] border border-[#232A35]/60 px-3 py-1.5 rounded-lg">
            <BookOpen size={13} className="text-green-500" />
            <span>Нийт {mangas.length}</span>
          </div>
        </div>

        {/* Манганууд (Responsive grid бүтэц) */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {loading ? (
            // 🚀 Дата ачааллаж байх үед харуулах ухаалаг маск
            Array.from({ length: 7 }).map((_, idx) => (
              <div key={`all-manga-skeleton-${idx}`} className="animate-pulse border border-[#232A35] bg-[#141922]/30 rounded-2xl overflow-hidden flex flex-col h-[280px]">
                <div className="aspect-[3/4] w-full bg-[#232A35]/30" />
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div className="h-4 bg-[#232A35]/50 rounded w-5/6" />
                  <div className="h-3 bg-[#232A35]/30 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : (
            mangas.map((manga) => {
              const isFavorite = favorites.includes(manga.id);
              
              return (
                <div
                  key={manga.id}
                  onClick={() => router.push(`/manga/${manga.id}?from=all`)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-[#232A35] bg-[#141922]/50 transition-all duration-300 hover:border-green-500/50 hover:bg-[#141922] relative flex flex-col justify-between shadow-lg shadow-black/20 animate-fadeIn"
                >
                  {/* Кавер Зургийн Хэсэг */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-black/10">
                    
                    {/* Дуртай жагсаалтад нэмэх товчлуур */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(manga);
                      }}
                      className={`absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md transition-all active:scale-95 ${
                        isFavorite 
                          ? "bg-green-500/20 border border-green-500/40 text-green-400" 
                          : "bg-black/40 border border-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Heart 
                        size={13} 
                        className="transition-colors"
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                    </button>

                    <img
                      src={manga.image}
                      alt={manga.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    {/* Төлөвийн шошго */}
                    <span
                      className={`absolute left-2 top-2 rounded-lg px-2 py-0.5 text-[9px] font-bold border ${
                        manga.status === "Дууссан"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-green-500/10 border-green-500/30 text-green-400"
                      }`}
                    >
                      {manga.status}
                    </span>
                  </div>

                  {/* Мэдээллийн Хэсэг */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-gray-200 transition group-hover:text-green-400 line-clamp-1">
                        {manga.title}
                      </h3>
                    {/* 🏷️ ТӨРӨЛ (Genre) */}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                      <Tag size={10} className="text-green-500/70" />
                      <span className="line-clamp-1">{manga.genre}</span>
                    </div>
                  </div>

                  {/* Доод талын статистик (Үнэлгээ болон Үзэлт) */}
                  <div className="mt-3 flex items-center justify-between text-[10px] border-t border-[#232A35]/30 pt-2 bg-gradient-to-t from-transparent">
                    
                    {/* ⭐ ҮНЭЛГЭЭ */}
                    <span className="flex items-center gap-0.5 text-yellow-500 font-bold bg-yellow-500/5 px-1.5 py-0.5 rounded border border-yellow-500/10">
                      <Star size={10} className="fill-yellow-500 text-yellow-500" /> 
                      {manga.rating}
                    </span>
                    
                    {/* 👁️ ҮЗЭЛТ */}
                    <span className="flex items-center gap-1 text-gray-400 font-semibold bg-[#232A35]/30 px-1.5 py-0.5 rounded border border-transparent">
                      <Eye size={11} className="text-gray-500" /> 
                      {manga.views >= 1000000 
                        ? `${(manga.views / 1000000).toFixed(1)}M` 
                        : `${(manga.views / 1000).toFixed(0)}K`
                      }
                    </span>
                  </div>
                </div>

              </div>
            );
          }) // map-ийн хаалт
        )} {/* loading нөхцөлт хаалт */}
        </div>

      </div>
    </main>
  );
}

   
                    
                