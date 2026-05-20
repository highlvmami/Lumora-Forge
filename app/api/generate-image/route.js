import { NextResponse } from "next/server";

const trMap = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I',
  'i': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S',
  'ü': 'u', 'Ü': 'U'
};

const cleanTextForAI = (text) => {
  return text
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (m) => trMap[m])
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt boş olamaz" }, { status: 400 });
    }

    let cleanPrompt = cleanTextForAI(prompt);
    const finalPrompt = `${cleanPrompt}, cinematic photography, highly detailed, 8k resolution`;
    const encodedPrompt = encodeURIComponent(finalPrompt);

    let response;
    let isHuggingFaceSuccess = false;

    // 1. SEÇENEK: HUGGING FACE API
    try {
      console.log("Hugging Face görsel üretimi deniyor...");
      response = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          headers: {
            Authorization: `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: finalPrompt }),
        }
      );

      // Hugging Face bazen 200 dönse bile model yükleniyor hatası (JSON) verebilir.
      // Gerçek bir resim gelip gelmediğini kontrol etmek için content-type'a bakıyoruz.
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("image")) {
        isHuggingFaceSuccess = true;
        console.log("Görsel Hugging Face ile başarıyla üretildi!");
      } else {
        console.warn("Hugging Face resmi çizemedi veya model uykuda. Yedek plana geçiliyor...");
      }
    } catch (hfError) {
      console.error("HF bağlantı hatası, yedek plana geçiliyor:", hfError);
    }

    // 2. SEÇENEK: YEDEK PLAN (Pollinations AI - URL üzerinden backend'de indirip base64 yapıyoruz)
    if (!isHuggingFaceSuccess) {
      console.log("Yedek plan: Pollinations AI üzerinden resim indiriliyor...");
      const randomSeed = Math.floor(Math.random() * 999999);
      const modelUrl = `https://image.pollinations.ai/p/${encodedPrompt}?width=1024&height=576&model=flux&seed=${randomSeed}&nologo=true&private=true`;
      
      response = await fetch(modelUrl, {
        method: "GET",
        headers: {
          "Accept": "image/png, image/jpeg, */*"
        }
      });
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: `Görsel motorları yanıt vermedi` },
        { status: response?.status || 500 }
      );
    }

    // Gelen ham resmi sorunsuz bir şekilde Buffer'a alıp base64'e çeviriyoruz
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    return NextResponse.json({ image: `data:image/png;base64,${base64Image}` });

  } catch (e) {
    console.error("Görsel Üretim Genel Hatası:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}