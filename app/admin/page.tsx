"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase"; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, setDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { PlusCircle, BookOpen, ShieldAlert, LogOut, Check, FolderPlus, Layers, Users, Coins, Search, ShieldCheck, Mail, Lock as LockIcon, Trash2, Edit3, ImageIcon, Loader2 } from "lucide-react";

interface MangaForm {
  title: string;
  description: string;
  cover_image: string;
  banner_image: string;
  genres: string;
  status: "ongoing" | "paused" | "completed";
  is_banner: boolean;
  is18: boolean;
  is_free: boolean;
}

interface ChapterForm {
  manga_id: string;
  chapter_number: number;
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
  const [visibleUsersCount, setVisibleUsersCount] = useState<number>(5); 
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);
  const [editCoinsAmount, setEditCoinsAmount] = useState<number>(0);
  const [editAccessType, setEditAccessType] = useState<string>("Free");
  const [editAccessDays, setEditAccessAccessDays] = useState<number>(30);

  // Gmail болон Нууц үгээр нэвтрэх төлөвүүд
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Манга болон Бүлэг засах ухаалаг төлөвүүд
  const [isEditingManga, setIsEditingManga] = useState(false);
  const [oldMangaId, setOldMangaId] = useState("");

  // Бүлэг удирдах, устгахад ашиглах төлөвүүд
  const [selectedMangaForChapters, setSelectedMangaForChapters] = useState<string>("");
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  // Зураг хуулалтын явцыг хувиар (%) харуулах төлөвүүд
  const [imageUploading, setImageUploading] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number>(0); 
  
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number>(0); 
  
  const [chapterImagesUploading, setChapterImagesUploading] = useState(false);
  const [chapterUploadProgress, setChapterUploadProgress] = useState<string>("");
  const [chapterCurrentPageProgress, setChapterCurrentPageProgress] = useState<number>(0); 

  const allowedEmails = [
    "nandinxanclover@gmail.com",
    "tsogoonandinerdene31@gmail.com"
  ];
  useEffect(() => {
    let unsubscribeUsers: () => void;
    let unsubscribeMangas: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email && allowedEmails.includes(currentUser.email)) {
        setUser(currentUser);
        setIsAdmin(true);
        try {
          const mangaRef = collection(db, "manga");
          unsubscribeMangas = onSnapshot(mangaRef, (snapshot) => {
            setMangas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }, (err) => {
            console.error("Манга датаг шууд татахад алдаа гарлаа:", err);
          });
          
          const usersRef = collection(db, "users");
          const q = query(usersRef, orderBy("createdAt", "desc"));
          
          unsubscribeUsers = onSnapshot(q, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
          }, (err) => {
            console.error("Хэрэглэгчдийн датаг шууд татахад алдаа гарлаа:", err);
          });

        } catch (e) {
          console.error("Дата уншихад алдаа гарлаа:", e);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeMangas) unsubscribeMangas();
    };
  }, []);

  // Сонгосон манганы бүлгүүдийг Firestore-оос Realtime Сонсож татах логик
  useEffect(() => {
    if (!selectedMangaForChapters) {
      setChaptersList([]);
      return;
    }

    setChaptersLoading(true);
    const chaptersRef = collection(db, "chapters");
    const q = query(
      chaptersRef, 
      where("manga_id", "==", selectedMangaForChapters.toLowerCase()),
      orderBy("chapter_number", "asc")
    );

    const unsubscribeChapters = onSnapshot(q, (snapshot) => {
      setChaptersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setChaptersLoading(false);
    }, (err) => {
      console.error("Бүлгүүдийг татахад алдаа гарлаа:", err);
      setChaptersLoading(false);
    });

    return () => unsubscribeChapters();
  }, [selectedMangaForChapters]);

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

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setEmailInput("");
    setPasswordInput("");
  };
  // ГИШҮҮНИЙ КОЙН БОЛОН VIP ЭРХИЙГ ШИНЭЧЛЭХ ЛОГИК
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
      setSelectedUserForEdit(null); 
    } catch (error) {
      console.error(error);
      alert("Гишүүний датаг шинэчлэхэд алдаа гарлаа.");
    }
  };

  // Ковер зургийг R2 руу хуулах явцыг хувиар (%) тооцоолно
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // 🚀 БҮРЭН ЗАСАГДВАРЛАГДСАН: Тэгш хаалт [0] нэмж алдааг бүрмөсөн арилгав
    if (!file) return;

    try {
      setImageUploading(true);
      setCoverUploadProgress(0);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1080;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                alert("Зургийг хөрвүүлэхэд алдаа гарлаа.");
                setImageUploading(false);
                return;
              }

              const cleanFileName = `cover_${Date.now()}.jpg`;
              const formData = new FormData();
              formData.append("file", blob, cleanFileName);

              const xhr = new XMLHttpRequest();
              xhr.open("POST", "/api/upload", true);

              xhr.upload.onprogress = (progressEvent) => {
                if (progressEvent.lengthComputable) {
                  const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  setCoverUploadProgress(percentage);
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.url) {
                      setMangaForm((prev: MangaForm) => ({ ...prev, cover_image: data.url }));
                    } else {
                      alert("R2 API-оос зургийн линк ирсэнгүй.");
                    }
                  } catch (err) {
                    alert("Хариу уншихад алдаа гарлаа.");
                  }
                } else {
                  alert("R2 руу хуулахад алдаа гарлаа.");
                }
                setImageUploading(false);
              };

              xhr.onerror = () => {
                alert("Сүлжээний алдаа гарлаа.");
                setImageUploading(false);
              };

              xhr.send(formData);
            },
            "image/jpeg",
            0.8
          );
        };
      };
    } catch (err) {
      console.error("Ерөнхий алдаа:", err);
      setImageUploading(false);
    }
  };
  // Баннер зургийг R2 руу хуулах явцыг хувиар (%) тооцоолно
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // 🚀 БҮРЭН ЗАСАГДВАРЛАГДСАН: Тэгш хаалт болон индексийг зөв тавьж алдааг бүрмөсөн арилгав
    if (!file) return;

    try {
      setBannerUploading(true);
      setBannerUploadProgress(0);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1920; 
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                alert("Зургийг хөрвүүлэхэд алдаа гарлаа.");
                setBannerUploading(false);
                return;
              }

              const cleanFileName = `banner_${Date.now()}.jpg`;
              const formData = new FormData();
              formData.append("file", blob, cleanFileName);

              const xhr = new XMLHttpRequest();
              xhr.open("POST", "/api/upload", true);

              xhr.upload.onprogress = (progressEvent) => {
                if (progressEvent.lengthComputable) {
                  const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  setBannerUploadProgress(percentage);
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.url) {
                      setMangaForm((prev: MangaForm) => ({ ...prev, banner_image: data.url }));
                    } else {
                      alert("R2 API-оос зургийн линк ирсэнгүй.");
                    }
                  } catch (err) {
                    alert("Хариу уншихад алдаа гарлаа.");
                  }
                } else {
                  alert("R2 руу хуулахад алдаа гарлаа.");
                }
                setBannerUploading(false);
              };

              xhr.onerror = () => {
                alert("Сүлжээний алдаа гарлаа.");
                setBannerUploading(false);
              };

              xhr.send(formData);
            },
            "image/jpeg",
            0.85
          );
        };
      };
    } catch (err) {
      console.error("Ерөнхий алдаа:", err);
      setBannerUploading(false);
    }
  };
  // Олон зураг зэрэг хуулахад тухайн хуудас бүрийн ачаалж буй хувийг (%) тодорхой харуулна
  const handleChapterImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!chapterForm.manga_id) {
      alert("Зураг оруулахаас өмнө Мангаг заавал сонгоно уу!");
      e.target.value = "";
      return;
    }

    const compressImage = (file: File): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1200;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Хөрвүүлэлт бүтэлгүйтэв."));
              },
              "image/jpeg",
              0.85
            );
          };
          img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
      });
    };

    const uploadSingleFileXHR = (blob: Blob, fileName: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", blob, fileName);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload", true);

        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setChapterCurrentPageProgress(percentage);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.url) resolve(data.url);
              else reject(new Error("URL олдсонгүй."));
            } catch (err) {
              reject(new Error("Хариу уншиж чадсангүй."));
            }
          } else {
            reject(new Error(`Сервер алдаа заалаа: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Сүлжээний алдаа гарлаа."));
        xhr.send(formData);
      });
    };

    try {
      setChapterImagesUploading(true);
      const uploadedUrls: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        setChapterCurrentPageProgress(0); 
        setChapterUploadProgress(`Боловсруулж байна: ${i + 1} / ${totalFiles}`);

        try {
          const compressedBlob = await compressImage(file);
          const cleanFileName = `page_${i + 1}_${Date.now()}.jpg`;
          const url = await uploadSingleFileXHR(compressedBlob, cleanFileName);
          uploadedUrls.push(url);
        } catch (singleFileError) {
          console.error(`${file.name} файлыг R2 руу хуулахад алдаа гарлаа:`, singleFileError);
        }
      }

      const currentImages = chapterForm.images ? chapterForm.images.split(",").map(u => u.trim()).filter(Boolean) : [];
      const allImages = [...currentImages, ...uploadedUrls].join(",");

      setChapterForm(prev => ({ ...prev, images: allImages }));
      setChapterUploadProgress("Бүх зураг R2 руу амжилттай хуулагдлаа! 🎉");
    } catch (err) {
      console.error("Бүлгийн зураг хуулахад ерөнхий алдаа гарлаа:", err);
      alert("Зураг хуулахад алдаа гарлаа.");
    } finally {
      setChapterImagesUploading(false);
      setChapterCurrentPageProgress(0);
      e.target.value = ""; 
    }
  };
  // Манга үүсгэх болон хадгалах логик
  const [mangaForm, setMangaForm] = useState<MangaForm>({
    title: "", description: "", cover_image: "", banner_image: "",
    genres: "", status: "ongoing", is_banner: false, is18: false, is_free: false
  });

  const handleAddManga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mangaForm.title.trim()) {
      return alert("Манганы Гарчгийг заавал бөглөнө үү!");
    }
    if (imageUploading || bannerUploading) {
      return alert("Зураг ачааллаж байна, түр хүлээнэ үү!");
    }

    try {
      const generatedId = mangaForm.title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, "");

      const newMangaId = isEditingManga ? oldMangaId : generatedId;
      const genresArray = mangaForm.genres.split(",").map(g => g.trim()).filter(g => g !== "");
      const automaticPlacement = mangaForm.is_banner ? "trending" : "none";

      const dataToSave = {
        title: mangaForm.title,
        author: "Үл мэдэгдэх", 
        description: mangaForm.description,
        cover_image: mangaForm.cover_image || "/placeholder-cover.jpg",
        banner_image: mangaForm.is_banner ? (mangaForm.banner_image || "/placeholder-banner.jpg") : "",
        genres: genresArray,
        placement: automaticPlacement,
        status: mangaForm.status, 
        is_banner: mangaForm.is_banner,
        is18: mangaForm.is18,
        is_free: mangaForm.is_free,
        views: 0,
        rating: 5.0
      };

      if (isEditingManga && oldMangaId !== newMangaId) {
        await deleteDoc(doc(db, "manga", oldMangaId));
      }

      await setDoc(doc(db, "manga", newMangaId), dataToSave);
      alert("Манга амжилттай хадгалагдлаа!");
      
      setMangaForm({ title: "", description: "", cover_image: "", banner_image: "", genres: "", status: "ongoing", is_banner: false, is18: false, is_free: false });
      setIsEditingManga(false);
      setOldMangaId("");
    } catch (error) {
      console.error(error);
      alert("Манга хадгалахад алдаа гарлаа.");
    }
  };

  const handleDeleteManga = async (id: string) => {
    if (!confirm("Энэ manga-г бүрмөсөн устгахдаа итгэлтэй байна уу?")) return;
    try {
      await deleteDoc(doc(db, "manga", id));
      alert("Манга амжилттай устлаа!");
      setMangas(prev => prev.filter(m => m.id !== id));
      if (selectedMangaForChapters === id) {
        setSelectedMangaForChapters("");
      }
    } catch (error) {
      console.error(error);
      alert("Устгахад алдаа гарлаа.");
    }
  };

  // Тухайн сонгосон бүлгийг (Chapter) бүрмөсөн устгах логик
  const handleDeleteChapter = async (chapterDocId: string, chapterNumber: number) => {
    if (!confirm(`Бүлэг ${chapterNumber}-ийг бүрмөсөн устгахдаа итгэлтэй байна уу?`)) return;
    try {
      await deleteDoc(doc(db, "chapters", chapterDocId));
      alert("Бүлэг амжилттай устлаа!");
    } catch (error) {
      console.error("Бүлэг устгахад алдаа гарлаа:", error);
      alert("Бүлэг устгахад алдаа гарлаа.");
    }
  };

  // Бүлэг нэмэх логик
  const [chapterForm, setChapterForm] = useState<ChapterForm>({
    manga_id: "", chapter_number: 1, images: "", is_premium: false
  });

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.manga_id || !chapterForm.chapter_number) {
      return alert("Манга болон Бүлгийн дугаарыг заавал сонгоно уу!");
    }
    if (chapterImagesUploading) {
      return alert("Зургууд хуулагдаж байна, түр хүлээнэ үү!");
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
        title: `Бүлэг ${chapterForm.chapter_number}`, 
        images: imagesArray,
        is_premium: chapterForm.is_premium, 
        createdAt: new Date().toISOString()
      });

      alert(`Бүлэг ${chapterForm.chapter_number} амжилттай нэмэгдлээ!`);
      setChapterForm({
        manga_id: chapterForm.manga_id, 
        chapter_number: Number(chapterForm.chapter_number) + 1, 
        images: "", is_premium: false
      });
      setChapterUploadProgress("");
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
              Clover Manga-ийн зөвшөөрөгдсөн adm-ууд Gmail болон Нууц үгээрээ нэвтрэнэ үү.
            </p>
          </div>

          {authError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center text-[11px] font-bold text-red-400">
              {authError}
            </div>
          )}

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
              <label className="block mb-1.5 font-bold text-gray-400">Nuuts ug (Password):</label>
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
              className="w-full rounded-2xl bg-green-500 py-3.5 text-xs font-black text-black transition-all hover:bg-green-400 active:scale-[0.99] uppercase tracking-widest shadow-lg shadow-green-500/10 mt-2"
            >
              Nevtreh
            </button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white selection:bg-green-500/30 selection:text-green-300">
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

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#232A35] WebkitOverflowScrolling-touch">
            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
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
                    const nameMatch = (u.username || u.displayName || "Хэрэглэгч").toLowerCase().includes(userSearchQuery.toLowerCase());
                    const emailMatch = (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase());
                    return nameMatch || emailMatch;
                  })
                  .slice(0, visibleUsersCount)
                  .map((u) => {
                    const hasVip = u.accessType === "Premium" || u.accessType === "premium";
                    const isExpired = u.accessEnd ? new Date() > new Date(u.accessEnd) : true;
                    return (
                      <tr key={`user-wallet-list-${u.uid}`} className="hover:bg-[#0B0F14]/40 transition duration-150">
                        <td className="py-3.5 px-4 font-bold text-gray-200">{u.username || u.displayName || "Хэрэглэгч"}</td>
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

          {allUsers.length > visibleUsersCount && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleUsersCount(prev => prev + 10)}
                className="rounded-xl border border-[#232A35] bg-[#0B0F14] px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:border-gray-600 transition active:scale-95"
              >
                Бусад хэрэглэгчдийг харах
              </button>
            </div>
          )}
        </div>
        {/* МАНГА НЭМЭХ БОЛОН ФАЙЛ УДБЛАД ХИЙХ ФОРМ */}
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
              <FolderPlus size={18} className="text-green-400" /> {isEditingManga ? "Манга засах" : "Шинэ манга нэмэх"}
            </h2>
            <form onSubmit={handleAddManga} className="space-y-4 text-xs font-semibold text-gray-400">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block mb-1.5">Манганы нэр (Title):</label>
                  <input
                    type="text"
                    value={mangaForm.title}
                    onChange={(e) => setMangaForm({ ...mangaForm, title: e.target.value })}
                    placeholder="Жишээ нь: Solo Leveling"
                    className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold"
                  />
                  {!isEditingManga && mangaForm.title && (
                    <p className="mt-1 text-[10px] text-gray-500 font-mono">
                      Үүсэх автомат ID: {mangaForm.title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block mb-1.5">Төлөв (Status):</label>
                  <select
                    value={mangaForm.status}
                    onChange={(e) => setMangaForm({ ...mangaForm, status: e.target.value as any })}
                    className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold cursor-pointer"
                  >
                    <option value="ongoing">Гарч байгаа (Ongoing)</option>
                    <option value="paused">Зогссон (Paused)</option>
                    <option value="completed">Дууссан (Completed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5">Төрөл (Genres - Таслалаар зааглах):</label>
                <input
                  type="text"
                  value={mangaForm.genres}
                  placeholder="Action, Fantasy, Adventure"
                  onChange={(e) => setMangaForm({ ...mangaForm, genres: e.target.value })}
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold"
                />
              </div>

              {/* Ковер зургийн Progress Bar харагдац */}
              <div>
                <label className="block mb-1.5 text-green-400 font-bold">Манганы Ковер Зураг:</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="flex flex-1 items-center gap-2 justify-center rounded-xl border border-dashed border-[#232A35] bg-[#0B0F14] px-4 py-3 text-gray-400 cursor-pointer hover:border-green-500/50 transition duration-150">
                      <ImageIcon size={16} />
                      <span>Ковер зураг сонгох</span>
                      <input
                        type="file"
                        accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={imageUploading}
                      />
                    </label>
                    {imageUploading && <Loader2 size={16} className="animate-spin text-green-500" />}
                    {mangaForm.cover_image && (
                      <img src={mangaForm.cover_image} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-[#232A35]" />
                    )}
                  </div>
                  
                  {imageUploading && (
                    <div className="w-full bg-[#0B0F14] rounded-full h-2 border border-[#232A35] overflow-hidden">
                      <div 
                        className="bg-green-500 h-full transition-all duration-150 rounded-full" 
                        style={{ width: `${coverUploadProgress}%` }}
                      ></div>
                      <p className="text-[10px] text-green-400 font-bold mt-1 text-right">Хуулж байна: {coverUploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block mb-1.5">Тайлбар (Description):</label>
                <textarea
                  value={mangaForm.description}
                  rows={3}
                  onChange={(e) => setMangaForm({ ...mangaForm, description: e.target.value })}
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-medium"
                />
              </div>

              {/* Чекбоксууд: Баннер, +18, Үнэгүй */}
              <div className="flex flex-col gap-2 pt-1 border-t border-[#232A35]/40 mt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-white">
                  <input
                    type="checkbox"
                    checked={mangaForm.is_banner}
                    onChange={(e) => setMangaForm({ ...mangaForm, is_banner: e.target.checked })}
                    className="h-4 w-4 rounded border-[#232A35] bg-[#0B0F14] text-green-500 focus:ring-0 cursor-pointer"
                  />
                  Баннер болгох
                </label>

                {mangaForm.is_banner && (
                  <div className="pl-6 py-2 border-l-2 border-green-500/30 space-y-2 animate-fadeIn">
                    <label className="block text-[11px] text-green-400 font-bold">Хэвтээ урт баннер зураг (1920x1080):</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="flex flex-1 items-center gap-2 justify-center rounded-xl border border-dashed border-green-500/20 bg-[#0B0F14] px-4 py-2.5 text-gray-400 cursor-pointer hover:border-green-500/40 transition duration-150 text-[11px]">
                          <ImageIcon size={14} />
                          <span>Баннер зураг сонгох</span>
                          <input
                            type="file"
                            accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp"
                            onChange={handleBannerUpload}
                            className="hidden"
                            disabled={bannerUploading}
                          />
                        </label>
                        {bannerUploading && <Loader2 size={14} className="animate-spin text-green-500" />}
                        {mangaForm.banner_image && (
                          <img src={mangaForm.banner_image} alt="Banner Preview" className="h-10 w-20 rounded-lg object-cover border border-[#232A35]" />
                        )}
                      </div>

                      {bannerUploading && (
                        <div className="w-full bg-[#0B0F14] rounded-full h-1.5 border border-[#232A35] overflow-hidden">
                          <div 
                            className="bg-green-500 h-full transition-all duration-150 rounded-full" 
                            style={{ width: `${bannerUploadProgress}%` }}
                          ></div>
                          <p className="text-[9px] text-green-400 font-bold mt-1 text-right">Хуулж байна: {bannerUploadProgress}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-red-400">
                  <input
                    type="checkbox"
                    checked={mangaForm.is18}
                    onChange={(e) => setMangaForm({ ...mangaForm, is18: e.target.checked })}
                    className="h-4 w-4 rounded border-[#232A35] bg-[#0B0F14] text-red-500 focus:ring-0 cursor-pointer"
                  />
                  +18 Насны хязгаартай
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-blue-400">
                  <input
                    type="checkbox"
                    checked={mangaForm.is_free}
                    onChange={(e) => setMangaForm({ ...mangaForm, is_free: e.target.checked })}
                    className="h-4 w-4 rounded border-[#232A35] bg-[#0B0F14] text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  Үнэгүй унших сайтын хэсэгт харуулах (Is Free)
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-green-500 py-3 text-xs font-black text-black hover:bg-green-400 transition"
              >
                {isEditingManga ? "Өөрчлөлтийг хадгалах" : "Манга үүсгэх"}
              </button>
            </form>
          </div>
          {/* БҮЛЭГ НЭМЭХ ХЭСЭГ */}
          <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
              <PlusCircle size={18} className="text-green-400" /> Шинэ бүлэг нэмэх (Chapter)
            </h2>
            <form onSubmit={handleAddChapter} className="space-y-4 text-xs font-semibold text-gray-400">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block mb-1.5">Манга сонгох:</label>
                  <select
                    value={chapterForm.manga_id}
                    onChange={(e) => setChapterForm({ ...chapterForm, manga_id: e.target.value })}
                    className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold cursor-pointer"
                  >
                    <option value="">--- Манга сонгох ---</option>
                    {mangas.map((m) => (
                      <option key={`select-manga-opt-${m.id}`} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5">Бүлгийн дугаар (Chapter Number):</label>
                  <input
                    type="number"
                    value={chapterForm.chapter_number}
                    onChange={(e) => setChapterForm({ ...chapterForm, chapter_number: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold"
                  />
                </div>
              </div>

              {/* Олон хуудасны ухаалаг Progress Bar */}
              <div>
                <label className="block mb-1.5 text-green-400 font-bold">Манганы хуудсууд (Утаснаас олноор нь зэрэг сонгох):</label>
                <div className="space-y-3">
                  <label className={`flex items-center gap-2 justify-center w-full rounded-xl border border-dashed border-[#232A35] bg-[#0B0F14] px-4 py-4 text-gray-400 cursor-pointer hover:border-green-500/50 transition ${chapterImagesUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <ImageIcon size={18} />
                    <span>Манганы бүх хуудсыг зэрэг сонгох</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,image/heic,image/heif,image/jpeg,image/png,image/webp"
                      onChange={handleChapterImagesUpload}
                      className="hidden"
                      disabled={chapterImagesUploading}
                    />
                  </label>

                  {chapterImagesUploading && (
                    <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#232A35] space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-bold text-gray-400">
                        <span className="text-green-400 animate-pulse">{chapterUploadProgress}</span>
                        <span>{chapterCurrentPageProgress}%</span>
                      </div>
                      <div className="w-full bg-[#141922] rounded-full h-2 overflow-hidden border border-[#232A35]/60">
                        <div 
                          className="bg-green-500 h-full transition-all duration-150 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" 
                          style={{ width: `${chapterCurrentPageProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {chapterForm.images && (
                  <div className="mt-3 p-3 rounded-xl bg-[#0B0F14] border border-[#232A35] max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                    <p className="text-[10px] uppercase font-bold text-gray-500 border-b border-[#232A35] pb-1 mb-2">Хуулагдсан зургуудын дараалал:</p>
                    {chapterForm.images.split(",").map((url, index) => (
                      <div key={`loaded-page-idx-${index}`} className="flex items-center justify-between text-[11px] font-medium text-gray-400 bg-[#141922] px-2.5 py-1 rounded-lg border border-[#232A35]/40">
                        <span className="text-gray-300 font-bold">Хуудас {index + 1}</span>
                        <span className="text-[10px] text-gray-600 font-mono truncate max-w-[180px]">{url}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-1.5">Эсвэл зургийн линкүүд (Таслалаар заагласан URL):</label>
                <textarea
                  rows={2}
                  value={chapterForm.images}
                  onChange={(e) => setChapterForm({ ...chapterForm, images: e.target.value })}
                  placeholder="https://link1.jpg, https://link2.jpg"
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-mono text-[10px]"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-yellow-400">
                  <input
                    type="checkbox"
                    checked={chapterForm.is_premium}
                    onChange={(e) => setChapterForm({ ...chapterForm, is_premium: e.target.checked })}
                    className="h-4 w-4 rounded border-[#232A35] bg-[#0B0F14] text-yellow-500 focus:ring-0 cursor-pointer"
                  />
                  Койноор унших бүлэг болгох (Premium)
                </label>
              </div>

              <button
                type="submit"
                disabled={chapterImagesUploading}
                className={`w-full rounded-2xl bg-green-500 py-3 text-xs font-black text-black hover:bg-green-400 transition ${chapterImagesUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {chapterImagesUploading ? "Зургууд хуулагдаж байна..." : "Бүлэг нэмэх"}
              </button>
            </form>
          </div>
        </div>
        {/* БҮЛГҮҮДИЙГ ХЯНАХ БОЛОН УСТГАХ УХААЛАГ СЕКЦ */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#232A35] pb-4">
            <div className="flex items-center gap-2">
              <Layers className="text-green-400" size={20} />
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider">Манганы бүлгүүд удирдах</h2>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">Мангаг сонгож орсон бүлгүүдийг устгана уу</p>
              </div>
            </div>
            <select
              value={selectedMangaForChapters}
              onChange={(e) => setSelectedMangaForChapters(e.target.value)}
              className="max-w-xs w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2 text-xs text-white font-bold cursor-pointer"
            >
              <option value="">-- Бүлгийг нь үзэх Мангаг сонгох --</option>
              {mangas.map((m) => (
                <option key={`manga-select-chapters-list-${m.id}`} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {selectedMangaForChapters && (
            <div className="overflow-x-auto">
              {chaptersLoading ? (
                <div className="text-center py-6 text-xs text-gray-500 font-bold animate-pulse flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin text-green-500" /> Бүлгүүдийг татаж байна...
                </div>
              ) : chaptersList.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-600 font-bold">Энэ манга дээр одоогоор ямар ч бүлэг нэмэгдээгүй байна.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pt-1">
                  {chaptersList.map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14] border border-[#232A35]/80 hover:border-[#232A35] transition duration-150">
                      <div>
                        <p className="text-xs font-bold text-gray-200">Бүлэг {ch.chapter_number}</p>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">{ch.images?.length || 0} хуудастай • {ch.is_premium ? "💎 VIP" : "Үнэгүй"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(ch.id, ch.chapter_number)}
                        className="rounded-lg bg-[#141922] border border-[#232A35] p-2 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition active:scale-95"
                        title="Бүлэг устгах"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* НИЙТ МАНГАНУУДЫН ЖАГСААЛТ ХАРАГДАХ ХЭСЭГ */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={18} className="text-green-400" /> Нийт манганууд ({mangas.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {mangas.map((m) => (
              <div key={m.id} className="relative rounded-2xl border border-[#232A35] bg-[#0B0F14] p-3 flex flex-col justify-between space-y-3 group">
                <div className="aspect-[3/4] rounded-xl overflow-hidden relative border border-[#232A35]">
                  <img src={m.cover_image} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <span className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-gray-300 border border-white/5 uppercase">
                      {m.status}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-200 line-clamp-1">{m.title}</h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {m.id}</p>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-[#232A35]/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingManga(true);
                      setOldMangaId(m.id);
                      setMangaForm({
                        title: m.title,
                        description: m.description || "",
                        cover_image: m.cover_image,
                        banner_image: m.banner_image || "", 
                        genres: Array.isArray(m.genres) ? m.genres.join(", ") : "",
                        status: m.status || "ongoing",
                        is_banner: m.is_banner || false,
                        is18: m.is18 || false,
                        is_free: m.is_free || false 
                      });
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="flex-1 rounded-lg bg-[#141922] border border-[#232A35] py-1.5 text-[10px] font-bold text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition flex items-center justify-center gap-1"
                  >
                    <Edit3 size={12} /> Засах
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteManga(m.id)}
                    className="rounded-lg bg-[#141922] border border-[#232A35] p-1.5 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div> {/* Үндсэн агуулга хаах div */}

      {/* ГИШҮҮНИЙ МЭДЭЭЛЭЛ ЗАСАХ УХААЛАГ ПОПАП ЦОНХ */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-3xl border border-[#232A35] bg-[#141922] p-6 shadow-2xl text-xs my-auto">
            <div className="flex items-center gap-2 border-b border-[#232A35] pb-3 mb-4">
              <ShieldCheck className="text-green-400" size={20} />
              <div>
                <h3 className="text-sm font-bold text-white">Хэтэвч засах</h3>
                <p className="text-[10px] text-gray-500 font-bold mt-0.5">{selectedUserForEdit.username || selectedUserForEdit.displayName || "Хэрэглэгч"}</p>
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

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="w-1/3 rounded-xl border border-[#232A35] bg-[#0B0F14] py-3 font-bold text-gray-400 hover:text-white transition active:scale-95"
                >
                  Буцах
                </button>
                <button
                  type="submit"
                  className="w-2/3 rounded-xl bg-green-500 py-3 font-black text-black hover:bg-green-400 transition active:scale-95 flex items-center justify-center gap-1"
                >
                  <Check size={14} /> Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
