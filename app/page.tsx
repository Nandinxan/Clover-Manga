"use client";

import {
  CircleUser,
  ChevronDown,
  User,
  LogOut,
  ChevronRight,
  Clock,
  Sparkles,
  Search, // ← Томруулдаг шилний дүрсийг нэмж импортлов
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SearchModal from "./components/SearchModal";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

interface HistoryManga {
  id: string;
  title: string;
  coverUrl: string;
  lastChapter: string;
  updatedAt?: string;
}

const fallbackMangas: { [key: string]: { chapters: number } } = {
  "solo-leveling": { chapters: 126 },
  "one-piece": { chapters: 1158 },
  "blue-lock": { chapters: 314 },
  "dandadan": { chapters: 202 },
};

export default function Home() {
  const router = useRouter();
  
  const [banners, setBanners] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const [trendingManga, setTrendingManga] = useState<any[]>([]);
  const [recommendedManga, setRecommendedManga] = useState<any[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [completedManga, setCompletedManga] = useState<any[]>([]);
  const [freeManga, setFreeManga] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryManga[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().history) {
            const historyData = snap.data().history;
            const list: HistoryManga[] = Object.keys(historyData).map(key => ({
              id: key,
              title: historyData[key].title || "Гарчиггүй manga",
              coverUrl: historyData[key].coverUrl || "/placeholder-cover.jpg",
              lastChapter: historyData[key].lastChapter || "Бүлэг дутуу",
              updatedAt: historyData[key].updatedAt || ""
            }));
            list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            setHistoryList(list);
          }
        } catch (error) {
          console.error("Түүх уншихад алдаа гарлаа:", error);
        }
      } else {
        setHistoryList([]);
      }
    });
        // 2. Онцлох банер мангуудыг датабаазаас унших (is_banner == true)
    const fetchBanners = async () => {
      try {
        const q = query(collection(db, "manga"), where("is_banner", "==", true));
        const querySnapshot = await getDocs(q);
        
        const bannerList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Гарчиггүй Манга",
            image: data.banner_image || data.cover_image || "/placeholder-cover.jpg",
          };
        });

        setBanners(bannerList);
      } catch (error) { 
        console.error("Банер уншихад алдаа гарлаа:", error); 
      }
    };
    // 3. Эрэлттэй мангуудыг шүүж унших (placement == trending)
    const fetchTrending = async () => {
      try {
        const q = query(collection(db, "manga"), where("placement", "==", "trending"));
        const querySnapshot = await getDocs(q);
        const list = await Promise.all(querySnapshot.docs.map(async (mangaDoc) => {
          const mangaData = mangaDoc.data();
          let lastChapterText = "Бүлэг 1";
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
            title: mangaData.title || "Гарчиггүй",
            coverUrl: mangaData.cover_image || "/placeholder-cover.jpg",
            chapter: lastChapterText,
            tags: mangaData.genres ? mangaData.genres.join(" • ") : "Манга",
          };
        }));
        setTrendingManga(list);
      } catch (error) { console.error(error); }
    };

    // 4. Санал болгох мангуудыг шүүж унших (placement == recommended)
    const fetchRecommended = async () => {
      try {
        const q = query(collection(db, "manga"), where("placement", "==", "recommended"));
        const querySnapshot = await getDocs(q);
        const list = await Promise.all(querySnapshot.docs.map(async (mangaDoc) => {
          const mangaData = mangaDoc.data();
          let lastChapterText = "Бүлэг 1";
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
            title: mangaData.title || "Гарчиггүй",
            coverUrl: mangaData.cover_image || "/placeholder-cover.jpg",
            chapter: lastChapterText,
            tags: mangaData.genres ? mangaData.genres.join(" • ") : "Манга",
          };
        }));
        setRecommendedManga(list);
      } catch (error) { console.error(error); }
    };

    // 5. 🚀 ТӨГС ШИНЭЧЛЭЛ: Шууд status нь free буюу үнэгүй мангуудыг шүүж уншина
    const fetchFreeManga = async () => {
      try {
        const q = query(collection(db, "manga"), where("status", "==", "free"));
        const querySnapshot = await getDocs(q);
        const list = await Promise.all(querySnapshot.docs.map(async (mangaDoc) => {
          const mangaData = mangaDoc.data();
          let lastChapterText = "Бүлэг 1";
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
            title: mangaData.title || "Гарчиггүй",
            coverUrl: mangaData.cover_image || "/placeholder-cover.jpg",
            chapter: lastChapterText,
            tags: mangaData.genres ? mangaData.genres.join(" • ") : "Манга",
          };
        }));
        setFreeManga(list);
      } catch (error) { console.error(error); }
    };
    // 6. Саяхан нэмэгдсэн бүлгүүдийг унших логик
    const fetchRecentUpdates = async () => {
      try {
        const chapQuery = query(collection(db, "chapters"), orderBy("chapter_number", "desc"), limit(10));
        const chapSnap = await getDocs(chapQuery);
        if (chapSnap.empty) return;
        const uniqueMangaIds = Array.from(new Set(chapSnap.docs.map(d => d.data().manga_id))).slice(0, 4);
        const list = await Promise.all(uniqueMangaIds.map(async (mangaId) => {
          const mangaRef = doc(db, "manga", mangaId);
          const mangaSnap = await getDoc(mangaRef);
          if (!mangaSnap.exists()) return null;
          const mangaData = mangaSnap.data();
          const specificChapQuery = query(collection(db, "chapters"), where("manga_id", "==", mangaId));
          const specificChapSnap = await getDocs(specificChapQuery);
          let maxChapter = 1;
          if (!specificChapSnap.empty) {
            const numbers = specificChapSnap.docs.map(d => d.data().chapter_number || 1);
            maxChapter = Math.max(...numbers);
          }
          return {
            id: mangaId,
            title: mangaData.title || "Гарчиггүй",
            coverUrl: mangaData.cover_image || "/placeholder-cover.jpg",
            chapter: `Бүлэг ${maxChapter}`,
            time: "Саяхан нэмэгдсэн"
          };
        }));
        setRecentUpdates(list.filter((item): item is any => item !== null));
      } catch (error) { console.error(error); }
    };

    // 7. Дууссан мангуудыг шүүж унших (status == completed)
    const fetchCompleted = async () => {
      try {
        const q = query(collection(db, "manga"), where("status", "==", "completed"));
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map((doc) => {
          const mangaData = doc.data();
          return {
            id: doc.id,
            title: mangaData.title || "Гарчиггүй",
            coverUrl: mangaData.cover_image || "/placeholder-cover.jpg",
            genre: mangaData.genres ? mangaData.genres.join(" • ") : "Манга",
          };
        });
        setCompletedManga(list);
      } catch (error) { console.error(error); }
    };

    fetchBanners();
    fetchTrending();
    fetchRecommended();
    fetchFreeManga();
    fetchRecentUpdates();
    fetchCompleted();

    return () => unsubscribe();
  }, []);

  // Банерын автомат солилт
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((prev) => (banners.length > 0 ? (prev + 1) % banners.length : 0));
        setFade(true);
      }, 250);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white overflow-x-hidden">
      {/* Header - Утас, computer дээр хэмжээ нь автоматаар таарна */}
      <header className="sticky top-0 z-50 border-b border-[#1E2530] bg-[#0B0F14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          {/* Зүүн талын Лого хэсэг */}
          <div className="flex items-center gap-4 md:gap-10">
            <Link href="/" className="flex items-baseline gap-1.5 select-none cursor-pointer group active:scale-95 touch-manipulation">
              <span className="text-xl md:text-2xl font-black uppercase text-white tracking-[0.06em] group-hover:text-green-400 transition-colors duration-200" style={{ fontFamily: "'Futura', 'Trebuchet MS', 'Arial', sans-serif" }}>Clover</span>
              <span className="text-xs md:text-sm font-light uppercase text-gray-400 tracking-[0.2em] border-l border-white/10 pl-2 ml-0.5" style={{ fontFamily: "'Futura', 'Trebuchet MS', 'Arial', sans-serif" }}>Manga</span>
            </Link>
          </div>

          {/* Баруун талын Хайлт болон Хэрэглэгчийн цэс */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* ХАЙЛТ: Утас дээр зөвхөн томруулдаг шил харагдана, компьютер дээр хуучин хэвээрээ байна */}
            <div className="text-gray-300 hover:text-green-400 transition cursor-pointer p-2 rounded-xl hover:bg-[#141922] relative flex items-center justify-center">
              <div className="hidden md:block">
                <SearchModal />
              </div>
              <div className="md:hidden flex items-center justify-center">
                <Link href="/search" className="flex items-center justify-center">
                  <Search size={22} className="text-gray-300 hover:text-green-400" />
                </Link>
              </div>
            </div>

            {!user ? (
              <Link href="/login" className="rounded-xl bg-green-500 px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-black transition hover:bg-green-400">Нэвтрэх</Link>
            ) : (
              <div className="relative">
                {/* ХЭРЭГЛЭГЧ: Утсан дээр нэр, сум нуугдаж зөвхөн хүний дүрс харагдана */}
                <button onClick={() => setOpenMenu(!openMenu)} className="flex items-center gap-2 rounded-xl border border-[#232A35] bg-[#141922] p-2 md:px-4 md:py-2 transition hover:border-green-500 text-xs md:text-sm active:scale-95">
                  <CircleUser size={22} className="text-gray-300 md:w-[22px] md:h-[22px]" />
                  <span className="hidden md:block font-medium truncate max-w-[120px]">{user.displayName || "Хэрэглэгч"}</span>
                  <ChevronDown size={16} className={`hidden md:block transition duration-200 ${openMenu ? "rotate-180" : ""}`} />
                </button>
                {openMenu && (
                  <div className="absolute right-0 mt-3 w-48 md:w-52 rounded-2xl border border-[#232A35] bg-[#141922] p-2 md:p-3 shadow-2xl z-50">
                    <Link href="/account" onClick={() => setOpenMenu(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-[#232A35]">
                      <div className="flex items-center gap-3">
                        <User size={18} className="text-gray-300" />
                        <span>Миний аккаунт</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-500" />
                    </Link>
                    <button onClick={async () => { await signOut(auth); setOpenMenu(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#232A35]">
                      <LogOut size={18} className="text-red-400" />
                      <span>Гарах</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      {/* =======================================================
         ЗАСАСАН БАННЕР (Заавал харагдах найдвартай бүтэц)
         ======================================================= */}
      <section className="mx-auto mt-4 md:mt-6 max-w-[1400px] px-2 md:px-4">
        {/* Хэрэв дата ачаалж дуусаад, дор хаяж 1 банер олдсон бол харуулна */}
        {banners && banners.length > 0 && banners[current] ? (
          <div 
            onClick={() => {
              if (typeof window !== "undefined") {
                window.history.replaceState({ usr: { from: "/" } }, "");
                router.push(`/manga/${banners[current].id}?from=all`);
              }
            }}
            className="relative overflow-hidden rounded-[24px] md:rounded-[32px] border border-white/[0.04] bg-[#0B0F14] shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer group active:scale-[0.99] transition-transform duration-200"
          >
            {/* Банерын арын зураг */}
            <div className="h-[200px] sm:h-[280px] md:h-[420px] lg:h-[480px] w-full relative bg-zinc-900">
              <img 
                src={banners[current].image || "/placeholder-cover.jpg"} 
                alt={banners[current].title} 
                className={`h-full w-full object-cover transition-opacity duration-500 ease-in-out ${fade ? "opacity-100" : "opacity-0"}`} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/40 to-transparent" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
            </div>

                        {/* ЗҮҮН ДООД БУЛАНД БАЙРЛАХ МАНГАНЫ НЭР */}
            <div className="absolute left-4 bottom-5 md:left-10 md:bottom-12 z-10 max-w-[85%] sm:max-w-[70%]">
              <h1 
                className={`text-base sm:text-2xl md:text-3xl lg:text-5xl font-black text-white bg-[#0B0F14]/70 border border-white/10 px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-300 group-hover:text-green-400 group-hover:translate-x-1 max-w-full truncate ${fade ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                style={{ fontFamily: "'Futura', 'Trebuchet MS', sans-serif" }}
              >
                {banners[current].title}
              </h1>
            </div>

            {/* Зүүн сум: hidden md:flex-ийг flex болгож засав */}
<button type="button" onClick={(e) => { e.stopPropagation(); setCurrent((prev) => (banners.length > 0 ? (prev === 0 ? banners.length - 1 : prev - 1) : 0)); }} className="flex absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full border border-white/5 bg-black/40 text-gray-400 backdrop-blur-md transition-all duration-300 hover:border-green-500/30 hover:bg-green-500 hover:text-black active:scale-90"><span className="text-sm md:text-lg font-light">←</span></button>

{/* Баруун сум: hidden md:flex-ийг flex болгож засав */}
<button type="button" onClick={(e) => { e.stopPropagation(); setCurrent((prev) => (banners.length > 0 ? (prev + 1) % banners.length : 0)); }} className="flex absolute right-3 md:left-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full border border-white/5 bg-black/40 text-gray-400 backdrop-blur-md transition-all duration-300 hover:border-green-500/30 hover:bg-green-500 hover:text-black active:scale-90"><span className="text-sm md:text-lg font-light">→</span></button>

            {/* Банерын доод талын цэгэн индикаторууд */}
            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {banners.map((_, index) => (
                <button key={`indicator-${index}`} type="button" onClick={(e) => { e.stopPropagation(); setCurrent(index); }} className={`transition-all duration-500 ${current === index ? "h-1.5 w-6 md:w-7 rounded-full bg-green-500" : "h-1.5 w-1.5 rounded-full bg-white/20"}`} />
              ))}
            </div>
          </div>
        ) : (
          /* Хэрэв дата ачаалж амжаагүй бол харуулах Loading skeleton (Цагаан зай гарахгүй) */
          <div className="h-[200px] sm:h-[280px] md:h-[420px] lg:h-[480px] w-full bg-zinc-900/50 rounded-[24px] md:rounded-[32px] border border-white/5 animate-pulse flex items-center justify-center">
            <div className="h-8 bg-zinc-800 rounded-xl w-1/4 animate-pulse" />
          </div>
        )}
      </section>
    
      {/* =======================================================
         Үргэлжлүүлэх (History) хэсэг - Хэвээр үлдээв
         ======================================================= */}
      {isMounted && user && historyList !== undefined && (
        <section className="mx-auto mt-12 md:mt-16 max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
            <div><h2 className="text-xl md:text-3xl font-bold tracking-tight">Үргэлжлүүлэх</h2></div>
            <Link href="/account/history" className="rounded-xl border border-[#232A35] bg-[#141922] p-2 text-gray-400 hover:border-green-500 hover:text-green-500 transition active:scale-95 flex items-center justify-center shadow-lg"><ChevronRight size={20} /></Link>
          </div>
          {/* Зургууд хажуу тийшээ гүйдэг контейнер */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth md:grid md:grid-cols-3 md:gap-6 md:overflow-x-visible md:pb-0">
            {historyList.length > 0 ? (
              historyList.slice(0, 6).map((manga) => {
                const currentChapterNum = parseInt(manga.lastChapter.replace(/[^0-9]/g, "")) || 1;
                const totalChapters = fallbackMangas[manga.id]?.chapters || 100;
                const calculatedProgress = Math.min(Math.round((currentChapterNum / totalChapters) * 100), 100);
                return (
                  <div key={`history-card-${manga.id}`} onClick={() => { if (typeof window !== "undefined") { window.history.replaceState({ usr: { from: "/" } }, ""); } router.push(`/manga/${manga.id}?from=all`); }} className="flex-none w-[160px] sm:w-[200px] md:w-full snap-start overflow-hidden rounded-2xl border border-[#222933] bg-[#141922] transition duration-300 hover:border-green-500 cursor-pointer group flex flex-col h-full">
                    <div className="aspect-[3/4] w-full bg-[#232A35]/40 relative overflow-hidden"><img src={manga.coverUrl || "/placeholder-cover.jpg"} alt={manga.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
                    <div className="p-3 md:p-5 flex flex-col flex-1 justify-between bg-[#141922]">
                      <div>
                        <h3 className="text-xs md:text-xl font-bold truncate text-gray-200 group-hover:text-green-400 transition-colors">{manga.title}</h3>
                        <p className="mt-1 text-[10px] md:text-sm text-gray-400 font-medium">{manga.lastChapter}</p>
                      </div>
                      <div className="mt-3">
                        <div className="h-1 md:h-2 overflow-hidden rounded-full bg-[#2B313D]"><div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${calculatedProgress}%` }} /></div>
                        <p className="mt-1 text-[9px] md:text-sm text-gray-500 font-medium">{calculatedProgress}% уншсан</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={`fallback-card-${idx}`} className="flex-none w-[160px] sm:w-[200px] md:w-full snap-start overflow-hidden rounded-2xl border border-[#222933] bg-[#141922] flex flex-col h-full">
                  <div className="aspect-[3/4] w-full bg-[#232A35]/20 relative overflow-hidden animate-pulse" />
                  <div className="p-3 md:p-5 flex flex-col flex-1 justify-between bg-[#141922] animate-pulse">
                    <div className="h-4 bg-[#232A35]/50 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#232A35]/30 rounded w-1/4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* =======================================================
         Эрэлттэй хэсэг - Хэвээр үлдээв
         ======================================================= */}
      <section className="mx-auto mt-16 md:mt-20 max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
          <div><h2 className="text-xl md:text-3xl font-bold tracking-tight">Эрэлттэй</h2></div>
          <Link href="/trending" className="rounded-xl border border-[#232A35] bg-[#141922] p-2 text-gray-400 hover:border-green-500 hover:text-green-500 transition active:scale-95 flex items-center justify-center shadow-lg"><ChevronRight size={20} /></Link>
        </div>
        {/* Зургууд хажуу тийшээ гүйдэг контейнер */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth md:grid md:grid-cols-5 md:gap-6 md:overflow-x-visible md:pb-0">
          {trendingManga && trendingManga.length > 0 ? (
            trendingManga.slice(0, 6).map((manga) => (
              <div key={`trending-section-${manga.id}`} onClick={() => { if (typeof window !== "undefined") { window.history.replaceState({ usr: { from: "/" } }, ""); } router.push(`/manga/${manga.id}?from=all`); }} className="flex-none w-[130px] sm:w-[160px] md:w-full snap-start group overflow-hidden rounded-2xl border border-[#222933] bg-[#141922] transition duration-300 hover:border-green-500 cursor-pointer flex flex-col h-full hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)] animate-fadeIn">
                <div className="aspect-[3/4] w-full bg-[#232A35]/40 relative overflow-hidden"><img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /></div>
                <div className="p-2.5 md:p-5 flex flex-col flex-1 justify-between bg-[#141922]">
                  <div>
                    <h3 className="text-xs md:text-lg font-bold truncate text-gray-200 group-hover:text-green-500 transition-colors duration-200 tracking-wide">{manga.title}</h3>
                    <p className="mt-0.5 text-[10px] md:text-sm text-green-500 font-bold">{manga.chapter}</p>
                  </div>
                  <p className="mt-1 text-[9px] md:text-xs text-gray-500 font-medium truncate">{manga.tags}</p>
                </div>
              </div>
            ))
          ) : (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`trending-skeleton-${idx}`} className="flex-none w-[130px] sm:w-[160px] md:w-full snap-start animate-pulse border border-[#222933] bg-[#141922] rounded-2xl overflow-hidden flex flex-col h-full">
                <div className="aspect-[3/4] w-full bg-[#232A35]/30" />
                <div className="p-2.5 md:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2"><div className="h-4 bg-[#232A35]/50 rounded w-3/4" /><div className="h-3 bg-[#232A35]/30 rounded w-1/4" /></div>
                  <div className="h-3 bg-[#232A35]/20 rounded w-1/2" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {/* =======================================================
         Санал болгох хэсэг - Хэвээр үлдээв
         ======================================================= */}
      <section className="mx-auto mt-16 md:mt-20 max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
          <div><h2 className="text-xl md:text-3xl font-bold tracking-tight">Санал болгох</h2></div>
          <Link href="/recommended" className="rounded-xl border border-[#232A35] bg-[#141922] p-2 text-gray-400 hover:border-green-500 hover:text-green-500 transition active:scale-95 flex items-center justify-center shadow-lg"><ChevronRight size={20} /></Link>
        </div>
        {/* Зургууд хажуу тийшээ гүйдэг контейнер */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth md:grid md:grid-cols-6 md:gap-6 md:overflow-x-visible md:pb-0">
          {recommendedManga && recommendedManga.length > 0 ? (
            recommendedManga.slice(0, 6).map((manga) => (
              <div key={`recommended-section-${manga.id}`} onClick={() => { if (typeof window !== "undefined") { window.history.replaceState({ usr: { from: "/" } }, ""); } router.push(`/manga/${manga.id}?from=all`); }} className="flex-none w-[130px] sm:w-[160px] md:w-full snap-start group overflow-hidden rounded-2xl border border-[#222933] bg-[#141922] transition duration-300 hover:border-green-500 cursor-pointer flex flex-col h-full hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)] animate-fadeIn">
                <div className="aspect-[3/4] w-full bg-[#232A35]/40 relative overflow-hidden"><img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /></div>
                <div className="p-2.5 md:p-5 flex flex-col flex-1 justify-between bg-[#141922]">
                  <div>
                    <h3 className="text-xs md:text-lg font-bold truncate text-gray-200 group-hover:text-green-400 transition-colors duration-200 tracking-wide">{manga.title}</h3>
                    <p className="mt-0.5 text-[10px] md:text-sm text-green-500 font-bold">{manga.chapter}</p>
                  </div>
                  <p className="mt-1 text-[9px] md:text-xs text-gray-500 font-medium truncate">{manga.tags}</p>
                </div>
              </div>
            ))
          ) : (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`recommended-skeleton-${idx}`} className="flex-none w-[130px] sm:w-[160px] md:w-full snap-start animate-pulse border border-[#222933] bg-[#141922] rounded-2xl overflow-hidden flex flex-col h-full">
                <div className="aspect-[3/4] w-full bg-[#232A35]/30" />
                <div className="p-2.5 md:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2"><div className="h-4 bg-[#232A35]/50 rounded w-3/4" /><div className="h-3 bg-[#232A35]/30 rounded w-1/4" /></div>
                  <div className="h-3 bg-[#232A35]/20 rounded w-1/2" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* =======================================================
         Саяхан нэмэгдсэн хэсэг - Хэвээр үлдээв
         ======================================================= */}
      <section className="mx-auto mt-16 md:mt-20 max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
          <div><h2 className="text-xl md:text-3xl font-bold tracking-tight">Саяхан нэмэгдсэн</h2></div>
          <Link href="/recently-updated" className="rounded-xl border border-[#232A35] bg-[#141922] p-2 text-gray-400 hover:border-green-500 hover:text-green-500 transition active:scale-95 flex items-center justify-center shadow-lg"><ChevronRight size={20} /></Link>
        </div>
        {/* Жагсаалт хажуу тийшээ гүйдэг контейнер */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth md:flex-col md:space-y-3.5 md:overflow-x-visible md:pb-0">
          {recentUpdates && recentUpdates.length > 0 ? (
            recentUpdates.slice(0, 6).map((manga) => (
              <div key={`recent-card-${manga.id}`} onClick={() => { if (typeof window !== "undefined") { window.history.replaceState({ usr: { from: "/" } }, ""); } router.push(`/manga/${manga.id}?from=all`); }} className="flex-none w-[280px] sm:w-[320px] md:w-full snap-start flex items-center gap-4 rounded-2xl border border-white/[0.03] bg-[#141922]/50 p-3 md:p-5 cursor-pointer transition-all duration-300 hover:border-green-500/30 hover:bg-[#141922]/80 group hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)] animate-fadeIn">
                <div className="h-16 w-11 md:h-24 md:w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#232A35]/40 border border-white/5 shadow-inner"><img src={manga.coverUrl} alt={manga.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs md:text-xl font-bold text-gray-200 group-hover:text-green-400 transition-colors duration-200 truncate tracking-wide">{manga.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-500 font-bold">{manga.chapter}</span>
                    <span className="text-[10px] text-gray-500">• {manga.time}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`recent-skeleton-${idx}`} className="flex-none w-[280px] sm:w-[320px] md:w-full snap-start flex items-center gap-4 rounded-2xl border border-[#222933] bg-[#141922] p-3 md:p-5 animate-pulse">
                <div className="h-16 w-11 md:h-24 md:w-16 bg-[#232A35]/30 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#232A35]/50 rounded w-3/4" />
                  <div className="h-3 bg-[#232A35]/30 rounded w-1/4" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {/* =======================================================
         🚀 6. Үнэгүй манга харуулах хэсэг - Хэвээр үлдээв
         ======================================================= */}
      <section className="mx-auto mt-16 md:mt-20 max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-green-400 animate-pulse md:w-[22px] md:h-[22px]" />
            <h2 className="text-xl md:text-3xl font-bold tracking-tight">Үнэгүй унших</h2>
          </div>
          <Link 
            href="/free-manga" 
            className="rounded-xl border border-[#232A35] bg-[#141922] p-2 text-gray-400 hover:border-green-500 hover:text-green-500 transition active:scale-95 flex items-center justify-center shadow-lg"
            title="Бүх үнэгүй мангаг харах"
          >
            <ChevronRight size={20} />
          </Link>
        </div>
        {/* Зургууд хажуу тийшээ гүйдэг контейнер */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x scroll-smooth md:grid md:grid-cols-6 md:gap-6 md:overflow-x-visible md:pb-0">
          {freeManga && freeManga.length > 0 ? ( freeManga.slice(0, 6).map((manga) => ( <div key={`free-section-${manga.id}`} onClick={() => router.push(`/manga/${manga.id}?from=all`)} className="flex-none w-[130px] sm:w-[160px] md:w-full snap-start group overflow-hidden rounded-2xl border border-[#222933] bg-[#141922] transition duration-300 hover:border-green-500 cursor-pointer flex flex-col h-full hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)] animate-fadeIn" > <div className="aspect-[3/4] w-full bg-[#232A35]/40 relative overflow-hidden"> <img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> <div className="absolute top-2 left-2 rounded-lg bg-green-500/20 border border-green-500/40 px-1.5 py-0.5 text-[8px] md:text-[9px] font-bold text-green-400 uppercase tracking-wider backdrop-blur-md"> ҮНЭГҮЙ </div> </div> <div className="p-2.5 md:p-5 flex flex-col flex-1 justify-between bg-[#141922]"> <div> <h3 className="text-xs md:text-lg font-bold truncate text-gray-200 group-hover:text-green-400 transition-colors duration-200 tracking-wide">{manga.title}</h3> <p className="mt-0.5 text-[10px] md:text-sm text-green-500 font-bold">Үнэгүй манга</p> </div> <p className="mt-1 text-[9px] md:text-xs text-gray-500 font-medium truncate">{manga.tags}</p> </div> </div> )) ) : (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`free-skeleton-${idx}`} className="flex-none w-[130px] sm:w-[160px] md:w-full snap-start animate-pulse border border-[#222933] bg-[#141922] rounded-2xl overflow-hidden flex flex-col h-full">
                <div className="aspect-[3/4] w-full bg-[#232A35]/30" />
                <div className="p-2.5 md:p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-[#232A35]/50 rounded w-3/4" />
                    <div className="h-3 bg-[#232A35]/30 rounded w-1/4" />
                  </div>
                  <div className="h-3 bg-[#232A35]/20 rounded w-1/2" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* =======================================================
         7. Footer хэсэг - Хэвээр үлдээв
         ======================================================= */}
      <footer className="mt-16 md:mt-20 border-t border-[#1E2530] bg-[#0B0F14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 py-8 md:py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row text-center md:text-left">
            <div>
              <Link href="/" className="flex items-baseline justify-center md:justify-start gap-1.5 select-none cursor-pointer group">
                <span className="text-xl md:text-2xl font-black uppercase text-white tracking-[0.06em] group-hover:text-green-400 transition-colors duration-200" style={{ fontFamily: "'Futura', 'Trebuchet MS', 'Arial', sans-serif" }}>Clover</span>
                <span className="text-xs md:text-sm font-light uppercase text-gray-400 tracking-[0.2em] border-l border-white/10 pl-2 ml-0.5" style={{ fontFamily: "'Futura', 'Trebuchet MS', 'Arial', sans-serif" }}>Manga</span>
              </Link>
              <p className="mt-3 max-w-md text-gray-400 text-xs md:text-sm font-medium">Манга унших чинь нэг төрлийн ажил за юу!</p>
            </div>
            {/* Цэсний хэсэг */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs md:text-sm text-gray-400 font-medium">
              <button type="button" onClick={() => router.push("/all-manga")} className="hover:text-green-500 transition">Бүх манга</button>
              <button type="button" onClick={() => router.push("/get-access")} className="hover:text-green-500 transition">Эрх авах</button>
              <Link href="/help" className="hover:text-green-500 transition">Тусламж</Link> 
              <a href="https://www.facebook.com/share/1DyCfjBhY3/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors">Админтай холбогдох</a>
            </div>
          </div>
          <div className="mt-8 md:mt-10 border-t border-[#1E2530] pt-6 text-center text-xs md:text-sm text-gray-500 font-medium">© 2026 CLOVER manhwa</div>
        </div>
      </footer>
    </main>
  );
}