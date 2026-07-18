"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, Send, UserRound, Lock, Star, Trash2, Edit2, X, Check, User } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, addDoc, updateDoc, deleteDoc, query, where, getDocs } from "firebase/firestore";

export default function MangaReaderPage() {
  const params = useParams();
  const router = useRouter();
  
  const mangaId = params.id as string;
  // URL дээрээс бүлгийн дугаарыг тоо хэлбэрээр уншиж авна
  const chapterId = params.chapter as string;
  const chapterNum = parseInt(chapterId) || 1;

  const [user, setUser] = useState<any>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  // 🚀 ЭНЭ МӨРИЙГ ЯГ ОДОО НЭМЭЭРЭЙ:
  const [profile, setProfile] = useState<any>(null); 


  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  
  // 🚀 ШИНЭЭР НЭМЭВ: Манганы бодит гарчгийг хадгалах төлөв
  const [mangaTitle, setMangaTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. Хэрэглэгчийн төлөв болон Firebase-ээс тухайн бүлгийн зургуудыг татах
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // 🟩 Хэрэглэгч нэвтэрсэн үед уншсан түүхийг Firestore-д автоматаар хадгална
      if (currentUser && mangaId && chapterId) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const mangaSnap = await getDoc(doc(db, "manga", mangaId));
          
          await updateDoc(userRef, {
            [`history.${mangaId}`]: {
              title: mangaSnap.exists() ? (mangaSnap.data().title || mangaId.replace("-", " ").toUpperCase()) : mangaId.replace("-", " ").toUpperCase(),
              coverUrl: mangaSnap.exists() ? (mangaSnap.data().cover_image || "/placeholder-cover.jpg") : "/placeholder-cover.jpg",
              lastChapter: `Бүлэг ${chapterId}`,
              updatedAt: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error("Уншсан түүх хадгалахад алдаа гарлаа:", error);
        }
      }
    });

    const fetchChapterPages = async () => {
      if (!mangaId || !chapterId) return;

      try {
        // 🚀 ТӨГС ШИНЭЧЛЭВ: Хуучин бүтцийг хасаж, бодит "chapters" цуглуулгаас manga_id болон chapter_number-оор хайна
        const q = query(
          collection(db, "chapters"),
          where("manga_id", "==", mangaId),
          where("chapter_number", "==", chapterNum)
        );
        const querySnapshot = await getDocs(q);

        // Манганы үндсэн нэрийг унших
        const mangaSnap = await getDoc(doc(db, "manga", mangaId));
        if (mangaSnap.exists()) {
          setMangaTitle(mangaSnap.data().title || "");
        }

        if (!querySnapshot.empty) {
          const chapDoc = querySnapshot.docs[0];
          const data = chapDoc.data();
          // Админ самбараас оруулсан бодит зургуудын линкийг (pages массив) холбов
          setPages(data.images || data.pages || []);
        } else {
          // Хэрэв датабааз дээр байхгүй бол унахгүй байх fallback
          setPages([
            "https://unsplash.com",
          ]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Бүлгийн зургуудыг татахад алдаа гарлаа:", error);
        setLoading(false);
      }
    };

    fetchChapterPages();

    return () => unsubscribe();
  }, [mangaId, chapterId, chapterNum]);
  // Устгах хайрцгийг удирдах болон Хаалттай бүлгийн попап удирдах төлөв
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // 🚀 ТӨГС ШИНЭЧЛЭВ: Хэрэглэгч 6-аас дээш бүлэг рүү орвол Premium эрх болон койноор нээсэн хугацааг нь бодитоор шалгана
  useEffect(() => {
    if (chapterNum >= 6) {
      const isPremiumUser = profile?.accessType === "Premium" || profile?.accessType === "premium";
      const expiryDate = profile?.accessEnd ? new Date(profile.accessEnd) : null;
      const isExpired = expiryDate ? new Date() > expiryDate : true;
      const hasActivePremium = isPremiumUser && !isExpired;

      const unlockDate = profile?.unlockedChapters?.[`${mangaId}_ch${chapterNum}`];
      const isAlreadyUnlocked = unlockDate ? new Date(unlockDate).getTime() > Date.now() : false;

      // Хэрэв идэвхтэй Premium эрхгүй БАС койноор нээгээгүй бол хаалтыг автомат ажиллуулна
      if (!hasActivePremium && !isAlreadyUnlocked) {
        setShowLockModal(true);
      } else {
        setShowLockModal(false);
      }
    } else {
      setShowLockModal(false);
    }
  }, [chapterNum, profile, mangaId]);

  // Сэтгэгдэл татах логик (Хэвээр үлдээв)
  useEffect(() => {
    if (!mangaId || !chapterId) return;

    const q = collection(db, "comments");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const filtered = allComments.filter((comment: any) => 
        comment.mangaId === mangaId && comment.chapterId === chapterId
      );

      filtered.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setComments(filtered);
    });

    return () => unsubscribe();
  }, [mangaId, chapterId]);

  // Сэтгэгдэл устгах функц
  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await deleteDoc(doc(db, "comments", commentToDelete));
      setCommentToDelete(null); 
    } catch (error) {
      console.error("Устгахад алдаа гарлаа:", error);
    }
  };

  // Сэтгэгдэл засах функц
  const handleUpdateComment = async (commentId: string) => {
    if (!editingText.trim()) return;
    try {
      await updateDoc(doc(db, "comments", commentId), { text: editingText });
      setEditingCommentId(null);
    } catch (error) {
      console.error("Засахад алдаа гарлаа:", error);
    }
  };

  // Сэтгэгдэл илгээх функц
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      await addDoc(collection(db, "comments"), {
        mangaId: mangaId,
        chapterId: chapterId,
        userId: user.uid,
        user: user.displayName || "Хэрэглэгч",
        text: newComment,
        createdAt: new Date().toISOString()
      });
      setNewComment(""); 
    } catch (error) {
      console.error("Сэтгэгдэл илгээхэд алдаа гарлаа:", error);
    }
  };

  // Ачааллаж байх явцад хуудас хоосон унахаас сэргийлнэ
  if (loading) {
    return <div className="min-h-screen bg-[#06090D] text-white flex items-center justify-center text-xs font-bold">Уншиж байна...</div>;
  }

  return (
    <main className="min-h-screen bg-[#06090D] text-white relative">
      {/* 🟩 ШИНЭЧЛЭВ: УНШИХ ХУУДАС ДЭЭРХ ХААЛТТАЙ БҮЛГИЙН НОГООН ЦООЖТОЙ ПОПАП ЦОНХ */}
      {showLockModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-green-500/20 bg-[#141922] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              <Lock size={22} />
            </div>
            <h2 className="mt-5 text-xl font-bold">Хаалттай бүлэг</h2>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">Энэ бүлгийг уншихын тулд Coin эсвэл Premium эрх хэрэгтэй!</p>
            <div className="mt-6">
              <button 
                onClick={() => router.replace(`/manga/${mangaId}`)}
                className="w-full rounded-2xl bg-green-500 py-3.5 font-bold text-black hover:bg-green-400 transition"
              >
                БҮЛГҮҮД РҮҮ БУЦАХ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Сэтгэгдэл устгах баталгаажуулах цонх */}
      {commentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/20 bg-[#141922] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <Trash2 size={20} />
            </div>
            <h2 className="mt-4 text-lg font-bold">Сэтгэгдэл устгах</h2>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">Та энэ сэтгэгдлийг устгахдаа итгэлтэй байна уу?</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setCommentToDelete(null)} className="flex-1 rounded-xl bg-[#232A35] py-2.5 text-xs font-semibold text-gray-300">БОЛИХ</button>
              <button onClick={handleDeleteComment} className="flex-1 rounded-xl bg-red-700 py-2.5 text-xs font-semibold text-white hover:bg-red-600">УСТГАХ</button>
            </div>
          </div>
        </div>
      )}

      {/* Дээд талын удирдах цэс */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[#1A202C] bg-[#0B0F14]/90 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.replace(`/manga/${mangaId}`)}
            className="rounded-full p-2 hover:bg-[#1A202B] text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={20} />
          </button>
          
          <button 
            onClick={() => router.replace(`/manga/${mangaId}`)}
            className="text-left outline-none active:scale-95 transition-transform"
          >
            {/* 🚀 ЗАСВАРЛАВ: mangaId биш бодит датабаазаас уншсан гарчгийг харуулна */}
            <h1 className="text-xs text-gray-400 uppercase hover:text-green-400 cursor-pointer font-medium tracking-wide">
              {mangaTitle || mangaId?.replace("-", " ")}
            </h1>
          </button>
        </div>

        {/* Гол хэсэгт Бүлгийн дугаар */}
        <div className="text-center">
          <h2 className="text-base font-bold text-green-400 md:text-lg">Бүлэг - {chapterId}</h2>
        </div>

        {/* Өмнөх/Дараах бүлэг рүү шилжих */}
        <div className="flex items-center gap-2">
          <button 
            disabled={Number(chapterId) <= 1}
            onClick={() => router.replace(`/manga/${mangaId}/${Number(chapterId) - 1}`)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141922] border border-[#232A35] text-gray-400 hover:border-green-500 hover:text-green-400 disabled:opacity-30 transition"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            onClick={() => router.replace(`/manga/${mangaId}/${Number(chapterId) + 1}`)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141922] border border-[#232A35] text-gray-400 hover:border-green-500 hover:text-green-400 transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Манга унших хэсэг */}
      <div className="mx-auto max-w-2xl px-0 md:px-4 py-2">
        <div className="flex flex-col bg-black">
          {!showLockModal && pages.map((pageUrl, index) => (
            <img
              key={index}
              src={pageUrl}
              alt={`Page ${index + 1}`}
              loading="lazy"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="w-full h-auto object-contain select-none pointer-events-none"
            />
          ))}
        </div>
      </div>
      {/* 🟩 СЭТГЭГДЛИЙН ХЭСЭГ */}
      <div className="mx-auto max-w-2xl border-t border-[#1A202C] bg-[#0B0F14] px-4 py-6 md:rounded-t-3xl mt-4">
        <div className="mb-4 flex items-center gap-2 text-base font-bold">
          <MessageSquare size={16} className="text-green-400" />
          <h3>Сэтгэгдлүүд ({comments.length})</h3>
        </div>

        {user ? (
          <form onSubmit={handleAddComment} className="mb-6 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Сэтгэгдэл бичих..."
              className="flex-1 rounded-xl border border-[#232A35] bg-[#141922] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-green-500 transition-all"
            />
            <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 text-black hover:bg-green-400 transition flex-shrink-0">
              <Send size={14} />
            </button>
          </form>
        ) : (
          <p className="mb-5 text-xs text-gray-500">Сэтгэгдэл бичихийн тулд нэвтэрнэ үү.</p>
        )}

        {/* Сэтгэгдлийн жагсаалт */}
        <div className="space-y-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 rounded-xl border border-[#1A202C] bg-[#141922]/40 p-3 text-xs justify-between items-start">
              <div className="flex gap-3 flex-1">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[#232A35] bg-[#0B0F14] text-gray-400">
                  <User size={12} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-semibold text-gray-200">{comment.user || "Хэрэглэгч"}</span>
                  </div>
                  
                  {editingCommentId === comment.id ? (
                    <div className="flex gap-2 mt-2">
                      <input 
                        type="text" 
                        value={editingText} 
                        onChange={(e) => setEditingText(e.target.value)} 
                        className="flex-1 rounded-lg border border-[#232A35] bg-[#141922] px-2 py-1 text-white outline-none text-xs" 
                      />
                      <button onClick={() => handleUpdateComment(comment.id)} className="bg-green-500 text-black px-2 rounded-lg text-[9px] font-bold">Хадгалах</button>
                      <button onClick={() => setEditingCommentId(null)} className="bg-[#232A35] text-white px-2 rounded-lg text-[9px]">Болих</button>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-400 leading-relaxed whitespace-pre-wrap break-all">{comment.text}</p>
                  )}
                </div>
              </div>

              {/* Өөрийн сэтгэгдэл дээр Засах / Устгах харуулна */}
              {user && user.uid === comment.userId && editingCommentId !== comment.id && (
                <div className="flex gap-2 text-[10px] font-semibold flex-shrink-0 pt-0.5">
                  <button onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.text); }} className="text-gray-400 hover:text-green-400 transition-colors">Засах</button>
                  <button onClick={() => setCommentToDelete(comment.id)} className="text-gray-500 hover:text-red-400 transition-colors">Устгах</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}
  
      
    