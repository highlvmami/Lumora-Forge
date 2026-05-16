import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt boş olamaz" }, { status: 400 });
    }

    // 1. Prompt'u temizle: Satır atlamalarını kaldır, sadece harf ve boşlukları bırak
    let cleanPrompt = prompt
      .replace(/[\n\r]/g, " ")
      .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ ]/g, "")
      .trim();

    // 2. Güvenli URL formatına dönüştür (Türkçe karakterleri ve boşlukları kodlar)
    const encodedPrompt = encodeURIComponent(cleanPrompt);

    // Pollinations AI - Güvenli ve güncel resim üretim linki
    const modelUrl = `https://image.pollinations.ai/p/${encodedPrompt}?width=1024&height=576&nologo=true&private=true`;

    console.log("İstek atılan URL:", modelUrl);

    const response = await fetch(modelUrl, {
      method: "GET",
      headers: {
        "Accept": "image/ai, image/png, image/jpeg, */*"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sağlayıcı Detay Hatası:", response.status, errorText);
      return NextResponse.json(
        { error: `Görsel motoru yanıt vermedi (Kod: ${response.status})` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    return NextResponse.json({ image: `data:image/png;base64,${base64Image}` });

  } catch (e) {
    console.error("Görsel Üretim Hatası:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}