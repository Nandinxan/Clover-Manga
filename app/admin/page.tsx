"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase"; 
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, setDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { PlusCircle, BookOpen, ShieldAlert, LogOut, Check, FolderPlus, Layers, Users, Coins, Search, ShieldCheck, Mail, Lock as LockIcon, Trash2, Edit3, Image as ImageIcon, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface MangaForm {
  title: string;
  description: string;
  cover_image: string;
  banner_image: string; // 🚀 НЭМЭВ: Баннерын урт зургийн линк хадгалах хувьсагч
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

// 🚀 КИРИЛЛ ҮСГИЙГ АНГЛИ ҮСЭГ РҮҮ ХӨРВҮҮЛЖ, АВТОМАТ ID ҮҮСГЭХ ФУНКЦ
const generateMangaId = (title: string): string => {
  const cyrillicToLatin: { [key: string]: string } = {
    'а':'a','б':'b','вв':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','ө':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ү':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };
  return title
    .toLowerCase()
    .split('')
    .map(char => cyrillicToLatin[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '') 
    .trim()
    .replace(/\s+/g, '-') 
    .replace(/-+/g, '-');
};

// 🚀 ШИНЭ: УТАСНЫ ГАЛЕРЕЙГААС ОРЖ ИРСЭН ТОМ ЗУРГИЙГ АВТОМАТААР ШАХАЖ ХЭМЖЭЭГ БАГАСГАХ ФУНКЦ
const compressImage = (file: File, maxWidth = 1000, maxHeight = 1500, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas to Blob conversion failed"));
          },
          "image/jpeg",
          quality
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mangas, setMangas] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]); 

  // Гишүүдийн койн, эрх удирдах төлөвүүд
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [viewAllUsers, setViewAllUsers] = useState(false); 
  
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);
  const [editCoinsAmount, setEditCoinsAmount] = useState<number>(0);
  const [editAccessType, setEditAccessType] = useState<string>("Free");
  const [editAccessDays, setEditAccessAccessDays] = useState<number>(30);

  // 🔔 Койн болон Эрх өөрчлөх үеийн баталгаажуулах попап цонхны төлөвүүд
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingActionType, setPendingActionType] = useState<"coins" | "access" | null>(null);

  // Gmail болон Нууц үгээр нэвтрэх төлөвүүд
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // 🚀 Манга болон Бүлэг засах ухаалаг төлөвүүд
  const [isEditingManga, setIsEditingManga] = useState(false);
  const [oldMangaId, setOldMangaId] = useState("");
  const [isEditingChapter, setIsEditingChapter] = useState(false); 

  // Зураг хуулахад ашиглах төлөвүүд
  const [imageUploading, setImageUploading] = useState(false);
  const [chapterImagesUploading, setChapterImagesUploading] = useState(false);
  const [chapterUploadProgress, setChapterUploadProgress] = useState<string>("");

  // 🟩 Профайл нэрийг хадгалах төлөв
  const [profileName, setProfileName] = useState<string>("Хэрэглэгч");

  const allowedEmails = [
    "nandinxanclover@gmail.com",
    "tsogoonandinerdene31@gmail.com"
  ];

  // 🚀 1. АЛХАМ: Auth төлөвийг шалгах + Админы нэрийг Realtime сонсох
  useEffect(() => {
    let unsubscribeUserDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email && allowedEmails.includes(currentUser.email)) {
        await currentUser.getIdToken(true); 
        setUser(currentUser);
        setIsAdmin(true);

        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeUserDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const userData = snap.data();
            setProfileName(userData.username || userData.displayName || currentUser.displayName || "Хэрэглэгч");
          } else {
            setProfileName(currentUser.displayName || "Хэрэглэгч");
          }
        }, (err) => {
          console.error("Нэр уншихад алдаа гарлаа:", err);
        });

      } else {
        setUser(null);
        setIsAdmin(false);
        setProfileName("Хэрэглэгч");
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);


