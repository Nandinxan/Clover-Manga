"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteField, collection, addDoc, deleteDoc, query, where, onSnapshot, increment, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  Heart, 
  ChevronRight, 
  Lock, 
  Eye, 
  ArrowUpDown, 
  Search, 
  ArrowLeft, 
  Star, 
  BookOpen, 
  MessageSquare, 
  Send, 
  Trash2, 
  User, 
  X,
  AlertTriangle,
  Edit2
} from "lucide-react";

interface MangaForm {
  title: string;
  description: string;
  cover_image: string;
  banner_image: string; // 🚀 НЭМЭВ: Баннер зургийн төрлийг интерфейст нэмж улаан зураасгүй болгов
  genres: string;
  status: "ongoing" | "completed" | "paused"; 
  is_banner: boolean;
  is18: boolean;
  is_free: boolean; 
}

interface ChapterForm {
  id?: string; 
  manga_id: string;
  chapter_number: number;
  images: string;
  is_premium: boolean;
}

export default function MangaDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const mangaId = params.id as string;

  const [manga, setManga] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  
  const [showAgeModal, setShowAgeModal] = useState(false); 
  const [showLockModal, setShowLockModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAscending, setIsAscending] = useState(false); 

  const [reviews, setReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(5); 
  const [reviewText, setReviewText] = useState("");
  const [averageRating, setAverageRating] = useState(4.8);

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [showNoCoinModal, setShowNoCoinModal] = useState(false);

  // 🚀 Датабаазаас бүлгүүдийг бодитоор уншиж хадгалах State
  const [chapters, setChapters] = useState<any[]>([]);

  // 🟩 ШИНЭ: Бүлгийн нийт тоо болон Хамгийн сүүлийн бүлгийн дугаарыг автоматаар хадгалах төлөвүүд
  const [totalChapters, setTotalChapters] = useState(0);
  const [lastChapterNum, setLastChapterNum] = useState(1);

  // 🟩 Бүлэг уншаад буцаж ирэхэд хөтчийн түүхэнд хадгалагдсан chapter-уудыг арчиж цэвэрлэнэ
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [mangaId]);

  // 🚀 Үзэлт аюулгүй ахиулах try/catch уншилт
  useEffect(() => {
    if (!mangaId) return;

    const updateMangaViews = async () => {
      try {
        const mangaRef = doc(db, "manga", mangaId);
        const snap = await getDoc(mangaRef);
        if (snap.exists()) {
          await updateDoc(mangaRef, { views: increment(1) });
        }
      } catch (error) {
        console.warn("Firebase Permissions алдаанаас сэргийлж барьж авлаа:", error);
      }
    };

    updateMangaViews();
  }, [mangaId]);

  useEffect(() => {
    let unsubscribeChapters: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      let isFavFound = false;

      // 1. Хэрэв хэрэглэгч нэвтэрсэн байвал "Дуртай" (Favorites) мэдээллийг нь уншина
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setProfile(userData);

            if (userData.favorites && userData.favorites[mangaId]) {
              setFavorite(true);
              isFavFound = true;
            }
          }
        } catch (error) {
          console.error("Дуртай дата уншихад алдаа гарлаа:", error);
        }
      }

      // 2. Зөвхөн "manga" цуглуулгаас админ самбарын бодит датаг уншина
      try {
        const mangaDocRef = doc(db, "manga", mangaId);
        const mangaDocSnap = await getDoc(mangaDocRef);
        
        if (mangaDocSnap.exists()) {
          const data = mangaDocSnap.data();
          setManga({
            id: mangaDocSnap.id,
            title: data.title || mangaId?.replace("-", " "),
            image: data.cover_image || "https://unsplash.com", // 🚀 Хэвээр үлдээв (Постер зураг)
            banner: data.banner_image || data.cover_image || "", // 🚀 БҮРЭН ЗАСАВ: Өгөгдлийн сангаас урт баннер зургийг уншиж, байхгүй бол постероор орлуулна
            author: data.author || "Зохиолч тодорхойгүй",
            description: data.description || "Тайлбар хоосон байна.",
            views: data.views || 0,
            status: data.status === "completed" ? "Дууссан" : "Үргэлжилж буй",
            genre: data.genres ? data.genres.join(" • ") : "Манга",
            is18: data.is18 || false
          });

          if (data.is18 === true) {
            setShowAgeModal(true);
          }
        } else {
          setManga({
            title: mangaId?.replace("-", " "),
            image: "https://unsplash.com",
            banner: "", // 🚀 НЭМЭВ
            author: "Зохиолч тодорхойгүй",
            description: "Тайлбар хоосон байна.",
            views: 0,
            status: "Үргэлжилж буй",
            genre: "Манга",
            is18: false
          });
        }
      } catch (error) {
        console.error("Бодит манга уншихад алдаа гарлаа:", error);
      }

      // 3. 🟩 ШИНЭЧЛЭВ: Бүлгүүдийг getDocs биш Realtime onSnapshot ашиглан байнга сонсож шууд харуулна
      const chapQuery = query(collection(db, "chapters"), where("manga_id", "==", mangaId));
      unsubscribeChapters = onSnapshot(chapQuery, (chapSnap) => {
        const chapList = chapSnap.docs.map(cDoc => {
          const cData = cDoc.data();
          return {
            id: cDoc.id,
            chapter_number: cData.chapter_number || 1,
            title: cData.title || `Бүлэг ${cData.chapter_number}`,
            createdAt: cData.createdAt
          };
        });
        
        // Бүлгийн дугаараар нь эрэмбэлэх
        chapList.sort((a, b) => a.chapter_number - b.chapter_number);
        setChapters(chapList);
        setTotalChapters(chapList.length); // ⚡ Нийт бүлгийн тоог автоматаар тоолно

        if (chapList.length > 0) {
          const numbers = chapList.map(c => c.chapter_number);
          setLastChapterNum(Math.max(...numbers)); // ⚡ Сүүлд нэмэгдсэн бүлгийн дугаар олох
        }
      }, (err) => {
        console.error("Бүлэг realtime уншихад алдаа гарлаа:", err);
      });

      if (!isFavFound) {
        setFavorite(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeChapters) unsubscribeChapters();
    };
  }, [mangaId]);

  // Сэтгэгдлүүдийг Firestore-оос Realtime унших ухаалаг Snapshot сонсогч
  useEffect(() => {
    if (!mangaId) return;

    const q = query(
      collection(db, "manga_reviews"),
      where("mangaId", "==", mangaId)
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const revList: any[] = [];
      let totalRating = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        revList.push({ id: docSnap.id, ...data });
        totalRating += data.rating || 5;
      });

      // 🟩 ШИНЭЧЛЭВ: Сэтгэгдэл бичсэн хүмүүсийн хамгийн сүүлийн шинэчлэгдсэн Username-ийг Realtime татаж харуулна
      const updatedRevList = await Promise.all(revList.map(async (rev) => {
        if (rev.userId) {
          try {
            const userDocRef = doc(db, "users", rev.userId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              return { ...rev, username: userSnap.data().username || rev.username || "Хэрэглэгч" };
            }
          } catch (e) {
            console.error(e);
          }
        }
        return rev;
      }));

      updatedRevList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      setReviews(updatedRevList);

      if (updatedRevList.length > 0) {
        const avg = totalRating / updatedRevList.length;
        setAverageRating(parseFloat(avg.toFixed(1)));
      } else {
        setAverageRating(4.8);
      }
    });

    return () => unsubscribe();
  }, [mangaId]);

  // Үнэлгээ илгээх функц
  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Үнэлгээ өгөхийн тулд нэвтэрнэ үү.");
    if (!reviewText.trim()) return;

    try {
      await addDoc(collection(db, "manga_reviews"), {
        mangaId: mangaId,
        userId: user.uid,
        user: user.displayName || "Хэрэглэгч",
        rating: userRating,
        text: reviewText,
        createdAt: new Date().toISOString()
      });
      setReviewText("");
    } catch (error) {
      console.error(error);
    }
  };

  // Үнэлгээ устгах функц
  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, "manga_reviews", reviewId));
      setReviewToDelete(null); 
    } catch (error) {
      console.error("Устгахад алдаа гарлаа:", error);
    }
  };

  // Үнэлгээ засах функц
  const handleUpdateReview = async (reviewId: string) => {
    if (!editingText.trim()) return;
    try {
      const reviewRef = doc(db, "manga_reviews", reviewId);
      await updateDoc(reviewRef, { text: editingText });
      setEditingReviewId(null);
    } catch (error) {
      console.error("Засахад алдаа гарлаа:", error);
    }
  };

  // Дуртай жагсаалт удирдах функц
  const toggleFavorite = async () => {
    if (!user) return router.push("/login");
    const userRef = doc(db, "users", user.uid);
    try {
      if (favorite) {
        await updateDoc(userRef, { [`favorites.${mangaId}`]: deleteField() });
        setFavorite(false);
      } else {
        await updateDoc(userRef, {
          [`favorites.${mangaId}`]: { title: manga.title, coverUrl: manga.image }
        });
        setFavorite(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Хаалттай бүлгийг 10 койноор бүрмөсөн нээх функц
  const unlockChapterWithCoins = async (chapterNum: number) => {
    if (!user) {
      alert("Бүлэг нээхийн тулд эхлээд нэвтэрнэ үү.");
      return;
    }
    
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentCoins = userData.coins ?? 0;
        
        if (currentCoins < 10) {
          setShowLockModal(false);
          setShowNoCoinModal(true);
          return;
        }
        
        const expireDate = new Date();
        expireDate.setFullYear(expireDate.getFullYear() + 1);

        await updateDoc(userRef, {
          coins: currentCoins - 10,
          [`unlockedChapters.${mangaId}_ch${chapterNum}`]: expireDate.toISOString()
        });
        setProfile((prev: any) => ({
          ...prev,
          coins: currentCoins - 10,
          unlockedChapters: {
            ...(prev?.unlockedChapters ?? {}),
            [`${mangaId}_ch${chapterNum}`]: expireDate.toISOString()
          }
        }));
        setShowLockModal(false);
        router.push(`/manga/${mangaId}/${chapterNum}`);
      }
    } catch (error) {
      console.error("Бүлэг нээхэд алдаа гарлаа:", error);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0F14] text-white flex items-center justify-center text-xs font-bold">Ачаалж байна...</div>;
  if (!manga) return <div className="min-h-screen bg-[#0B0F14] text-white flex items-center justify-center text-xs font-bold">Манга олдсонгүй.</div>;

  const chaptersArray = [...chapters]; 
  
  // Өгсөх уруудахаар эрэмбэлэх засал
  const sortedChapters = chaptersArray.sort((a: any, b: any) => {
    return isAscending ? a.chapter_number - b.chapter_number : b.chapter_number - a.chapter_number;
  });

  // Хайлтын үгээр бүлгийг шүүх хэсэг
  const filteredChapters = sortedChapters.filter((ch: any) => 
    ch.chapter_number.toString().includes(searchQuery) || searchQuery === ""
  );

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white px-4 py-6 relative">
      {/* +18 ПОПАП */}
      {showAgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-[#232A35] bg-[#141922] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 font-bold border border-red-500/20 text-xl">+18</div>
            <h2 className="mt-5 text-2xl font-bold">+18 Насны хязгаарлалт</h2>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">Энэ manga насанд хүрэгчдэд зориулсан (+18) хэсэг агуулсан байж болзошгүй. Хэрвээ та насанд хүрээгүй бол уншихгүй байхыг зөвлөж байна. Энэ нь хувь личностын сонголт тул үүнээс үүдсэн аливаа асуудлыг манай сайт хариуцахгүй болно.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => router.push("/")} className="flex-1 rounded-xl bg-[#232A35] py-3.5 font-semibold text-gray-300">ЦУЦЛАХ</button>
              <button onClick={() => setShowAgeModal(false)} className="flex-1 rounded-xl bg-red-700 py-3.5 font-semibold text-white">ЗӨВШӨӨРЧ БАЙНА</button>
            </div>
          </div>
        </div>
      )}

      {/* ҮНЭЛГЭЭ УСТГАХЫГ БАТАЛГААЖУУЛАХ ПОПАП */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-[#141922] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <Trash2 size={20} />
            </div>
            <h2 className="mt-4 text-lg font-bold">Үнэлгээ устгах</h2>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">Та энэ үнэлгээг устгахдаа итгэлтэй байна уу?</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setReviewToDelete(null)} className="flex-1 rounded-xl bg-[#232A35] py-2.5 text-xs font-semibold text-gray-300">БОЛИХ</button>
              <button onClick={() => reviewToDelete && handleDeleteReview(reviewToDelete)} className="flex-1 rounded-xl bg-red-700 py-2.5 text-xs font-semibold text-white hover:bg-red-600">УСТГАХ</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto">
        {/* COVER ХЭСЭГ */}
        <div className="relative h-[440px] w-full rounded-3xl overflow-hidden border border-[#232A35] bg-black flex items-center justify-center">
          
          {/* 🚀 ЗАСВАРЛАВ: Арын blur дэвсгэр дээр урт баннер зургийг (manga.banner) холбов. Байхгүй бол постер гарна */}
          <img src={manga?.banner || manga?.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-xl scale-110" />
          
          {/* 🚀 ЗАСВАРЛАВ: Урд талын постер карт дээр Firestore-ийн зөв постер зургийг (manga.image) холбов */}
          <div className="relative z-10 h-[300px] w-[210px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/80">
            <img src={manga?.image} alt={manga?.title} className="h-full w-full object-cover" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-transparent to-black/30 z-10" />
          
          {/* Буцах товчлуур */}
          <button 
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                const currentReferrer = document.referrer || "";

                if (
                  currentReferrer.includes("/chapter") ||
                  currentReferrer.includes(`${mangaId}/`)
                ) {
                  router.push(`/manga/${mangaId}`);
                  return;
                }

                router.back();
              }
            }} 
            className="absolute top-4 left-4 z-20 rounded-full bg-black/50 border border-white/10 p-2.5 text-white backdrop-blur-sm hover:bg-black/70 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <button onClick={toggleFavorite} className={`absolute top-4 right-4 z-20 rounded-xl border p-2.5 backdrop-blur-sm transition flex items-center gap-1.5 text-xs font-semibold ${
            favorite ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-white/10 bg-black/50 text-gray-200 hover:text-white"
          }`}>
            <Heart size={16} fill={favorite ? "currentColor" : "none"} />
            {favorite ? "Хадгалсан" : "Хадгалах"}
          </button>
        </div>

       {/* МАНГАНЫ МЭДЭЭЛЭЛ ХЭСЭГ */}
        <h1 className="text-3xl font-bold mt-6">{manga?.title}</h1>
        
        <div className="flex items-center gap-4 mt-4 flex-wrap text-sm text-gray-300">
          <span className="flex items-center gap-1 text-yellow-500 font-semibold">
            <Star size={16} fill="currentColor" /> {averageRating} <span className="text-xs text-gray-500">({reviews.length} сэтгэгдэл)</span>
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <Eye size={16} /> Үзэлт {manga?.views || 0}
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <BookOpen size={16} /> {totalChapters} Бүлэг {/* 🟩 ШИНЭЧЛЭВ: Бодит тоологдсон бүлгийн тоог харуулна */}
          </span>
          <span className="rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs text-green-400 font-medium">{manga?.status}</span>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {/* 🟩 ЗАСВАРЛАВ: Зохиолчийн нэр оруулах хэсгийг эндээс бүрмөсөн хасав */}
          <span className="rounded-xl bg-[#141922] border border-[#232A35] px-4 py-1.5 text-xs text-gray-400">{manga?.genre}</span>
        </div>

        <h3 className="text-lg font-bold mt-6 mb-2">Тайлбар</h3>
        <p className="text-gray-400 text-sm leading-relaxed border-b border-[#232A35]/40 pb-6">{manga?.description}</p>
        
        {/*  ҮНЭЛГЭЭ ӨГӨХ ХЭСЭГ */}
        <div className="mt-5 border-b border-[#232A35]/40 pb-5 text-left">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-green-500/10 p-1.5 text-green-400 border border-green-500/20 flex-shrink-0">
              <MessageSquare size={14} />
            </div>
            <h3 className="text-sm font-bold">Үнэлгээ өгөх</h3>
          </div>

          <form onSubmit={handleSendReview} className="space-y-2.5">
            <div className="flex items-center gap-1.5 bg-[#141922]/30 rounded-xl p-2 border border-[#232A35]/20 w-fit">
              <span className="text-[10px] text-gray-500 mr-1">Таны үнэлгээ:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setUserRating(star)}
                  className={`transition-all ${star <= userRating ? "text-yellow-500" : "text-gray-600"}`}
                >
                  <Star size={15} fill={star <= userRating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Сэтгэгдэл бичих..."
                className="flex-1 rounded-xl border border-[#232A35] bg-[#141922] px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-green-500 transition-all"
              />
              <button type="submit" className="rounded-xl bg-green-500 px-3.5 text-black hover:bg-green-400 transition flex items-center justify-center flex-shrink-0">
                <Send size={12} />
              </button>
            </div>
          </form>

          {/* Сэтгэгдлийн жагсаалт (Realtime бодитоор уншигдана) */}
          <div className="mt-3 space-y-1.5">
            {(showAllReviews ? reviews : reviews.slice(0, 3)).length === 0 ? null : (
              (showAllReviews ? reviews : reviews.slice(0, 3)).map((rev) => (
                <div key={rev.id} className="rounded-xl bg-[#141922]/40 p-2.5 border border-[#232A35]/40 text-xs flex justify-between items-start gap-3 animate-fade-in">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="font-semibold text-gray-300 bg-[#141922] px-1.5 py-0.5 rounded border border-[#232A35]/40 flex items-center gap-1.5">
                        <User size={11} className="text-gray-400" /> 
                        {/* 🟩 ШИНЭЧЛЭВ: rev.user биш байнга хамгийн сүүлийн шинэ нэрийг унших rev.username-ийг холбов */}
                        {rev.username || "Хэрэглэгч"}
                      </span>
                      <div className="flex items-center gap-0.5 text-yellow-500">
                        <Star size={10} fill="currentColor"/> 
                        <span className="font-bold">{rev.rating}</span>
                      </div>
                      <span className="text-[9px] text-gray-500 ml-1">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>

                    {editingReviewId === rev.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 bg-[#0B0F14] border border-[#232A35] rounded-lg px-2 py-1 text-xs text-white outline-none"
                        />
                        <button onClick={() => handleUpdateReview(rev.id)} className="text-green-500 text-[10px] font-bold">Хадгалах</button>
                        <button onClick={() => setEditingReviewId(null)} className="text-gray-500 text-[10px]">Болих</button>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-gray-300 pl-0.5 leading-relaxed">{rev.text}</p>
                    )}
                  </div>


                 {user && user.uid === rev.userId && editingReviewId !== rev.id && (
                    <div className="flex gap-2 text-[9px] font-semibold flex-shrink-0 pt-0.5">
                      <button onClick={() => { setEditingReviewId(rev.id); setEditingText(rev.text); }} className="text-gray-400 hover:text-green-400 transition-colors">Засах</button>
                      <button onClick={() => setReviewToDelete(rev.id)} className="text-gray-500 hover:text-red-400 transition-colors">Устгах</button>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {reviews.length > 3 && (
              <button 
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="w-full text-center py-1.5 text-[10px] font-semibold text-green-400 bg-green-500/5 hover:bg-green-500/10 rounded-xl border border-green-500/10 transition-all mt-1"
              >
                {showAllReviews ? "Үнэлгээнүүдийг хумих" : `Бүх үнэлгээг харах (${reviews.length})`}
              </button>
            )}
          </div>
        </div>

        {/* БҮЛГҮҮДИЙН ХЭСЭГ */}
        <div className="mt-6">
          {/* 🟩 ШИНЭЧЛЭВ: Бодитоор тоологдсон нийт бүлгийн тоог харуулна */}
          <h2 className="text-xl font-bold mb-4">Бүлгүүд ({totalChapters})</h2>
          
          <div className="mb-5 flex gap-3 items-center">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-[#232A35] bg-[#141922] px-4 py-2.5">
              <Search size={16} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="Бүлгийн дугаараар хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-sm text-white w-full placeholder-gray-500"
              />
            </div>
            {/* 🟩 ШИНЭЧЛЭВ: Тогтмол тоо биш, хамгийн сүүлд орсон бүлгийн дугаараар автоматаар солигдоно */}
            <button onClick={() => setIsAscending(!isAscending)} className="rounded-xl border border-[#232A35] bg-[#141922] px-4 py-2.5 text-sm font-medium text-gray-400 flex items-center gap-2 hover:border-gray-500 hover:text-white transition">
              <ArrowUpDown size={15} />
              {isAscending ? `1-${lastChapterNum}` : `${lastChapterNum}-1`}
            </button>
          </div>

          <div className="space-y-3">
            {filteredChapters.length > 0 ? (
              filteredChapters.map((chObj: any) => {
                const chapterNum = chObj.chapter_number;
                
                // Койноор үүрд нээсэн эсэхийг шалгана
                const unlockDate = profile?.unlockedChapters?.[`${mangaId}_ch${chapterNum}`];
                const isAlreadyUnlocked = unlockDate
                  ? new Date(unlockDate).getTime() > Date.now()
                  : false;

                // Premium эрхийн хугацаа дууссан эсэхийг шалгана
                const isPremiumUser = profile?.accessType === "Premium" || profile?.accessType === "premium";
                const expiryDate = profile?.accessEnd ? new Date(profile.accessEnd) : null;
                const isExpired = expiryDate ? new Date() > expiryDate : true;
                
                const hasActivePremium = isPremiumUser && !isExpired;
                const isPremiumChapter = chapterNum >= 6; 
                
                // Эрхийн хугацаа дуусмагц буцаж цоожлогдоно, зөвхөн койноор авсан нь үүрд нээлттэй үлдэнэ
                const isLocked = isPremiumChapter && !hasActivePremium && !isAlreadyUnlocked;

                // Бүлэг нэмэгдсэн хугацааг харуулах ухаалаг засал
                const formattedDate = chObj.createdAt 
                  ? new Date(chObj.createdAt).toLocaleDateString() 
                  : "2026-07-13";

                return (
                  <div
                    key={chObj.id}
                    onClick={() => {
                      if (isLocked) {
                        setSelectedChapter(chapterNum);
                        setShowLockModal(true);
                      } else {
                        // 🟩 ШИНЭЧЛЭВ: window.location.replace биш Next.js-ийн router ашиглан кэш устгаж, хурдан шилжинэ
                        router.push(`/manga/${mangaId}/${chapterNum}`);
                      }
                    }}
                    className={`flex items-center gap-4 rounded-2xl border bg-[#141922]/80 p-3 cursor-pointer transition-all ${
                      isLocked ? "border-green-500/20 hover:border-green-500/40" : "border-[#232A35] hover:border-gray-500"
                    }`}
                  >
                    {/* 🚀 ЗАСВАРЛАВ: coverUrl биш зөв постер зураг (manga.image) уншина */}
                    <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-black border border-white/5">
                      <img src={manga?.image || "/placeholder-cover.jpg"} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{chObj.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isLocked && (
                        <div className="rounded-xl bg-green-500/10 p-2 text-green-400 border border-green-500/20"><Lock size={16} /></div>
                      )}
                      <ChevronRight size={18} className="text-gray-500" />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-6 text-sm">Хайсан бүлэг олдсонгүй.</p>
            )}
          </div>
        </div>


       {/* ЦООЖТОЙ БАННЕР - УУЖИМ ТОМ ХЭМЖЭЭТЭЙ (max-w-md), Х ТОВЧТОЙ */}
        {showLockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="relative w-full max-w-md rounded-3xl border border-[#232A35] bg-[#141922] p-6 text-center shadow-xl text-xs flex flex-col">
              
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => { setShowLockModal(false); setSelectedChapter(null); }}
                  className="p-1.5 rounded-full bg-[#0B0F14]/60 border border-[#232A35] text-gray-400 hover:text-white transition active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-400 border border-green-500/20 mt-1">
                <Lock size={20} />
              </div>
              
              <h2 className="text-base font-bold text-gray-200 mt-4 uppercase tracking-wide">Хаалттай бүлэг</h2>
              <p className="mt-3 text-gray-400 leading-relaxed px-4 text-xs">
                {selectedChapter && <span className="text-green-400 font-bold">Бүлэг {selectedChapter}</span>} нь хаалттай байна. Уншихын тулд Premium эрх эсвэл 10 Coin хэрэгтэй. Койноор нээсэн бүлэг үүрд нээлттэй үлдэнэ.
              </p>
              
              <button 
                type="button"
                onClick={() => {
                  if (selectedChapter) unlockChapterWithCoins(selectedChapter);
                }} 
                className="mt-6 w-full rounded-2xl bg-green-500 py-3.5 text-xs font-bold text-black transition-all active:scale-[0.99] hover:bg-green-400 uppercase tracking-wide font-black"
              >
                10 койноор нээх
              </button>
            </div>
          </div>
        )}

        {/* COIN ХҮРЭЛЦЭХГҮЙ ҮЕД ГАРЧ ИРЭХ ПОПАП - ЦЭВЭР ALERT-TRIANGLE ICON */}
        {showNoCoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="relative w-full max-w-md rounded-3xl border border-[#232A35] bg-[#141922] p-6 text-center shadow-xl text-xs flex flex-col">
              
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setShowNoCoinModal(false)}
                  className="p-1.5 rounded-full bg-[#0B0F14]/60 border border-[#232A35] text-gray-400 hover:text-white transition active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mt-1">
                <AlertTriangle size={20} />
              </div>
              
              <h2 className="text-base font-bold text-gray-200 mt-4 uppercase tracking-wide">Coin хүрэлцэхгүй байна</h2>
              <p className="mt-3 text-gray-400 leading-relaxed px-4 text-xs">
                Таны хэтэвчний койн хүрэлцэхгүй байна. Багцаа сонгон койноо цэнэглэнэ үү.
              </p>
              
              <button 
                type="button"
                onClick={() => {
                  setShowNoCoinModal(false);
                  router.push("/get-access");
                }} 
                className="mt-6 w-full rounded-2xl bg-green-500 py-3.5 text-xs font-bold text-black transition-all active:scale-[0.99] hover:bg-green-400 uppercase tracking-wide font-black"
              >
                Эрх авах
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
