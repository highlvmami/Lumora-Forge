import { NextResponse } from "next/server";

// Türkçe karakter temizleme haritası
const trMap = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I',
  'i': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S',
  'ü': 'u', 'Ü': 'U'
};

const cleanText = (text) => {
  if (!text) return "";
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

    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;

    // 1. Groq kullanarak sahneyi silah barındırmayan temiz bir İngilizce prompta çeviriyoruz
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: `You are a photo generation prompt assistant. Convert the given Turkish scene description into a highly detailed, cinematic English image prompt for Flux model.
            CRITICAL RULES:
            - Absolutely NO weapons, NO guns, NO firearms, NO violence, and NO fighting elements allowed.
            - Ensure the scene is completely peaceful, harmonious, or professional depending on the context.
            - Focus on environmental storytelling, characters, and beautiful lighting.
            - Respond ONLY with the final English prompt. No extra text or explanations.`
          },
          {
            role: "user",
            content: `Turkish Scene: "${prompt}"`
          }
        ]
      })
    });

    const groqData = await groqResponse.json();
    let englishPrompt = groqData.choices[0]?.message?.content || "beautiful cinematic scenery, detailed background, 8k resolution";
    
    // Güvenliği iki katına çıkarmak için negatif yönlendirmeleri prompt sonuna ekliyoruz
    englishPrompt = `${cleanText(englishPrompt)}, ultra detailed, photorealistic, peaceful composition, 8k resolution, completely free of weapons or firearms`;

    const encodedPrompt = encodeURIComponent(englishPrompt);
    const randomSeed = Math.floor(Math.random() * 999999);
    
    // 2. Pollinations AI ile görseli üretiyoruz
    const modelUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&model=flux&seed=${randomSeed}&nologo=true&enhance=false`;

    const imageResponse = await fetch(modelUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Lumora-Forge-App"
      }
    });

    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Görsel motoru yanıt vermedi" }, { status: imageResponse.status || 500 });
    }

    const buffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    return NextResponse.json({ image: `data:image/jpeg;base64,${base64Image}` });

  } catch (e) {
    console.error("Görsel Üretim Hatası:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}