// 🚀 2. АЛХАМ: Датабаазын Realtime холболтуудыг асаах
  useEffect(() => {
    if (!isAdmin) return; 

    let unsubscribeUsers: () => void;
    let unsubscribeChapters: () => void;

    const fetchData = async () => {
      try {
        const mangaSnap = await getDocs(collection(db, "manga"));
        setMangas(mangaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const usersRef = collection(db, "users");
        unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
          setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
        }, (err) => {
          console.error(err);
        });

        const chaptersRef = collection(db, "chapters");
        unsubscribeChapters = onSnapshot(chaptersRef, (snapshot) => {
          setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
          console.error(err);
        });

      } catch (e) {
        console.error(e);
      }
    };

    fetchData();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeChapters) unsubscribeChapters();
    };
  }, [isAdmin]); 

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!emailInput.trim() || !passwordInput.trim()) {
      return setAuthError("И-мэйл болон Нууц үгийг гүйцэд бөглөнө үү!");
    }
    
    if (!allowedEmails.includes(emailInput.trim().toLowerCase())) {
      return setAuthError("Танд админ sample руу нэвтрэх эрх байхгүй!");
    }

    try {
      await signInWithEmailAndPassword(auth, emailInput.trim().toLowerCase(), passwordInput);
    } catch (error: any) {
      if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        setAuthError("Имэйл эсвэл нууц үг буруу байна. Дахин шалгана уу.");
      } else {
        setAuthError("Нэвтрэхэд алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setEmailInput("");
    setPasswordInput("");
  };

  // 🔔 БАТАЛГААЖУУЛАХ ПОПАПЫГ ИДЭВХЖҮҮЛЭХ ЭХЛЭЛ ЛОГИК
  const handleUpdateUserWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return alert("Засах хэрэглэгчийг сонгоно уу!");

    setConfirmMessage("10 Coin хасагдах болно. Та зөвшөөрч байна уу?");
    setPendingActionType("coins"); 
    setIsConfirmOpen(true);
  };

  // 🚀 БАТАЛГААЖУУЛАЛТЫН ДАРАА ХЭРЭГЛЭГЧИЙН КОЙН БОЛОН VIP ЭРХИЙГ ШИНЭЧЛЭХ ҮНДСЭН ФУНКЦ
  const executeUserWalletUpdate = async () => {
    if (!selectedUserForEdit) return;

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
      setIsConfirmOpen(false); 
      setPendingActionType(null);
    } catch (error) {
      console.error(error);
      alert("Гишүүний датаг шинэчлэхэд алдаа гарлаа.");
    }
  };

  // 🚀 МАНГАНЫ ПОСТЕР (КОВЕР): Утаснаас зураг уншихад нэрийг нь автоматаар сольж, хэмжээг жижигсгэн гацахгүй хуулдаг функц
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Утсан дээр шууд урьдчилж харуулна (Blob Preview)
    const localUrl = URL.createObjectURL(file);
    setMangaForm((prev) => ({ ...prev, cover_image: localUrl }));

    try {
      setImageUploading(true);
      const formData = new FormData();
      
      // 🚀 УТАСНЫ ХАМГААЛАЛТ: Зургийг утасны хөтөч дээр автоматаар шахаж хэмжээг нь маш жижиг болгоно
      const compressedBlob = await compressImage(file, 800, 1200, 0.75);
      
      // Файлын нэрийг цэвэр англи нэр рүү хөрвүүлнэ
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `cover-${Date.now()}.${fileExtension}`;
      const renamedFile = new File([compressedBlob], cleanFileName, { type: "image/jpeg" });
      
      formData.append("file", renamedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // R2 линкийг автоматаар инпут дээр гаргана
        setMangaForm((prev) => ({ ...prev, cover_image: data.url }));
      } else {
        alert("Зураг оруулахад алдаа гарлаа: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Утаснаас зураг ачаалахад алдаа гарлаа. Файлыг шахахад алдаа гарсан байж болзошгүй.");
    } finally {
      setImageUploading(false);
    }
  };

     // 🚀 БАННЕР ЗУРАГ: Утаснаас баннер зураг оруулахад нэрийг нь автоматаар сольж, хэмжээг жижигсгэн гацахгүй хуулдаг функц
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Зургийг сонгосон даруйд утсан дээр шууд урт хэмжээгээр харуулна
    const localUrl = URL.createObjectURL(file);
    setMangaForm((prev) => ({ ...prev, banner_image: localUrl }));

    try {
      setImageUploading(true);
      const formData = new FormData();
      
      // 🚀 УТАСНЫ ХАМГААЛАЛТ: Баннер зургийг хөтөч дээр автоматаар шахаж хэмжээг нь багасгана (урт зураг тул өргөнийг 12000000000000000000000-аар барина)
      const compressedBlob = await compressImage(file, 1200, 800, 0.75);
      
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `banner-${Date.now()}.${fileExtension}`;
      const renamedFile = new File([compressedBlob], cleanFileName, { type: "image/jpeg" });
      
      formData.append("file", renamedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // R2 линк бэлэн болмогц инпут талбарт автоматаар шинэчилнэ
        setMangaForm((prev) => ({ ...prev, banner_image: data.url }));
      } else {
        alert("Баннер зураг оруулахад алдаа гарлаа: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Баннер зураг ачаалахад алдаа гарлаа.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteUserFromDb = async (uid: string) => {
    if (!confirm("Энэ хэрэглэгчийн датаг өгөгдлийн сангаас бүрмөсөн устгах уу?")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      alert("Хэрэглэгчийн дата амжилттай устлаа!");
    } catch (error) {
      console.error(error);
      alert("Устгахад алдаа гарлаа.");
    }
  };

  // 🚀 МАНГА ҮҮСГЭХ ФОРМЫН СТЭЙТ
  const [mangaForm, setMangaForm] = useState<MangaForm>({
    title: "", description: "", cover_image: "", banner_image: "",
    genres: "", status: "ongoing", is_banner: false, is18: false, is_free: false
  });

  // 🚀 БҮЛГИЙН ОЛОН ЗУРАГ: Утаснаас олноор нь зэрэг сонгоход зураг бүрийг цувуулж автоматаар шахаж хуулах функц
  const handleChapterImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!chapterForm.manga_id) {
      alert("Зураг оруулахаас өмнө дээрх цэснээс Мангаа заавал сонгоно уу!");
      e.target.value = "";
      return;
    }

    try {
      setChapterImagesUploading(true);
      const totalFiles = files.length;
      
      const localUrls: string[] = [];
      for (let i = 0; i < totalFiles; i++) {
        localUrls.push(URL.createObjectURL(files[i]));
      }
      const currentImages = chapterForm.images ? chapterForm.images.split(",").map(u => u.trim()).filter(Boolean) : [];
      setChapterForm(prev => ({ ...prev, images: [...currentImages, ...localUrls].join(",") }));

      const uploadedUrls: string[] = [];
      for (let i = 0; i < totalFiles; i++) {
        setChapterUploadProgress(`Хуулж байна: ${i + 1} / ${totalFiles}`);
        
        const formData = new FormData();
        
        // 🚀 УТАСНЫ ХАМГААЛАЛТ: Манганы хуудас бүрийг утаснаас уншихдаа автоматаар шахаж хэмжээг нь жижиг болгоно
        const compressedBlob = await compressImage(files[i], 900, 1400, 0.75);
        
        const fileExtension = files[i].name.split('.').pop() || 'jpg';
        const cleanFileName = `page-${i}-${Date.now()}.${fileExtension}`;
        const renamedFile = new File([compressedBlob], cleanFileName, { type: "image/jpeg" });
        
        formData.append("file", renamedFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          uploadedUrls.push(data.url);
        } else {
          uploadedUrls.push(localUrls[i]); 
        }
      }

      const finalImages = [...currentImages, ...uploadedUrls].join(",");
      setChapterForm(prev => ({ ...prev, images: finalImages }));
      setChapterUploadProgress("Бүх зураг амжилттай хуулагдлаа! 🎉");
      e.target.value = ""; 
    } catch (err) {
      console.error(err);
      alert("Зураг хуулахад алдаа гарлаа.");
    } finally {
      setChapterImagesUploading(false);
    }
  };

  const moveImageOrder = (index: number, direction: "up" | "down") => {
    if (!chapterForm.images) return;
    const imagesArray = chapterForm.images.split(",").filter(Boolean);
    
    if (direction === "up" && index === 0) return; 
    if (direction === "down" && index === imagesArray.length - 1) return; 

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = imagesArray[index];
    imagesArray[index] = imagesArray[targetIndex];
    imagesArray[targetIndex] = temp;

    setChapterForm(prev => ({ ...prev, images: imagesArray.join(",") }));
  };

  const removeSpecificImage = (indexToRemove: number) => {
    if (!chapterForm.images) return;
    const imagesArray = chapterForm.images.split(",").filter(Boolean);
    const updatedArray = imagesArray.filter((_, index) => index !== indexToRemove);
    setChapterForm(prev => ({ ...prev, images: updatedArray.join(",") }));
  };

   // 🚀 БҮЛЭГ НЭМЭХ БОЛОН ЗАСАЖ ХАДГАЛАХ ЛОГИК
  const [chapterForm, setChapterForm] = useState<ChapterForm>({
    manga_id: "", chapter_number: 1, images: "", is_premium: false
  });

  // 🚀 ЗАСВАРЛАВ: Давхардсан функцийг нэгтгэж, буруу blob линк хадгалахаас бүрэн хамгаалсан ганц цэвэр функц болгов
  const handleAddManga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mangaForm.title.trim()) {
      return alert("Манганы Гарчгийг заавал бөглөнө үү!");
    }
    
    // 🚀 НЭМЭВ: Зураг цаанаа R2 руу хуулагдаж дуусахыг хүлээлгэдэг хамгаалалт
    if (imageUploading) {
      return alert("Зураг цаанаа Cloudflare R2 руу хуулагдаж байна. Түр хүлээгээд линк нь автоматаар инпут дээр гарч ирсний дараа хадгална уу!");
    }

    // 🚀 НЭМЭВ: Хэрэв линк нь blob: гэж эхэлсэн түр зуурын линк байвал өгөгдлийн санг харлуулахаас сэргийлж хадгалахгүй гацаана
    if (mangaForm.cover_image.startsWith("blob:") || mangaForm.banner_image.startsWith("blob:")) {
      return alert("Зураг R2 руу хуулагдаж дуусаагүй байна. 1 секунд хүлээгээд дахин оролдоно уу.");
    }

    try {
      const generatedId = generateMangaId(mangaForm.title);
      const genresArray = mangaForm.genres.split(",").map(g => g.trim()).filter(g => g !== "");
    
      const dataToSave = {
        title: mangaForm.title,
        description: mangaForm.description,
        cover_image: mangaForm.cover_image || "/placeholder-cover.jpg",
        banner_image: mangaForm.banner_image || "", 
        genres: genresArray,
        status: mangaForm.status, 
        is_banner: mangaForm.is_banner,
        is18: mangaForm.is18,
        is_free: mangaForm.is_free,
        views: isEditingManga ? mangas.find(m => m.id === oldMangaId)?.views || 0 : 0, 
        rating: 5.0,
        createdAt: isEditingManga ? mangas.find(m => m.id === oldMangaId)?.createdAt || new Date().toISOString() : new Date().toISOString()
      };

      if (isEditingManga && oldMangaId !== generatedId) {
        await deleteDoc(doc(db, "manga", oldMangaId));
      }

      await setDoc(doc(db, "manga", generatedId), dataToSave);
      alert("Манга амжилттай хадгалагдлаа!");

      const snap = await getDocs(collection(db, "manga"));
      setMangas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
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
      setMangas(mangas.filter(m => m.id !== id));
    } catch (error) {
      alert("Устгахад алдаа гарлаа.");
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.manga_id || !chapterForm.chapter_number) {
      return alert("Мангаа сонгож, Бүлгийн дугаарыг заавал оруулна үү!");
    }

    try {
      const imagesArray = chapterForm.images
        .split(",")
        .map(url => url.trim())
        .filter(url => url !== "");

      if (imagesArray.length === 0) {
        return alert("Бүлгийн зургуудын линкийг заавал оруулна үү!");
      }

      const dataToSave = {
        manga_id: chapterForm.manga_id,
        chapter_number: Number(chapterForm.chapter_number),
        images: imagesArray,
        is_premium: chapterForm.is_premium, 
        createdAt: isEditingChapter ? chapters.find(c => c.id === chapterForm.id)?.createdAt || new Date().toISOString() : new Date().toISOString()
      };

      if (isEditingChapter && chapterForm.id) {
        await setDoc(doc(db, "chapters", chapterForm.id), dataToSave);
        alert(`Бүлэг ${chapterForm.chapter_number} амжилттай засагдлаа!`);
      } else {
        await addDoc(collection(db, "chapters"), dataToSave);
        alert(`Бүлэг ${chapterForm.chapter_number} амжилттай нэмэгдлээ!`);
      }

      setChapterForm({
        manga_id: "",
        chapter_number: Number(chapterForm.chapter_number) + 1, 
        images: "", is_premium: false
      });
      setIsEditingChapter(false);
      setChapterUploadProgress("");
    } catch (error) {
      console.error(error);
      alert("Бүлэг хадгалахад алдаа гарлаа.");
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("Энэ бүлгийг устгахдаа итгэлтэй байна уу?")) return;
    try {
      await deleteDoc(doc(db, "chapters", id));
      alert("Бүлэг амжилттай устлаа!");
    } catch (error) {
      alert("Бүлэг устгахад алдаа гарлаа.");
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
              Clover Manga-ийн зөвшөөрөгдсөн админууд Gmail болон Нууц үгээрээ нэвтрэнэ үү.
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
              <p className="text-xs font-bold text-gray-200">{profileName}</p>
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
                    const nameMatch = (u.username || u.displayName || "Хэрэглэгч").toLowerCase().includes(userSearchQuery.toLowerCase());
                    const emailMatch = (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase());
                    return nameMatch || emailMatch;
                  })
                  .slice(0, viewAllUsers ? allUsers.length : 5)
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
                          <div className="flex items-center justify-end gap-2">
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
                            <button
                              type="button"
                              onClick={() => handleDeleteUserFromDb(u.uid)}
                              className="rounded-lg border border-[#232A35] bg-[#0B0F14] p-1.5 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition active:scale-95"
                              title="Өгөгдлийн сангаас устгах"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {allUsers.length > 5 && (
            <div className="flex justify-center pt-2 border-t border-[#232A35]/30">
              <button
                type="button"
                onClick={() => setViewAllUsers(!viewAllUsers)}
                className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400 hover:text-green-400 transition"
              >
                {viewAllUsers ? (
                  <>Хумих <ChevronUp size={14} /></>
                ) : (
                  <>Бүгдийг харах ({allUsers.length}) <ChevronDown size={14} /></>
                )}
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
              <div>
                <label className="block mb-1.5">Манганы нэр (Title):</label>
                <input
                  type="text"
                  value={mangaForm.title}
                  placeholder="Манганы гарчгийг оруулна уу"
                  onChange={(e) => setMangaForm({ ...mangaForm, title: e.target.value })}
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold"
                />
                {!isEditingManga && mangaForm.title && (
                  <p className="mt-1 text-[10px] text-gray-500 font-mono">Автомат ID: {generateMangaId(mangaForm.title)}</p>
                )}
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

              {/* 🚀 ЗАСВАРЛАВ: Ковер зураг сонгоход шууд урьдчилж хараад линкийг нь ил гаргадаг UI */}
              <div>
                <label className="block mb-1.5 text-green-400 font-bold">Манганы Ковер Зураг (Утаснаас сонгох):</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 justify-center w-full rounded-xl border border-dashed border-[#232A35] bg-[#0B0F14] px-4 py-3 text-gray-400 cursor-pointer hover:border-green-500/50 transition duration-150">
                    <ImageIcon size={16} />
                    <span>Зураг сонгох</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  
                  {/* Сонгосон зургийг доор нь том сүрлэгээр харуулна */}
                  {mangaForm.cover_image && (
                    <div className="relative w-28 aspect-[3/4] rounded-xl overflow-hidden bg-[#0B0F14] border border-[#232A35] shadow-md">
                      <img src={mangaForm.cover_image} alt="Preview" className="w-full h-full object-cover" />
                      {imageUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={16} className="animate-spin text-green-500" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 🚀 ЗАСВАРЛАВ: Зургийн линкийг шууд харуулж хянах боломжтой инпут талбар */}
              <div>
                <label className="block mb-1.5">Зургийн линк (URL - Автоматаар бөглөгдөнө):</label>
                <input
                  type="text"
                  value={mangaForm.cover_image}
                  onChange={(e) => setMangaForm({ ...mangaForm, cover_image: e.target.value })}
                  placeholder="https://link.jpg"
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-mono text-[10px]"
                />
              </div>

              {/* 🚀 ШИНЭ: Баннер болгох чеклист идэвхжсэн үед урт баннер зураг оруулах талбарууд нээгдэнэ */}
              {mangaForm.is_banner && (
                <div className="border border-green-500/20 bg-green-500/5 p-4 rounded-2xl space-y-4 animate-fadeIn">
                  <div>
                    <label className="block mb-1.5 text-green-400 font-bold">Манганы урт Баннер Зураг (Landscape - 16:9 хэмжээтэй):</label>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 justify-center w-full rounded-xl border border-dashed border-[#232A35] bg-[#0B0F14] px-4 py-3 text-gray-400 cursor-pointer hover:border-green-500/50 transition duration-150">
                        <ImageIcon size={16} />
                        <span>Баннер зураг сонгох</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerImageUpload}
                          className="hidden"
                        />
                      </label>
                      
                      {/* Сонгосон баннерыг урт хэмжээгээр урьдчилж харуулна */}
                      {mangaForm.banner_image && (
                        <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden bg-[#0B0F14] border border-[#232A35] shadow-md">
                          <img src={mangaForm.banner_image} alt="Banner Preview" className="w-full h-full object-cover" />
                          {imageUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 size={16} className="animate-spin text-green-500" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5">Баннер зургийн линк (URL - Автоматаар бөглөгдөнө):</label>
                    <input
                      type="text"
                      value={mangaForm.banner_image}
                      onChange={(e) => setMangaForm({ ...mangaForm, banner_image: e.target.value })}
                      placeholder="https://link-banner.jpg"
                      className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-mono text-[10px]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1.5">Тайлбар (Description):</label>
                <textarea
                  value={mangaForm.description}
                  rows={3}
                  onChange={(e) => setMangaForm({ ...mangaForm, description: e.target.value })}
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-medium"
                />
              </div>


                            <div>
                <label className="block mb-1.5">Төлөв (Status):</label>
                <select
                  value={mangaForm.status}
                  onChange={(e) => setMangaForm({ ...mangaForm, status: mangaForm.status || (e.target.value as any) })}
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold"
                >
                  <option value="ongoing">Үргэлжилж байгаа (Ongoing)</option>
                  <option value="completed">Дууссан (Completed)</option>
                  <option value="paused">Зогссон (Paused)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-white">
                  <input
                    type="checkbox"
                    checked={mangaForm.is_banner}
                    onChange={(e) => setMangaForm({ ...mangaForm, is_banner: e.target.checked })}
                    className="h-4 w-4 rounded border-[#232A35] bg-[#0B0F14] text-green-500 focus:ring-0 cursor-pointer"
                  />
                  Баннер болгох
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-red-400">
                  <input
                    type="checkbox"
                    checked={mangaForm.is18}
                    onChange={(e) => setMangaForm({ ...mangaForm, is18: e.target.checked })}
                    className="h-4 w-4 rounded border-[#232A35] bg-[#0B0F14] text-red-500 focus:ring-0 cursor-pointer"
                  />
                  +18 Насны хязгаартай
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-green-400">
                  <input
                    type="checkbox"
                    checked={mangaForm.is_free}
                    onChange={(e) => setMangaForm({ ...mangaForm, is_free: e.target.checked })}
                    className="h-4 w-4 rounded border-[#232A35] bg-[#0B0F14] text-green-500 focus:ring-0 cursor-pointer"
                  />
                  Үнэн үнэгүй унших (Free)
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
              <PlusCircle size={18} className="text-green-400" /> {isEditingChapter ? "Бүлэг засах" : "Шинэ бүлэг нэмэх"}
            </h2>
            <form onSubmit={handleAddChapter} className="space-y-4 text-xs font-semibold text-gray-400">
              <div>
                <label className="block mb-1.5 font-bold text-gray-300">Манга сонгох:</label>
                <select
                  value={chapterForm.manga_id}
                  onChange={(e) => setChapterForm({ ...chapterForm, manga_id: e.target.value })}
                  className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-3.5 py-2.5 text-white outline-none focus:border-green-500 font-bold cursor-pointer"
                >
                  <option value="">-- Мангаа сонгоно уу --</option>
                  {mangas.map((m) => (
                    <option key={`dropdown-manga-${m.id}`} value={m.id}>
                      {m.title} ({m.id})
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

              {/* Олноор зураг сонгох */}
              <div>
                <label className="block mb-1.5 text-green-400 font-bold">Манганы хуудсууд (Утаснаас олноор нь зэрэг сонгох):</label>
                <label className="flex items-center gap-2 justify-center w-full rounded-xl border border-dashed border-[#232A35] bg-[#0B0F14] px-4 py-4 text-gray-400 cursor-pointer hover:border-green-500/50 transition">
                  <ImageIcon size={18} />
                  <span>Манганы бүх хуудсыг зэрэг сонгох</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleChapterImagesUpload}
                    className="hidden"
                    disabled={chapterImagesUploading}
                  />
                </label>
                {chapterUploadProgress && (
                  <p className="mt-2 text-xs font-bold text-green-400 animate-pulse">{chapterUploadProgress}</p>
                )}
              </div>

                           {/* 🟩 Хуулсан зургуудыг утаснаас сонгонгуут R2-ыг хүлээхгүй шууд харуулна */}
              {chapterForm.images && (
                <div className="mt-4 border-t border-[#232A35]/60 pt-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Хуудасны дараалал ({chapterForm.images.split(",").filter(Boolean).length} хуудас)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
                    {chapterForm.images.split(",").filter(Boolean).map((url, index, arr) => (
                      <div key={`preview-image-${index}`} className="relative bg-[#0B0F14] rounded-xl border border-[#232A35] p-1.5 flex flex-col items-center shadow-md">
                        <div className="absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-black text-black">
                          {index + 1}
                        </div>
                        <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-[#141922]">
                          <img src={url} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center justify-between w-full mt-1.5 pt-1.5 border-t border-white/5 gap-1">
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveImageOrder(index, "up")}
                              disabled={index === 0}
                              className="p-1 rounded bg-[#141922] border border-[#232A35] text-gray-400 hover:text-white disabled:opacity-20 transition"
                            >
                              <ChevronUp size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImageOrder(index, "down")}
                              disabled={index === arr.length - 1}
                              className="p-1 rounded bg-[#141922] border border-[#232A35] text-gray-400 hover:text-white disabled:opacity-20 transition"
                            >
                              <ChevronDown size={10} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSpecificImage(index)}
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1.5">Зургийн линкүүд (Таслалаар заагласан URL - Автоматаар бөглөгдөнө):</label>
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
                className="w-full rounded-2xl bg-green-500 py-3 text-xs font-black text-black hover:bg-green-400 transition"
              >
                {isEditingChapter ? "Өөрчлөлтийг хадгалах" : "Бүлэг нэмэх"}
              </button>
            </form>
          </div>
        </div>

       {/* МАНГАНУУДЫН ЖАГСААЛТ ХАРАГДАХ ХЭСЭГ */}
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
                  <p className="text-[9px] text-green-400 font-bold mt-1">👁️ Хандалт: {m.views || 0}</p>
                </div>

                {/* БҮЛЭГ ЗАСАХ / УСТГАХ ХЭСЭГ */}
                <div className="mt-2 space-y-1">
                  <p className="text-[9px] text-gray-500 font-bold uppercase">Бүлгүүд засах:</p>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 border border-[#232A35]/30 p-1.5 rounded-lg bg-[#0B0F14]/50">
                    {chapters
                      .filter(c => c.manga_id === m.id)
                      .sort((a, b) => b.chapter_number - a.chapter_number) 
                      .map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-[#141922] p-1 rounded border border-[#232A35]/40 text-[10px]">
                          <span className="font-bold text-gray-300">Ch {c.chapter_number}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingChapter(true);
                                setChapterForm({
                                  id: c.id,
                                  manga_id: c.manga_id,
                                  chapter_number: c.chapter_number,
                                  images: Array.isArray(c.images) ? c.images.join(", ") : "",
                                  is_premium: c.is_premium || false
                                });
                                window.scrollTo({ top: 500, behavior: 'smooth' });
                              }}
                              className="text-blue-400 hover:text-blue-300 font-bold"
                            >
                              Засах
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteChapter(c.id)}
                              className="text-red-400 hover:text-red-300 font-bold"
                            >
                              Устгах
                            </button>
                          </div>
                        </div>
                      ))}
                    {chapters.filter(c => c.manga_id === m.id).length === 0 && (
                      <p className="text-[9px] text-gray-600 italic text-center py-1">Бүлэг байхгүй</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#232A35]/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingManga(true);
                      setOldMangaId(m.id);
                      // 🚀 ЗАСВАРЛАВ: Манга засах үед banner_image-ийг өгөгдлийн сангаас уншиж стэйтэд холбоно
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
                    <Edit3 size={12} /> : Манга засах
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

                  <div className="flex items-center gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setPendingActionType(null);
                }}
                className="flex-1 rounded-xl border border-[#232A35] bg-[#0B0F14] py-2.5 font-bold text-gray-400 hover:text-white transition active:scale-95"
              >
                Цуцлах
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingActionType === "coins") {
                    executeUserWalletUpdate();
                  }
                }}
                className="flex-1 rounded-xl bg-green-500 py-2.5 font-black text-black hover:bg-green-400 transition active:scale-95"
              >
                Зөвшөөрөх
              </button>
          </div>
     
                       <div className="flex items-center gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setPendingActionType(null);
                }}
                className="flex-1 rounded-xl border border-[#232A35] bg-[#0B0F14] py-2.5 font-bold text-gray-400 hover:text-white transition active:scale-95"
              >
                Цуцлах
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingActionType === "coins") {
                    executeUserWalletUpdate();
                  }
                }}
                className="flex-1 rounded-xl bg-green-500 py-2.5 font-black text-black hover:bg-green-400 transition active:scale-95"
              >
                Зөвшөөрөх
              </button>
            </div>
            </main>
  )}