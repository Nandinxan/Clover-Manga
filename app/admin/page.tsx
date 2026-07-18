"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, setDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { PlusCircle, BookOpen, ShieldAlert, LogOut, Check, FolderPlus, Layers, Users, Coins, Search, ShieldCheck, Mail, Lock as LockIcon, Trash2, Edit3 } from "lucide-react";

interface MangaForm {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_image: string;
  genres: string;
  placement: "trending" | "recommended" | "none";
  status: "ongoing" | "completed" | "free";
  is_banner: boolean;
  is18: boolean;
}

interface ChapterForm {
  manga_id: string;
  chapter_number: number;
  title: string;
  images: string;
  is_premium: boolean;
}
export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mangas, setMangas] = useState<any[]>([]);

  // Гишүүдийн койн, эрх удирдах төлөвүүд
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);
  const [editCoinsAmount, setEditCoinsAmount] = useState<number>(0);
  const [editAccessType, setEditAccessType] = useState<string>("Free");
  const [editAccessDays, setEditAccessAccessDays] = useState<number>(30);

  // Gmail болон Нууц үгээр нэвтрэх төлөвүүд
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // 🚀 Манга болон Бүлэг засах ухаалаг төлөвүүд
  const [isEditingManga, setIsEditingManga] = useState(false);
  const [oldMangaId, setOldMangaId] = useState("");

  // 🔒 Зөвхөн чиний аккаунтуудыг нэвтрүүлнэ
  const allowedEmails = [
    "nandinxanclover@gmail.com",
    "tsogoonandinerdene31@gmail.com"
  ];
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email && allowedEmails.includes(currentUser.email)) {
        setUser(currentUser);
        setIsAdmin(true);
        try {
          const mangaSnap = await getDocs(collection(db, "manga"));
          setMangas(mangaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          const usersSnap = await getDocs(collection(db, "users"));
          setAllUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
        } catch (e) {
          console.error("Дата уншихад алдаа гарлаа:", e);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  // 🚀 1. Чиний хүссэн цэвэрхэн Gmail болон Нууц үгээр нэвтрэх функц
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!emailInput.trim() || !passwordInput.trim()) {
      return setAuthError("И-мэйл болон Нууц үгийг гүйцэд бөглөнө үү!");
    }
    
    if (!allowedEmails.includes(emailInput.trim().toLowerCase())) {
      return setAuthError("Танд админ самбар руу нэвтрэх эрх байхгүй!");
    }

    try {
      await signInWithEmailAndPassword(auth, emailInput.trim().toLowerCase(), passwordInput);
    } catch (error: any) {
      console.error(error);
      setAuthError("Нэвтрэх хуудасны мэдээлэл буруу байна. (Нууц үгээ шалгана уу)");
    }
  };

  // 🚀 2. Системээс гарах функц
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setEmailInput("");
    setPasswordInput("");
  };
  // 🚀 ГИШҮҮНИЙ КОЙН БОЛОН VIP ЭРХИЙГ ШИНЭЧЛЭХ ЛОГИК
  const handleUpdateUserWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return alert("Засах хэрэглэгчийг сонгоно уу!");

    try {
      const userRef = doc(db, "users", selectedUserForEdit.uid);
      let accessEndISO = selectedUserForEdit.accessEnd || null;

      if (editAccessType === "Premium" || editAccessType === "premium") {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + Number(editAccessDays));
        accessEndISO = endDate.toISOString();
      } else {
        accessEndISO = null; 
      }

      await updateDoc(userRef, {
        coins: Number(editCoinsAmount),
        accessType: editAccessType,
        accessEnd: accessEndISO
      });

      alert("Гишүүний мэдээлэл амжилттай шинэчлэгдлээ!");
      const usersSnap = await getDocs(collection(db, "users"));
      setAllUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      setSelectedUserForEdit(null); 
    } catch (error) {
      console.error(error);
      alert("Гишүүний датаг шинэчлэхэд алдаа гарлаа.");
    }
  };
  // 🚀 ШИНЭ МАНГА НЭМЭХ БОЛОН УХААЛАГ ЗАСАХ ЛОГИК
  const [mangaForm, setMangaForm] = useState<MangaForm>({
    id: "", title: "", author: "", description: "", cover_image: "",
    genres: "", placement: "none", status: "ongoing", is_banner: false, is18: false
  });

  const handleAddManga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mangaForm.id.trim() || !mangaForm.title.trim()) {
      return alert("Манганы ID болон Гарчгийг заавал бөглөнө үү!");
    }

    try {
      const newMangaId = mangaForm.id.trim().toLowerCase();
      const genresArray = mangaForm.genres.split(",").map(g => g.trim()).filter(g => g !== "");

      const dataToSave = {
        title: mangaForm.title,
        author: mangaForm.author || "Үл мэдэгдэх",
        description: mangaForm.description,
        cover_image: mangaForm.cover_image || "/placeholder-cover.jpg",
        genres: genresArray,
        placement: mangaForm.placement,
        status: mangaForm.status, 
        is_banner: mangaForm.is_banner,
        is18: mangaForm.is18,
        views: 0,
        rating: 5.0
      };

      // 🛠️ Хэрэв ID нь солигдож засагдаж байгаа бол хуучин баримтыг устгана
      if (isEditingManga && oldMangaId !== newMangaId) {
        await deleteDoc(doc(db, "manga", oldMangaId));
      }

      await setDoc(doc(db, "manga", newMangaId), dataToSave);
      alert("Манга амжилттай хадгалагдлаа!");
      
      const snap = await getDocs(collection(db, "manga"));
      setMangas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setMangaForm({ id: "", title: "", author: "", description: "", cover_image: "", genres: "", placement: "none", status: "ongoing", is_banner: false, is18: false });
      setIsEditingManga(false);
      setOldMangaId("");
    } catch (error) {
      console.error(error);
      alert("Манга хадгалахад алдаа гарлаа.");
    }
  };

  // 🚀 МАНГА БҮРМӨСӨН УСТГАХ ФУНКЦ
  const handleDeleteManga = async (id: string) => {
    if (!confirm("Энэ мангаг бүрмөсөн устгахдаа итгэлтэй байна уу?")) return;
    try {
      await deleteDoc(doc(db, "manga", id));
      alert("Манга амжилттай устлаа!");
      setMangas(mangas.filter(m => m.id !== id));
    } catch (error) {
      alert("Устгахад алдаа гарлаа.");
    }
  };
  // 🚀 ШИНЭ БҮЛЭГ НЭМЭХ ЛОГИК
  const [chapterForm, setChapterForm] = useState<ChapterForm>({
    manga_id: "", chapter_number: 1, title: "", images: "", is_premium: false
  });

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.manga_id.trim() || !chapterForm.chapter_number) {
      return alert("Манганы ID болон Бүлгийн дугаарыг заавал оруулна үү!");
    }

    try {
      const imagesArray = chapterForm.images
        .split(",")
        .map(url => url.trim())
        .filter(url => url !== "");

      if (imagesArray.length === 0) {
        return alert("Бүлгийн зургуудын линкийг заавал оруулна үү!");
      }

      await addDoc(collection(db, "chapters"), {
        manga_id: chapterForm.manga_id.trim().toLowerCase(),
        chapter_number: Number(chapterForm.chapter_number),
        title: chapterForm.title.trim() || `Бүлэг ${chapterForm.chapter_number}`,
        images: imagesArray,
        is_premium: chapterForm.is_premium, 
        createdAt: new Date().toISOString()
      });

      alert(`Бүлэг ${chapterForm.chapter_number} амжилттай нэмэгдлээ!`);
      setChapterForm({
        manga_id: "",
        chapter_number: Number(chapterForm.chapter_number) + 1, 
        title: "", images: "", is_premium: false
      });
    } catch (error) {
      console.error(error);
      alert("Бүлэг нэмэхэд алдаа гарлаа.");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white font-bold text-xs uppercase tracking-widest animate-pulse">
        Админ хамгаалалтыг шалгаж байна...
      </main>
    );
  }

  // 🔒 Хэрвээ админ нэвтрээгүй бол Gmail болон Нууц үг асууна
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl border border-[#232A35] bg-[#141922] p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
              <ShieldCheck size={24} />
            </div>
            <h2 className="mt-4 text-xl font-black uppercase tracking-wider text-gray-200">Админ самбар</h2>
            <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed px-4">
              Clover Manga-ийн зөвшөөрөгдсөн админууд Gmail болон Нууц үгээрээ нэвтрэнэ үү.
            </p>
          </div>

          {authError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center text-[11px] font-bold text-red-400">
              {authError}
            </div>
          )}

          {/* 🚀 GMAIL БОЛОН PASSWORD НЭХЭХ ФОРМ ХЭСЭГ */}
          <form onSubmit={handleEmailLogin} className="space-y-4 text-xs font-semibold text-gray-400">
            <div>
              <label className="block mb-1.5 font-bold text-gray-400">Админ Gmail хаяг:</label>
              <div className="relative">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] pl-9 pr-3 py-3 text-white placeholder-gray-700 outline-none focus:border-green-500 transition-all font-bold"
                />
                <Mail className="absolute left-3 top-3.5 text-gray-600" size={14} />
              </div>
            </div>
            <div>
              <label className="block mb-1.5 font-bold text-gray-400">Нууц үг (Password):</label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] pl-9 pr-3 py-3 text-white placeholder-gray-700 outline-none focus:border-green-500 transition-all font-bold"
                />
                <LockIcon className="absolute left-3 top-3.5 text-gray-600" size={14} />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-green-500 py-3.5 text-xs font-black text-black transition-all hover:bg-green-400 active:scale-[0.99] uppercase tracking-widest font-black shadow-lg shadow-green-500/10 mt-2"
            >
              Нэвтрэх
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1E2530] bg-[#141922]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-2 text-green-400 border border-green-500/20">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-wider text-white">Clover Admin</h1>
              <p className="text-[10px] text-gray-500 font-medium">Үүрд үнэгүй удирдах самбар</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <p className="text-xs font-bold text-gray-200">{user?.displayName || "Админ"}</p>
              <p className="text-[10px] text-gray-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#232A35] bg-[#141922] p-2.5 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition active:scale-95 flex items-center justify-center"
              title="Системээс гарах"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Үндсэн агуулга */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 space-y-8">
        
        {/* ГИШҮҮДИЙН ЭРХ БОЛОН КОЙН ХЯНАХ ТАЛБАР */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#232A35] pb-4">
            <div className="flex items-center gap-2">
              <Users className="text-green-400" size={22} />
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider">Гишүүдийн хэтэвч, эрхийн удирдлага</h2>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Нийт {allUsers.length} хэрэглэгч байна</p>
              </div>
            </div>
            
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Гишүүний нэрээр хайх..."
                className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-green-500 transition-all font-medium"
              />
              <Search className="absolute left-3 top-2.5 text-gray-600" size={14} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232A35] text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Хэрэглэгч</th>
                  <th className="py-3 px-4">И-мэйл хаяг</th>
                  <th className="py-3 px-4 text-center">Койн (Coins)</th>
                  <th className="py-3 px-4">Эрхийн төрөл</th>
                  <th className="py-3 px-4 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232A35]/40 font-medium text-gray-300">
                {allUsers
                  .filter((u) => {
                    const nameMatch = (u.displayName || "Хэрэглэгч").toLowerCase().includes(userSearchQuery.toLowerCase());
                    const emailMatch = (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase());
                    return nameMatch || emailMatch;
                  })
                  .slice(0, 10)
                  .map((u) => {
                    const hasVip = u.accessType === "Premium" || u.accessType === "premium";
                    const isExpired = u.accessEnd ? new Date() > new Date(u.accessEnd) : true;
                    return (
                      <tr key={`user-wallet-list-${u.uid}`} className="hover:bg-[#0B0F14]/40 transition duration-150">
                        <td className="py-3.5 px-4 font-bold text-gray-200">{u.displayName || "Хэрэглэгч"}</td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">{u.email || "Холбоогүй"}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-yellow-400 text-sm">
                          <span className="inline-flex items-center gap-1 justify-center bg-yellow-500/5 px-2 py-0.5 rounded-lg border border-yellow-500/10">
                            <Coins size={12} className="text-yellow-500" /> {u.coins || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded font-bold border text-[10px] uppercase tracking-wider ${
                            hasVip && !isExpired
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-gray-500/10 border-gray-500/20 text-gray-400"
                          }`}>
                            {hasVip && !isExpired ? "💎 VIP Эрхтэй" : "Үнэгүй (Free)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForEdit(u);
                              setEditCoinsAmount(u.coins || 0);
                              setEditAccessType(u.accessType || "Free");
                            }}
                            className="rounded-lg border border-[#232A35] bg-[#0B0F14] px-3 py-1.5 text-[11px] font-bold text-green-400 hover:border-green-500 hover:bg-green-500/5 transition active:scale-95"
                          >
                            Засах
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ГИШҮҮНИЙ МЭДЭЭЛЭЛ ЗАСАХ УХААЛАГ ПОПАП ЦОНХ */}
        {selectedUserForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-2xl text-xs">
              <div className="flex items-center gap-2 border-b border-[#232A35] pb-3 mb-4">
                <ShieldCheck className="text-green-400" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white">Хэтэвч засах</h3>
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5">{selectedUserForEdit.displayName || "Хэрэглэгч"}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateUserWallet} className="space-y-4 font-semibold text-gray-300">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Койны үлдэгдэл (Coins):</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editCoinsAmount}
                      onChange={(e) => setEditCoinsAmount(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] pl-9 pr-3 py-3 text-white font-bold text-sm outline-none focus:border-green-500 transition-all"
                    />
                    <Coins className="absolute left-3 top-3.5 text-yellow-500" size={14} />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Эрхийн төрөл (Access Type):</label>
                  <select
                    value={editAccessType}
                    onChange={(e) => setEditAccessType(e.target.value)}
                    className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold cursor-pointer"
                  >
                    <option value="Free">Үнэгүй (Free)</option>
                    <option value="Premium">Premium VIP</option>
                  </select>
                </div>

                {(editAccessType === "Premium" || editAccessType === "premium") && (
                  <div>
                    <label className="block text-gray-400 font-bold mb-1.5">VIP эрх сунгах хоног:</label>
                    <select
                      value={editAccessDays}
                      onChange={(e) => setEditAccessAccessDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold cursor-pointer text-green-400"
                    >
                      <option value={30}>30 Хоног (1 Сар)</option>
                      <option value={90}>90 Хоног (3 Сар)</option>
                      <option value={180}>180 Хоног (6 Сар)</option>
                      <option value={365}>365 Хоног (1 Жил)</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUserForEdit(null)}
                    className="flex-1 rounded-xl bg-[#232A35] py-3 font-bold text-gray-300 transition active:scale-95"
                  >
                    БОЛИХ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-green-500 py-3 font-black text-black hover:bg-green-400 transition active:scale-95 uppercase tracking-wider shadow-lg shadow-green-500/10 font-bold"
                  >
                    ХАДГАЛАХ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* МАНГА БҮРТГЭХ ХЭСЭГ */}
          <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-[#232A35] pb-3">
              <PlusCircle className="text-green-400" size={20} />
              <h2 className="text-base font-bold uppercase tracking-wider">Шинэ манга нэмэх / Засах</h2>
            </div>

            <form onSubmit={handleAddManga} className="space-y-4 text-xs">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Манганы ID (Бага үсгээр):</label>
                  <input type="text" value={mangaForm.id} onChange={(e) => setMangaForm({...mangaForm, id: e.target.value})} placeholder="solo-leveling" className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold" />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Манганы гарчиг:</label>
                  <input type="text" value={mangaForm.title} onChange={(e) => setMangaForm({...mangaForm, title: e.target.value})} placeholder="Solo Leveling" className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Зохиолч:</label>
                  <input type="text" value={mangaForm.author} onChange={(e) => setMangaForm({...mangaForm, author: e.target.value})} placeholder="Chugong" className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all" />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Кавер зураг (URL линк):</label>
                  <input type="text" value={mangaForm.cover_image} onChange={(e) => setMangaForm({...mangaForm, cover_image: e.target.value})} placeholder="https://..." className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">Төрлүүд (Таслалаар тусгаарлана):</label>
                <input type="text" value={mangaForm.genres} onChange={(e) => setMangaForm({...mangaForm, genres: e.target.value})} placeholder="Action, Fantasy" className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold" />
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">Тайлбар бичвэр:</label>
                <textarea value={mangaForm.description} onChange={(e) => setMangaForm({...mangaForm, description: e.target.value})} placeholder="Манганы тухай..." rows={3} className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all leading-relaxed resize-none" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Нүүр хуудасны байршил:</label>
                  <select value={mangaForm.placement} onChange={(e) => setMangaForm({...mangaForm, placement: e.target.value as any})} className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold cursor-pointer">
                    <option value="none">Энгийн жагсаалтад</option>
                    <option value="trending">Эрэлттэй хэсэгт</option>
                    <option value="recommended">Санал болгох хэсэгт</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Манганы төлөв (Status):</label>
                  <select value={mangaForm.status} onChange={(e) => setMangaForm({...mangaForm, status: e.target.value as any})} className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold cursor-pointer">
                    <option value="ongoing">Үргэлжилж буй</option>
                    <option value="completed">Дууссан</option>
                    <option value="free">Үнэгүй унших хэсэгт (Free)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <label className="flex items-center gap-3 rounded-xl border border-[#232A35] bg-[#0B0F14]/40 p-3.5 cursor-pointer select-none">
                  <input type="checkbox" checked={mangaForm.is_banner} onChange={(e) => setMangaForm({...mangaForm, is_banner: e.target.checked})} className="h-4 w-4 rounded accent-green-500" />
                  <span className="font-bold text-gray-300">Том банер болгох</span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[#232A35] bg-[#0B0F14]/40 p-3.5 cursor-pointer select-none">
                  <input type="checkbox" checked={mangaForm.is18} onChange={(e) => setMangaForm({...mangaForm, is18: e.target.checked})} className="h-4 w-4 rounded accent-red-500" />
                  <span className="font-bold text-red-400">+18 Насны хаалт</span>
                </label>
              </div>

              <button type="submit" className="w-full rounded-xl bg-green-500 py-3.5 font-black text-black hover:bg-green-400 transition flex items-center justify-center gap-2 uppercase font-bold mt-2">
                <Check size={16} strokeWidth={3} /> Манга хадгалах
              </button>
            </form>
          </div>
          {/* БҮЛЭГ (CHAPTER) НЭМЭХ ХЭСЭГ */}
          <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-5 h-fit">
            <div className="flex items-center gap-2 border-b border-[#232A35] pb-3">
              <FolderPlus className="text-green-400" size={20} />
              <h2 className="text-base font-bold uppercase tracking-wider">Шинэ бүлэг (Chapter) нэмэх</h2>
            </div>

            <form onSubmit={handleAddChapter} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-bold mb-1.5">Манганы ID (Алинд орохыг заана):</label>
                <input type="text" value={chapterForm.manga_id} onChange={(e) => setChapterForm({...chapterForm, manga_id: e.target.value})} placeholder="solo-leveling" className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Бүлгийн дугаар:</label>
                  <input type="number" value={chapterForm.chapter_number} onChange={(e) => setChapterForm({...chapterForm, chapter_number: parseInt(e.target.value) || 1})} placeholder="6" className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all font-bold" />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1.5">Бүлгийн дэд гарчиг:</label>
                  <input type="text" value={chapterForm.title} onChange={(e) => setChapterForm({...chapterForm, title: e.target.value})} placeholder="Эхлэл" className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1.5">Бүлгийн зургууд (Линкийг таслалаар ',' тусгаарлана):</label>
                <textarea value={chapterForm.images} onChange={(e) => setChapterForm({...chapterForm, images: e.target.value})} placeholder="https://link1.com, https://link2.com" rows={4} className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-3 text-white outline-none focus:border-green-500 transition-all leading-relaxed font-mono" />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-[#232A35] bg-[#0B0F14]/40 p-3.5 cursor-pointer select-none">
                <input type="checkbox" checked={chapterForm.is_premium} onChange={(e) => setChapterForm({...chapterForm, is_premium: e.target.checked})} className="h-4 w-4 rounded accent-green-500" />
                <span className="font-bold text-green-400">Premium бүлэг (10 Койн / VIP цоожтой болгох)</span>
              </label>

              <button type="submit" className="w-full rounded-xl bg-green-500 py-3.5 font-black text-black hover:bg-green-400 transition flex items-center justify-center gap-2 uppercase font-bold mt-2">
                <FolderPlus size={16} /> Бүлэг нэмэх
              </button>
            </form>
          </div>
        </div>

        {/* ОДОО БАЙГАА МАНГАНУУДЫН ХЯНАЛТ ХҮСНЭГТ (ШИНЭЧЛЭГДСЭН ЗАСАХ/УСТГАХ ЦЭС) */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232A35] pb-3">
            <BookOpen className="text-green-400" size={20} />
            <h2 className="text-base font-bold uppercase tracking-wider">Одоо байгаа манганууд ({mangas.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232A35] text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Кавер</th>
                  <th className="py-3 px-4">Гарчиг / ID</th>
                  <th className="py-3 px-4">Төлөв (Status)</th>
                  <th className="py-3 px-4">Харагдац</th>
                  <th className="py-3 px-4">Шошго</th>
                  <th className="py-3 px-4 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232A35]/40 font-medium">
                {mangas.map((manga) => (
                  <tr key={`admin-list-${manga.id}`} className="hover:bg-[#0B0F14]/40 transition duration-150">
                    <td className="py-3 px-4">
                      <div className="h-14 w-10 overflow-hidden rounded-lg border border-[#232A35] bg-black">
                        <img src={manga.cover_image} alt="" className="h-full w-full object-cover" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-200 text-sm">{manga.title}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{manga.id}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg font-bold border ${
                        manga.status === "free" 
                          ? "bg-green-500/10 border-green-500/20 text-green-400" 
                          : manga.status === "completed"
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                      }`}>
                        {manga.status === "free" ? "Үнэгүй унших" : manga.status === "completed" ? "Дууссан" : "Үргэлжилж буй"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-400">
                        {manga.placement === "trending" ? "🔥 Эрэлттэй" : manga.placement === "recommended" ? "🌟 Санал болгох" : "📁 Энгийн"}
                      </span>
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      {manga.is18 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
                          +18 Хаалттай
                        </span>
                      )}
                      {manga.is_banner && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold ml-1">
                          Том Банер
                        </span>
                      )}
                    </td>
                    {/* 🚀 ҮЙЛДЭЛ ХЭСЭГ: МАНГАГ ШУУД УСТГАХ БОЛОН ЗАСАХ ТОВЧЛУУРУУД */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingManga(true);
                            setOldMangaId(manga.id);
                            setMangaForm({
                              id: manga.id,
                              title: manga.title || "",
                              author: manga.author || "",
                              description: manga.description || "",
                              cover_image: manga.cover_image || "",
                              genres: Array.isArray(manga.genres) ? manga.genres.join(", ") : "",
                              placement: manga.placement || "none",
                              status: manga.status || "ongoing",
                              is_banner: !!manga.is_banner,
                              is18: !!manga.is18
                            });
                            window.scrollTo({ top: 500, behavior: "smooth" });
                          }}
                          className="p-2 rounded-lg border border-[#232A35] bg-[#0B0F14] text-green-400 hover:border-green-500 transition"
                          title="Засах"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteManga(manga.id)}
                          className="p-2 rounded-lg border border-[#232A35] bg-[#0B0F14] text-red-400 hover:border-red-500 transition"
                          title="Устгах"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
