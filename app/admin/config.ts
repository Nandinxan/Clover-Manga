import { buildCollection } from "@firecms/core";

// 🚀 МАНГА ЦУГЛУУЛГЫН ҮНЭГҮЙ ТОХИРГОО
export const mangaCollection = buildCollection({
    id: "manga",
    name: "Манга жагсаалт",
    path: "manga",
    properties: {
        title: { name: "Гарчиг", dataType: "string" },
        author: { name: "Зохиолч", dataType: "string" },
        description: { name: "Тайлбар", dataType: "string", markdown: true },
        cover_image: { name: "Кавер зураг (URL)", dataType: "string" },
        genres: { name: "Төрлүүд", dataType: "array", of: { dataType: "string" } },
        views: { name: "Үзэлт", dataType: "number" },
        rating: { name: "Үнэлгээ", dataType: "number" },
        placement: {
            name: "Нүүр хуудасны харагдац",
            dataType: "string",
            enumValues: {
                trending: "Эрэлттэй",
                recommended: "Санал болгох",
                none: "Энгийн хуудас дээр"
            }
        },
        status: {
            name: "Төлөв",
            dataType: "string",
            enumValues: {
                ongoing: "Үргэлжилж буй",
                completed: "Дууссан",
                free: "Үнэгүй унших" // 👈 Сонгоход Нүүр хуудасны Үнэгүй хэсэгт шууд гарна
            }
        },
        is_banner: { name: "Нүүр хуудасны том банер болгох", dataType: "boolean" },
        is18: { name: "+18 Насны хязгаарлалт", dataType: "boolean" } // 👈 Асаахад +18 попап ажиллана
    }
});
// 🚀 БҮЛЭГ ЦУГЛУУЛГЫН ҮНЭГҮЙ ТОХИРГОО
export const chaptersCollection = buildCollection({
    id: "chapters",
    name: "Бүлэг (Chapters)",
    path: "chapters",
    properties: {
        manga_id: { name: "Манганы ID (URL хаяг)", dataType: "string" },
        chapter_number: { name: "Бүлгийн дугаар", dataType: "number" },
        title: { name: "Бүлгийн гарчиг", dataType: "string" },
        images: { name: "Бүлгийн зургууд (Array жагсаалт)", dataType: "array", of: { dataType: "string" } },
        is_premium: { name: "Premium бүлэг (Цоожтой болгох)", dataType: "boolean" } // 👈 Асаахад 10 койн нэхэж цоожилно
    }
});
