import logo from './images/playstorelogo.png';

export default function HabaHabaDownloadPage() {
  const apkLink = "https://drive.google.com/uc?export=download&id=1BwQj14hzEKzvNQrvltAQxz-k_dAJ_3FC";

  const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);

  return (
    <div dir="rtl" className="min-h-screen w-full bg-[#FFFFFF] text-[#1A1A1A]">
      <div className="mx-auto flex min-h-screen max-w-full flex-col bg-[#f9f8f3]">

        {/* ===== HEADER ===== */}
        <header className="relative overflow-hidden rounded-b-[30px] bg-[#93522B] px-6 pb-8 pt-7 shadow-lg">
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-[#C47A1C]/20" />

          <div className="relative z-10 text-right">
            <div className="mb-5 flex flex-row-reverse items-center justify-between gap-3">

              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                العيون
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white bg-white text-xl shadow">
                  <img src={logo} alt="logo" className="w-12 h-12 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/75">
                    التطبيق الرسمي
                  </p>
                  <h1 className="text-3xl font-bold text-white">HabaHaba</h1>
                </div>
              </div>
            </div>

            {/* PROMO BADGE */}
            <div className="mb-4 rounded-2xl bg-[#C47A1C] px-5 py-4 text-white shadow-lg">
              <p className="text-base font-bold">🎉 عروض العيد</p>
              <p className="text-sm mt-1">كود خاص: <span className="font-extrabold">IKRAM Aid Mubarak</span></p>
              <p className="text-sm">خصم 10% على الطلب 🎁</p>
              <p className="text-sm mt-2 border-t border-white/30 pt-2">
                🔥 جميع المنتجات في المنيو فيها خصم إضافي 7%
              </p>
            </div>

            <div className="mb-4 flex items-center justify-end gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-base text-white/95">
              <span>العيون، الصحراء المغربية</span>
              <span>📍</span>
            </div>

            <h2 className="text-4xl font-extrabold leading-tight text-white">
              حمّل التطبيق واطلب وجباتك المفضلة بسهولة.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/90">
              تطبيق HabaHaba كيخليك تطلب بسرعة، تكتاشف العروض، وتوصل طلبك بسهولة من هاتفك.
            </p>
          </div>
        </header>

        <main className="flex-1 px-5 pb-10 pt-6 text-right">

          {/* ===== DOWNLOAD ===== */}
          <section className="rounded-[24px] border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="rounded-full bg-[#f9f8f3] px-4 py-2 text-sm font-bold text-[#93522B]">
                أندرويد
              </div>
              <div>
                <p className="text-base font-semibold text-[#1A1A1A]">تحميل تطبيق HabaHaba</p>
                <p className="mt-1 text-sm text-[#5E5E5E]">تحميل مباشر وآمن لهواتف أندرويد</p>
              </div>
            </div>

            <a
              href={isIOS ? undefined : apkLink}
              onClick={(e) => {
                if (isIOS) e.preventDefault();
              }}
              className={`block w-full rounded-2xl px-5 py-5 text-center text-lg font-bold text-white shadow-md transition ${
                isIOS ? "cursor-not-allowed bg-[#8C8C8C]" : "bg-[#93522B] hover:bg-[#7d4524]"
              }`}
            >
              {isAndroid ? "تحميل التطبيق الآن" : isIOS ? "قريباً على App Store" : "تحميل ملف APK"}
            </a>

            {/* STORES COMING SOON */}
            <div className="mt-5 rounded-2xl bg-[#F6F5F2] p-4 text-center border border-[#E5E5E5]">
              <p className="text-base font-bold text-[#93522B]">🚀 قريباً</p>
              <p className="text-sm text-[#5E5E5E] mt-1">
                التطبيق غادي يكون متوفر قريباً على App Store و Play Store
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {isAndroid && (
                <div className="rounded-2xl border border-[#E5E5E5] bg-[#F6F5F2] p-4 text-base leading-8 text-[#07460a] text-right">
                  ✅ أنت تستعمل هاتف أندرويد. اضغط على الزر، حمّل الملف، ثم افتحه وثبّت التطبيق.
                </div>
              )}

              {isIOS && (
                <div className="rounded-2xl border border-[#E5E5E5] bg-[#F6F5F2] p-4 text-base leading-8 text-[#C47A1C] text-right">
                  ⚠️ أجهزة iPhone لا تدعم تثبيت ملفات APK. استعمل الموقع أو انتظر توفر التطبيق في App Store.
                </div>
              )}
            </div>
          </section>

          {/* ===== FEATURES ===== */}
          <section className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-[22px] bg-[#FFFFFF] p-5 shadow-sm ring-1 ring-black/5 text-right">
              <div className="mb-3 mr-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9f8f3] text-2xl">
                🎁
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A]">عروض مميزة</h3>
              <p className="mt-2 text-sm leading-7 text-[#5E5E5E]">
                اكتشف التخفيضات والعروض الخاصة مباشرة داخل التطبيق.
              </p>
            </div>

            <div className="rounded-[22px] bg-[#FFFFFF] p-5 shadow-sm ring-1 ring-black/5 text-right">
              <div className="mb-3 mr-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9f8f3] text-2xl">
                🍔
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A]">طلب سريع</h3>
              <p className="mt-2 text-sm leading-7 text-[#5E5E5E]">
                تصفح الوجبات، اختر ما يناسبك، وأكمل الطلب في ثوانٍ.
              </p>
            </div>
          </section>

          {/* ===== INSTALL STEPS ===== */}
          <section className="mt-6 rounded-[24px] bg-[#FFFFFF] p-5 shadow-sm ring-1 ring-black/5 text-right">
            <div className="mb-4 flex items-center justify-end gap-2">
              <h3 className="text-base font-bold text-[#1A1A1A]">طريقة التثبيت</h3>
              <div className="h-2 w-2 rounded-full bg-[#93522B]" />
            </div>

            <div className="space-y-4">
              {[
                "اضغط على زر التحميل الموجود في الأعلى",
                "بعد اكتمال التحميل افتح ملف التطبيق",
                "إذا طلب منك الهاتف السماح بالتثبيت، وافق على ذلك",
                "ثبّت التطبيق وابدأ الطلب بسهولة",
              ].map((step, index) => (
                <div key={step} className="flex flex-row-reverse items-start gap-3 rounded-2xl bg-[#F6F5F2] p-4 text-right">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#93522B] text-base font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-8 text-[#5E5E5E]">{step}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== HELP ===== */}
          <section className="mt-6 rounded-[24px] bg-[#0F0F0F] p-5 text-right text-[#F5F5F5] shadow-sm">
            <p className="text-base font-semibold">كتحتاج المساعدة؟</p>
            <p className="mt-2 text-sm leading-8 text-[#F5F5F5]/80">
              تواصل مع مطعم HabaHaba وغادي نعاونوك خطوة بخطوة فالتثبيت.
            </p>
          </section>

        </main>
      </div>
    </div>
  );
}
