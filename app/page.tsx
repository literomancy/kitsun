"use client";

import { useEffect, useState } from "react";
import type { TelegramUser } from "../lib/telegram";
import { defaultProducts, type CatalogProduct } from "../lib/catalog-data";

type Tab = "Главная" | "Каталог" | "Профиль";
type CatalogCategory = "all" | "clothing" | "cars" | "digital";
type Product = CatalogProduct;
type CartItem = Product & { unitPrice: number };

const availabilityLabels = { in_stock: "В наличии", out_of_stock: "Нет в наличии", preorder: "Под заказ" } as const;
const productMeta = (product: Product) => `${product.type.replace(/\s·\s(В наличии|Нет в наличии|Предзаказ|Под заказ)$/u, "")} · ${availabilityLabels[product.availability] || availabilityLabels.in_stock}`;

const categories = [
  ["01", "ОДЕЖДА", "clothing"],
  ["02", "АВТО", "cars"],
  ["03", "ЦИФРОВЫЕ\nТОВАРЫ", "digital"],
] as const;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Главная");
  const [purchases] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [insideTelegram, setInsideTelegram] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<CatalogCategory>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products").then((response) => response.ok ? response.json() : Promise.reject()).then((data: { products: Product[] }) => setProducts(data.products)).catch(() => setProducts(defaultProducts)).finally(() => setProductsLoading(false));
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const navigate = (nextTab: Tab) => {
    setSelected(null);
    setFavoritesOpen(false);
    setCustomOrderOpen(false);
    setAboutOpen(false);
    if (nextTab === "Каталог") setCatalogCategory("all");
    setTab(nextTab);
  };

  const hasInnerScreen = Boolean(selected || favoritesOpen || customOrderOpen || aboutOpen);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    import("@twa-dev/sdk").then(({ default: WebApp }) => {
      if (!active) return;
      const isTelegram = Boolean(WebApp.initData);
      setInsideTelegram(isTelegram);
      if (!isTelegram) return;

      document.documentElement.classList.add("telegram-app");
      WebApp.setHeaderColor("#ffffff");
      WebApp.setBackgroundColor("#ffffff");
      if ("setBottomBarColor" in WebApp && typeof WebApp.setBottomBarColor === "function") {
        WebApp.setBottomBarColor("#ffffff");
      }

      const goBack = () => {
        if (aboutOpen) setAboutOpen(false);
        else if (favoritesOpen) setFavoritesOpen(false);
        else if (customOrderOpen) setCustomOrderOpen(false);
        else if (selected) setSelected(null);
      };

      WebApp.ready();
      if (!telegramUser) fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initData: WebApp.initData }),
        credentials: "same-origin",
      })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data: { user: TelegramUser }) => { if (active) setTelegramUser(data.user); })
        .catch(() => { if (active) setTelegramUser(null); });
      WebApp.BackButton.offClick(goBack);
      WebApp.BackButton.onClick(goBack);
      if (hasInnerScreen) WebApp.BackButton.show();
      else WebApp.BackButton.hide();
      cleanup = () => {
        WebApp.BackButton.offClick(goBack);
        WebApp.BackButton.hide();
      };
    }).catch(() => setInsideTelegram(false));

    return () => {
      active = false;
      cleanup?.();
    };
  }, [aboutOpen, customOrderOpen, favoritesOpen, hasInnerScreen, selected, telegramUser]);

  useEffect(() => {
    let active = true;
    fetch("/api/telegram/auth", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { user: TelegramUser }) => { if (active) setTelegramUser(data.user); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector<HTMLElement>(".sheet")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [aboutOpen, customOrderOpen, favoritesOpen, selected, tab]);

  if (selected) {
    return <main className={`shell standalone-shell ${insideTelegram ? "telegram-native" : ""}`}><ProductSheet product={products.find((product) => product.id === selected)!} onClose={() => setSelected(null)} onContact={() => window.open("https://t.me/Kitsunshop", "_blank", "noopener,noreferrer")} /><BottomNav tab="Каталог" onSelect={navigate} />{notice && <div className="toast" role="status">{notice}</div>}</main>;
  }

  return (
    <main className={`shell ${insideTelegram ? "telegram-native" : ""}`}>
      {tab === "Главная" && <header className="header">
        <a className="wordmark" href="#top" aria-label="KITSUN NO STORE, главная">KITSUN NO STORE</a>
      </header>}

      {tab === "Главная" && <>
        <section className="hero" id="top">
          <p className="eyebrow">KITSUN / DIGITAL CATALOG</p>
          <h1><span>ГОТОВО</span><span>К <em>ТИРАЖУ.</em></span></h1>
          <p className="hero-copy">Принты, исходники и дизайн-проекты для производства и маркетплейсов.</p>
          <button className="text-link" onClick={() => setAboutOpen(true)}>О НАС <span>↘</span></button>
        </section>

        <section className="category-list" aria-label="Разделы магазина">
          {categories.map(([number, title, category]) => (
            <button key={number} className="category" onClick={() => { setCatalogCategory(category); setTab("Каталог"); }}>
              <small>{number}</small>
              <strong>{title.split("\n").map((part) => <span key={part}>{part}</span>)}</strong>
              <b>↗</b>
            </button>
          ))}
        </section>

        <section className="section" id="catalog">
          <div className="section-head"><p>НОВОЕ В КАТАЛОГЕ</p><button onClick={() => { setCatalogCategory("all"); setTab("Каталог"); }}>ВСЁ →</button></div>
          <div className="product-grid">
            {productsLoading ? <ProductSkeletons /> : products.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelected} favorite={favorites.includes(product.id)} onToggleFavorite={toggleFavorite} />)}
          </div>
        </section>

        <section className="custom-order">
          <p className="eyebrow">НУЖЕН СВОЙ ПРОЕКТ?</p>
          <h2>Индивидуальный<br />заказ</h2>
          <p>От концепта до производства.</p>
          <button onClick={() => window.open("https://t.me/Kitsunshop", "_blank", "noopener,noreferrer")}>ОБСУДИТЬ</button>
        </section>
      </>}

      {tab === "Каталог" && <Catalog products={products} loading={productsLoading} category={catalogCategory} onCategory={setCatalogCategory} onOpen={setSelected} favorites={favorites} onToggleFavorite={toggleFavorite} />}
      {tab === "Профиль" && <Profile purchaseCount={purchases.length} favoriteCount={favorites.length} telegramUser={telegramUser} onAbout={() => setAboutOpen(true)} onOpenFavorites={() => setFavoritesOpen(true)} onSupport={() => window.open("https://t.me/Kitsunshop", "_blank", "noopener,noreferrer")} />}

      <BottomNav tab={tab} onSelect={navigate} />

      {favoritesOpen && <FavoritesSheet items={products.filter((product) => favorites.includes(product.id))} onClose={() => setFavoritesOpen(false)} onRemove={toggleFavorite} onOpen={(id) => { setFavoritesOpen(false); setSelected(id); }} />}
      {customOrderOpen && <CustomOrderSheet onClose={() => setCustomOrderOpen(false)} onContact={() => setNotice("Переходим в Telegram-чат с менеджером")} />}
      {aboutOpen && <AboutPage onClose={() => setAboutOpen(false)} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}

function BottomNav({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="Основная навигация">{(["Главная", "Каталог", "Профиль"] as Tab[]).map((item, index) => <button key={item} className={tab === item ? "active" : ""} onClick={() => onSelect(item)}><span><Icon name={(["home", "grid", "user"] as const)[index]} /></span>{item}</button>)}</nav>;
}

function ProductCard({ product, onOpen, favorite, onToggleFavorite }: { product: Product; onOpen: (id: string) => void; favorite: boolean; onToggleFavorite: (id: string) => void }) {
  const cover = product.gallery.find((image) => image.src)?.src;
  return <article className="product">
    <button className="product-open" onClick={() => onOpen(product.id)}><div className={`product-art ${product.color} ${cover ? "with-image" : "empty-art"}`}>{cover ? <img src={cover} alt={product.title} /> : product.mark && <b>{product.mark}</b>}<i>↗</i></div><strong>{product.title}</strong><small>{productMeta(product)}</small><span>{product.price}</span></button>
    <button className={`favorite-button ${favorite ? "saved" : ""}`} aria-label={favorite ? `Убрать ${product.title} из избранного` : `Добавить ${product.title} в избранное`} onClick={() => onToggleFavorite(product.id)}><Icon name="heart" /></button>
  </article>;
}

function ProductSkeletons() { return <>{[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item}><i /><b /><span /></div>)}</>; }

function Catalog({ products, loading, category, onCategory, onOpen, favorites, onToggleFavorite }: { products: Product[]; loading: boolean; category: CatalogCategory; onCategory: (category: CatalogCategory) => void; onOpen: (id: string) => void; favorites: string[]; onToggleFavorite: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const categoryOptions: Array<{ key: CatalogCategory; label: string }> = [
    { key: "all", label: "Все" },
    { key: "clothing", label: "Одежда" },
    { key: "cars", label: "Авто" },
    { key: "digital", label: "Цифровые товары" },
  ];
  const visible = products.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const matchesQuery = `${product.title} ${product.type}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return <section className="catalog-page"><h1>КАТАЛОГ</h1><label className="search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по каталогу" /></label><div className="chips">{categoryOptions.map((item) => <button key={item.key} className={category === item.key ? "chosen" : ""} onClick={() => onCategory(item.key)}>{item.label}</button>)}</div>{loading ? <div className="product-grid"><ProductSkeletons /></div> : visible.length > 0 ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} onOpen={onOpen} favorite={favorites.includes(product.id)} onToggleFavorite={onToggleFavorite} />)}</div> : <div className="catalog-empty"><span>0</span><strong>НИЧЕГО НЕ НАЙДЕНО</strong><p>Измени поисковый запрос.</p><button onClick={() => setQuery("")}>СБРОСИТЬ</button></div>}</section>;
}

function EmptyState({ icon, title, copy }: { icon: string; title: string; copy: string }) { return <section className="empty"><div>{icon}</div><h1>{title}</h1><p>{copy}</p></section>; }
function Profile({ favoriteCount, telegramUser, onAbout, onOpenFavorites, onSupport }: { purchaseCount: number; favoriteCount: number; telegramUser: TelegramUser | null; onAbout: () => void; onOpenFavorites: () => void; onSupport: () => void }) { const displayName = telegramUser ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") : "ГОСТЬ"; const initial = displayName.charAt(0).toUpperCase(); return <section className="profile"><p className="eyebrow">АККАУНТ</p><div className="avatar">{initial}</div><h1>{displayName}</h1>{telegramUser ? <p>{telegramUser.username ? `@${telegramUser.username}` : `Telegram ID ${telegramUser.id}`}</p> : <p>Откройте приложение через Telegram, чтобы синхронизировать покупки и избранное.</p>}<div className="profile-stats"><button onClick={onOpenFavorites}><strong>{favoriteCount}</strong><span>ИЗБРАННОЕ →</span></button></div><div className="profile-links"><button onClick={onAbout}>О нас <span>→</span></button><button onClick={onSupport}>Поддержка <span>→</span></button><button onClick={() => window.open("https://t.me/kitsunworldwide", "_blank", "noopener,noreferrer")}>Сообщество <span>→</span></button></div></section>; }

function Purchases({ items, onBrowse }: { items: CartItem[]; onBrowse: () => void }) {
  const [downloaded, setDownloaded] = useState<string[]>([]);
  if (items.length === 0) return <section className="purchases-page"><p className="eyebrow">МОИ МАТЕРИАЛЫ</p><EmptyState icon="↓" title="ПОКА НЕТ ПОКУПОК" copy="После оплаты материалы появятся здесь — с инструкциями и обновлениями." /><button className="browse-button" onClick={onBrowse}>ОТКРЫТЬ КАТАЛОГ →</button></section>;
  return <section className="purchases-page"><p className="eyebrow">МОИ МАТЕРИАЛЫ</p><div className="purchases-head"><h1>ПОКУПКИ</h1><span>{items.length.toString().padStart(2, "0")}</span></div><p className="purchases-intro">Купленные файлы, инструкции и доступные обновления.</p><div className="purchase-list">{items.map((item, index) => { const isDownloaded = downloaded.includes(item.id); return <article className="purchase-card" key={item.id}><div className={`purchase-cover ${item.color}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{item.mark}</b></div><div className="purchase-info"><p className="eyebrow">ЗАКАЗ #K{2401 + index}</p><h2>{item.title}</h2><span>{item.type}</span><div className="purchase-meta"><div><small>ФОРМАТЫ</small><b>ZIP · PNG</b></div><div><small>ВЕРСИЯ</small><b>1.0</b></div></div><div className="version-note"><i /> АКТУАЛЬНАЯ ВЕРСИЯ</div><button onClick={() => setDownloaded((current) => current.includes(item.id) ? current : [...current, item.id])}>{isDownloaded ? "СКАЧАНО ✓" : "СКАЧАТЬ ФАЙЛЫ ↓"}</button></div></article>; })}</div></section>;
}

function Icon({ name }: { name: "search" | "bag" | "home" | "grid" | "download" | "user" | "heart" }) {
  const paths = {
    search: <><circle cx="10" cy="10" r="5.5"/><path d="m14 14 4 4"/></>,
    bag: <><path d="M5.5 8.5h13l-1 10h-11z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></>,
    home: <><path d="m4 10 8-6 8 6"/><path d="M6.5 9v10h11V9"/></>,
    grid: <><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></>,
    download: <><path d="M12 3v12"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"/></>,
    heart: <path d="M20.5 9c0 5-8.5 10-8.5 10S3.5 14 3.5 9A4.5 4.5 0 0 1 12 6.9 4.5 4.5 0 0 1 20.5 9Z" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function AboutPage({ onClose }: { onClose: () => void }) {
  const partners = ["Porsche Ride", "VCNC", "RACEBRO", "TEAM GARIS"];
  return <div className="sheet-backdrop" role="region" aria-label="О компании"><article className="sheet info-sheet about-page"><div className="sheet-title"><p className="eyebrow">KITSUN / О КОМПАНИИ</p><button className="sheet-close" onClick={onClose} aria-label="Назад">×</button></div><h2>МАТЕРИАЛЫ<br />ДЛЯ ЗАПУСКА</h2><p className="about-lead">KITSUN помогает небольшим брендам, продавцам и производствам быстрее переходить от идеи к готовому продукту.</p><div className="about-visual"><strong>KITSUN</strong><small>DESIGN → PRODUCTION</small></div><section className="about-copy"><p className="eyebrow">ЧТО МЫ ДЕЛАЕМ</p><p>Создаём готовые принты, исходники и производственные материалы. Иногда выпускаем аксессуары и небольшие тиражи собственного мерча.</p><p>Все продукты собраны так, чтобы их можно было быстро передать дизайнеру, типографии или производству и начать работу без лишних этапов.</p></section><div className="about-facts"><div><span>01</span><b>Готовые материалы</b><small>Для быстрого запуска продукта</small></div><div><span>02</span><b>Понятные файлы</b><small>Подготовленные к реальной работе</small></div><div><span>03</span><b>Связь напрямую</b><small>Без сложных форм и брифов</small></div></div><section className="partners"><p className="eyebrow">ПАРТНЁРЫ</p><div>{partners.map((partner) => <span key={partner}>{partner}</span>)}</div></section><button className="manager-button" onClick={() => window.open("https://t.me/Kitsunshop", "_blank", "noopener,noreferrer")}>СВЯЗАТЬСЯ ↗</button></article></div>;
}

function FavoritesSheet({ items, onClose, onRemove, onOpen }: { items: Product[]; onClose: () => void; onRemove: (id: string) => void; onOpen: (id: string) => void }) {
  return <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Избранное" onClick={onClose}><article className="sheet favorites-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-title"><p className="eyebrow">СОХРАНЕНО / {items.length}</p><button className="sheet-close" onClick={onClose} aria-label="Закрыть">×</button></div><h2>ИЗБРАННОЕ</h2>{items.length === 0 ? <div className="cart-empty"><span>0</span><strong>ПОКА ПУСТО</strong><p>Сохраняй материалы из каталога, чтобы вернуться к ним позже.</p><button onClick={onClose}>В КАТАЛОГ</button></div> : <div className="favorite-list">{items.map((item) => <article key={item.id}><button className={`favorite-preview ${item.color}`} onClick={() => onOpen(item.id)}><span>{item.id}</span><b>{item.mark}</b></button><div><button className="favorite-title" onClick={() => onOpen(item.id)}>{item.title}</button><span>{item.type}</span><strong>{item.price}</strong></div><button className="favorite-remove" onClick={() => onRemove(item.id)} aria-label={`Убрать ${item.title} из избранного`}>×</button></article>)}</div>}</article></div>;
}

function CustomOrderSheet({ onClose, onContact }: { onClose: () => void; onContact: () => void }) {
  return <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Индивидуальный заказ" onClick={onClose}><article className="sheet info-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-title"><p className="eyebrow">KITSUN / CUSTOM</p><button className="sheet-close" onClick={onClose} aria-label="Закрыть">×</button></div><h2>СВОЙ ПРОЕКТ</h2><p className="info-lead">Разработаем графику под конкретный товар, производство и площадку.</p><div className="lookbook"><div>TYPE / 01<strong>APPAREL</strong></div><div>TYPE / 02<strong>OBJECT</strong></div><div>TYPE / 03<strong>PACK</strong></div></div><div className="service-list"><div><span>01</span><p><b>Бриф</b><small>Задача, продукт и ограничения производства</small></p></div><div><span>02</span><p><b>Концепция</b><small>Направление и первый визуальный вариант</small></p></div><div><span>03</span><p><b>Подготовка</b><small>Исходники и файлы под выпуск тиража</small></p></div></div><div className="service-meta"><div><small>СРОК</small><b>от 7 дней</b></div><div><small>СТОИМОСТЬ</small><b>после брифа</b></div></div><button className="manager-button" onClick={() => { onContact(); onClose(); }}>НАПИСАТЬ МЕНЕДЖЕРУ ↗</button></article></div>;
}

function ProductSheet({ product, onClose, onContact }: { product: Product; onClose: () => void; onContact: () => void }) {
  const [slide, setSlide] = useState(0);
  const gallery = product.gallery.filter((image) => image.src);
  if (gallery.length === 0) gallery.push({ label: "" });
  const totalSlides = gallery.length;
  const currentSlide = gallery[slide];
  const setSlideInRange = (next: number) => setSlide((next + totalSlides) % totalSlides);
  const layouts = { clothing: { eyebrow: "ОДЕЖДА / KITSUN" }, cars: { eyebrow: "АВТО / KITSUN" }, digital: { eyebrow: "ЦИФРОВОЙ ТОВАР" } } as const;
  const layout = layouts[product.category];
  return <div className="sheet-backdrop page-backdrop" role="region" aria-label={product.title}><article className={`sheet product-sheet product-sheet-${product.category}`}><div className="page-topbar"><button onClick={onClose}>← НАЗАД</button><span>KITSUN NO STORE</span></div><section className={`product-carousel ${product.color}`} aria-label={`Галерея ${product.title}`}>{currentSlide.src ? <img className="product-carousel-image" src={currentSlide.src} alt={product.title} /> : <div className="product-carousel-art" />}{totalSlides > 1 && <><button className="carousel-control previous" onClick={() => setSlideInRange(slide - 1)} aria-label="Предыдущее фото">←</button><button className="carousel-control next" onClick={() => setSlideInRange(slide + 1)} aria-label="Следующее фото">→</button><div className="carousel-dots" aria-label={`Фото ${slide + 1} из ${totalSlides}`}>{gallery.map((image, index) => <button key={`${image.label}-${index}`} className={index === slide ? "active" : ""} onClick={() => setSlide(index)} aria-label={`Фото ${index + 1}`} />)}</div></>}</section><p className="eyebrow">{layout.eyebrow} · {availabilityLabels[product.availability] || availabilityLabels.in_stock}</p><h2>{product.title}</h2><p className="sheet-copy">{product.description}</p>{product.details.length > 0 && <section className="product-specs">{product.details.map((detail, index) => <div key={`${detail.label}-${index}`}><span>{detail.label}</span><b>{detail.value}</b></div>)}</section>}<footer><strong>{product.price}</strong><button onClick={onContact}>СВЯЗАТЬСЯ ↗</button></footer></article></div>;
}

function CartSheet({ items, onClose, onRemove, onCheckout }: { items: CartItem[]; onClose: () => void; onRemove: (id: string) => void; onCheckout: () => void }) {
  const total = items.reduce((sum, item) => sum + item.unitPrice, 0);
  return <div className="sheet-backdrop page-backdrop" role="region" aria-label="Корзина"><article className="sheet cart-sheet"><div className="page-topbar"><button onClick={onClose}>← НАЗАД</button><span>KITSUN®</span></div><div className="cart-heading"><p className="eyebrow">ЗАКАЗ / {items.length}</p><h2>КОРЗИНА</h2></div>{items.length === 0 ? <div className="cart-empty"><span>0</span><strong>ЗДЕСЬ ПОКА ПУСТО</strong><p>Добавь нужные материалы из каталога.</p><button onClick={onClose}>В КАТАЛОГ</button></div> : <><div className="cart-list">{items.map((item) => <div className="cart-item" key={item.id}><div className={`cart-thumb ${item.color}`}>{item.mark}</div><div><strong>{item.title}</strong><span>{item.type}</span><b>{item.unitPrice.toLocaleString("ru-RU")} ₽</b></div><button aria-label={`Удалить ${item.title}`} onClick={() => onRemove(item.id)}>×</button></div>)}</div><div className="cart-summary"><div className="cart-total"><span>ТОВАРЫ</span><strong>{total.toLocaleString("ru-RU")} ₽</strong></div><div className="cart-total final"><span>ИТОГО</span><strong>{total.toLocaleString("ru-RU")} ₽</strong></div><p>Цифровые товары станут доступны после подтверждения оплаты.</p></div><button className="checkout-button cart-checkout" onClick={onCheckout}>ПЕРЕЙТИ К ОФОРМЛЕНИЮ →</button></>}</article></div>;
}

function CheckoutSheet({ items, onClose, onComplete, onViewPurchases }: { items: CartItem[]; onClose: () => void; onComplete: () => void; onViewPurchases: () => void }) {
  const [email, setEmail] = useState("");
  const [payment, setPayment] = useState<"transfer" | "manual">("transfer");
  const [accepted, setAccepted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce((sum, item) => sum + item.unitPrice, 0);

  const submit = () => {
    if (!email.includes("@")) { setError("Укажи корректный email"); return; }
    if (!accepted) { setError("Нужно принять условия покупки"); return; }
    setError("");
    setComplete(true);
    onComplete();
  };

  return <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Оформление заказа" onClick={onClose}><article className="sheet checkout-sheet" onClick={(event) => event.stopPropagation()}>{complete ? <div className="order-success"><div className="success-mark">✓</div><p className="eyebrow">ЗАКАЗ ПРИНЯТ</p><h2>ВСЁ ГОТОВО</h2><p>Инструкция по оплате отправлена на <b>{email}</b>. Материалы уже добавлены в раздел «Покупки» в демо-режиме.</p><button onClick={onViewPurchases}>ПЕРЕЙТИ К ПОКУПКАМ →</button></div> : <><div className="sheet-title"><p className="eyebrow">ШАГ 2 / 2</p><button className="sheet-close" onClick={onClose} aria-label="Закрыть">×</button></div><h2>ОФОРМЛЕНИЕ</h2><div className="order-summary"><span>{items.length} {items.length === 1 ? "МАТЕРИАЛ" : "МАТЕРИАЛА"}</span><strong>{total.toLocaleString("ru-RU")} ₽</strong></div><label className="field"><span>EMAIL ДЛЯ ПОЛУЧЕНИЯ ФАЙЛОВ</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><fieldset className="payment-options"><legend>СПОСОБ ОПЛАТЫ</legend><label className={payment === "transfer" ? "selected" : ""}><input type="radio" checked={payment === "transfer"} onChange={() => setPayment("transfer")} /><span><b>Банковский перевод</b><small>Реквизиты придут после оформления</small></span><i>○</i></label><label className={payment === "manual" ? "selected" : ""}><input type="radio" checked={payment === "manual"} onChange={() => setPayment("manual")} /><span><b>Согласовать с менеджером</b><small>Свяжемся с тобой в Telegram</small></span><i>○</i></label></fieldset><label className="agreement"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Я принимаю условия покупки и пользовательское соглашение</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="checkout-button" onClick={submit}>ОФОРМИТЬ ЗАКАЗ · {total.toLocaleString("ru-RU")} ₽</button><p className="secure-note">Цена и состав заказа будут повторно проверены на сервере.</p></>}</article></div>;
}
