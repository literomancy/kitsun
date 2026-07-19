"use client";

import { useEffect, useState } from "react";
import type { TelegramUser } from "../lib/telegram";

type Tab = "Главная" | "Каталог" | "Покупки" | "Профиль";
type Product = { id: string; title: string; type: string; price: string; color: "pink" | "blue" | "lime"; mark: string };
type CartItem = Product & { unitPrice: number };

const products: Product[] = [
  { id: "01", title: "MELTED ORBIT", type: "Принт · PNG, PSD", price: "2 400 ₽", color: "pink", mark: "PRINT" },
  { id: "02", title: "MOTOR STUDY", type: "Исходник · AI, SVG", price: "3 200 ₽", color: "blue", mark: "VECTOR" },
  { id: "03", title: "TERRAIN 004", type: "Набор · PNG, TIFF", price: "1 800 ₽", color: "lime", mark: "PACK" },
];

const categories = [
  ["01", "ЦИФРОВЫЕ\nТОВАРЫ", "Файлы для одежды и товаров"],
  ["02", "АКСЕССУАРЫ", "Дополнения для вашего продукта"],
  ["03", "МЕРЧ", "Редкие дропы KITSUN"],
] as const;

export default function Home() {
  const [tab, setTab] = useState<Tab>("Главная");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [purchases, setPurchases] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [insideTelegram, setInsideTelegram] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const addToCart = (product: Product, unitPrice: number) => {
    if (cart.some((item) => item.id === product.id)) {
      setNotice("Этот товар уже в корзине");
      return;
    }
    setCart((items) => [...items, { ...product, unitPrice }]);
    setNotice(`${product.title} добавлен в корзину`);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const navigate = (nextTab: Tab) => {
    setSelected(null);
    setCartOpen(false);
    setCheckoutOpen(false);
    setFavoritesOpen(false);
    setCustomOrderOpen(false);
    setTab(nextTab);
  };

  const openCart = () => {
    setSelected(null);
    setCheckoutOpen(false);
    setFavoritesOpen(false);
    setCustomOrderOpen(false);
    setCartOpen(true);
  };

  const hasInnerScreen = Boolean(selected || cartOpen || checkoutOpen || favoritesOpen || customOrderOpen);

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
        if (favoritesOpen) setFavoritesOpen(false);
        else if (customOrderOpen) setCustomOrderOpen(false);
        else if (checkoutOpen) { setCheckoutOpen(false); setCartOpen(true); }
        else if (selected) setSelected(null);
        else if (cartOpen) setCartOpen(false);
      };

      WebApp.ready();
      if (!telegramUser) fetch("/api/telegram/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initData: WebApp.initData }),
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
  }, [cartOpen, checkoutOpen, customOrderOpen, favoritesOpen, hasInnerScreen, selected]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector<HTMLElement>(".sheet")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [cartOpen, checkoutOpen, customOrderOpen, favoritesOpen, selected, tab]);

  if (selected) {
    return <main className={`shell standalone-shell ${insideTelegram ? "telegram-native" : ""}`}><ProductSheet product={products.find((product) => product.id === selected)!} onClose={() => setSelected(null)} onAdd={addToCart} /><FloatingCart count={cart.length} onOpen={openCart} /><BottomNav tab="Каталог" onSelect={navigate} />{notice && <div className="toast" role="status">{notice}</div>}</main>;
  }

  if (cartOpen) {
    return <main className={`shell standalone-shell ${insideTelegram ? "telegram-native" : ""}`}><CartSheet items={cart} onClose={() => setCartOpen(false)} onRemove={(id) => setCart((items) => items.filter((item) => item.id !== id))} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} /><FloatingCart count={cart.length} onOpen={openCart} active /><BottomNav tab={tab} onSelect={navigate} /></main>;
  }

  if (checkoutOpen) {
    return <main className={`shell standalone-shell ${insideTelegram ? "telegram-native" : ""}`}><CheckoutSheet items={cart} onClose={() => { setCheckoutOpen(false); setCartOpen(true); }} onComplete={() => { setPurchases((current) => [...current, ...cart.filter((item) => !current.some((saved) => saved.id === item.id))]); setCart([]); }} onViewPurchases={() => { setCheckoutOpen(false); setTab("Покупки"); }} /><FloatingCart count={cart.length} onOpen={openCart} /></main>;
  }

  return (
    <main className={`shell ${insideTelegram ? "telegram-native" : ""}`}>
      {tab === "Главная" && <header className="header">
        <a className="wordmark" href="#top" aria-label="KITSUN, главная">KITSUN<span>®</span></a>
      </header>}

      <FloatingCart count={cart.length} onOpen={openCart} />

      {tab === "Главная" && <>
        <section className="hero" id="top">
          <p className="eyebrow">KITSUN / DIGITAL CATALOG</p>
          <h1><span>ГОТОВО</span><span>К <em>ТИРАЖУ.</em></span></h1>
          <p className="hero-copy">Принты, исходники и дизайн-проекты для производства и маркетплейсов.</p>
          <a className="text-link" href="#catalog">ОТКРЫТЬ КАТАЛОГ <span>↘</span></a>
        </section>

        <section className="category-list" aria-label="Разделы магазина">
          {categories.map(([number, title, description]) => (
            <button key={number} className="category" onClick={() => setTab("Каталог")}>
              <small>{number}</small>
              <strong>{title.split("\n").map((part) => <span key={part}>{part}</span>)}</strong>
              <span className="category-description">{description}</span>
              <b>↗</b>
            </button>
          ))}
        </section>

        <section className="section" id="catalog">
          <div className="section-head"><p>НОВОЕ В КАТАЛОГЕ</p><button onClick={() => setTab("Каталог")}>ВСЁ →</button></div>
          <div className="product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelected} favorite={favorites.includes(product.id)} onToggleFavorite={toggleFavorite} />)}
          </div>
        </section>

        <section className="custom-order">
          <p className="eyebrow">НУЖЕН СВОЙ ПРОЕКТ?</p>
          <h2>Индивидуальный<br />заказ <span>↗</span></h2>
          <p>От концепта до готового файла для производства.</p>
          <button onClick={() => setCustomOrderOpen(true)}>ОБСУДИТЬ</button>
        </section>
      </>}

      {tab === "Каталог" && <Catalog products={products} onOpen={setSelected} favorites={favorites} onToggleFavorite={toggleFavorite} />}
      {tab === "Покупки" && <Purchases items={purchases} onBrowse={() => setTab("Каталог")} />}
      {tab === "Профиль" && <Profile purchaseCount={purchases.length} favoriteCount={favorites.length} telegramUser={telegramUser} onOpenFavorites={() => setFavoritesOpen(true)} onSupport={() => setNotice("Откроем чат поддержки в Telegram")} />}

      <BottomNav tab={tab} onSelect={navigate} />

      {favoritesOpen && <FavoritesSheet items={products.filter((product) => favorites.includes(product.id))} onClose={() => setFavoritesOpen(false)} onRemove={toggleFavorite} onOpen={(id) => { setFavoritesOpen(false); setSelected(id); }} />}
      {customOrderOpen && <CustomOrderSheet onClose={() => setCustomOrderOpen(false)} onContact={() => setNotice("Переходим в Telegram-чат с менеджером")} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}

function BottomNav({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="Основная навигация">{(["Главная", "Каталог", "Покупки", "Профиль"] as Tab[]).map((item, index) => <button key={item} className={tab === item ? "active" : ""} onClick={() => onSelect(item)}><span><Icon name={(["home", "grid", "download", "user"] as const)[index]} /></span>{item}</button>)}</nav>;
}

function FloatingCart({ count, onOpen, active = false }: { count: number; onOpen: () => void; active?: boolean }) {
  return <button className={`floating-cart ${active ? "active" : ""}`} aria-label={`Корзина, товаров: ${count}`} onClick={onOpen}><Icon name="bag" />{count > 0 && <i>{count}</i>}</button>;
}

function ProductCard({ product, onOpen, favorite, onToggleFavorite }: { product: Product; onOpen: (id: string) => void; favorite: boolean; onToggleFavorite: (id: string) => void }) {
  return <article className="product">
    <button className="product-open" onClick={() => onOpen(product.id)}><div className={`product-art ${product.color}`}><span>{product.id}</span><b>{product.mark}</b><i>↗</i></div><strong>{product.title}</strong><small>{product.type}</small><span>{product.price}</span></button>
    <button className={`favorite-button ${favorite ? "saved" : ""}`} aria-label={favorite ? `Убрать ${product.title} из избранного` : `Добавить ${product.title} в избранное`} onClick={() => onToggleFavorite(product.id)}><Icon name="heart" /></button>
  </article>;
}

function Catalog({ products, onOpen, favorites, onToggleFavorite }: { products: Product[]; onOpen: (id: string) => void; favorites: string[]; onToggleFavorite: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("Все");
  const kinds = ["Все", "Принт", "Исходник", "Набор"];
  const visible = products.filter((product) => {
    const matchesKind = kind === "Все" || product.type.startsWith(kind);
    const matchesQuery = `${product.title} ${product.type}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesKind && matchesQuery;
  });

  return <section className="catalog-page"><p className="eyebrow">ЦИФРОВЫЕ ТОВАРЫ</p><h1>КАТАЛОГ</h1><label className="search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по материалам" /><button type="button">ФИЛЬТРЫ</button></label><div className="chips">{kinds.map((item) => <button key={item} className={kind === item ? "chosen" : ""} onClick={() => setKind(item)}>{item === "Принт" ? "Принты" : item === "Исходник" ? "Исходники" : item === "Набор" ? "Наборы" : item}</button>)}</div><div className="catalog-count">НАЙДЕНО: {visible.length}</div>{visible.length > 0 ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} onOpen={onOpen} favorite={favorites.includes(product.id)} onToggleFavorite={onToggleFavorite} />)}</div> : <div className="catalog-empty"><span>0</span><strong>НИЧЕГО НЕ НАЙДЕНО</strong><p>Измени запрос или сбрось категорию.</p><button onClick={() => { setQuery(""); setKind("Все"); }}>СБРОСИТЬ</button></div>}</section>;
}

function EmptyState({ icon, title, copy }: { icon: string; title: string; copy: string }) { return <section className="empty"><div>{icon}</div><h1>{title}</h1><p>{copy}</p></section>; }
function Profile({ purchaseCount, favoriteCount, telegramUser, onOpenFavorites, onSupport }: { purchaseCount: number; favoriteCount: number; telegramUser: TelegramUser | null; onOpenFavorites: () => void; onSupport: () => void }) { const displayName = telegramUser ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") : "ГОСТЬ"; const initial = displayName.charAt(0).toUpperCase(); return <section className="profile"><p className="eyebrow">АККАУНТ</p><div className="avatar">{initial}</div><h1>{displayName}</h1>{telegramUser ? <p>{telegramUser.username ? `@${telegramUser.username}` : `Telegram ID ${telegramUser.id}`}</p> : <p>Откройте приложение через Telegram, чтобы синхронизировать покупки и избранное.</p>} {!telegramUser && <button className="profile-button">ОТКРЫТЬ В TELEGRAM ↗</button>}<div className="profile-stats"><div><strong>{purchaseCount}</strong><span>ПОКУПКИ</span></div><button onClick={onOpenFavorites}><strong>{favoriteCount}</strong><span>ИЗБРАННОЕ →</span></button></div><div className="profile-links"><button onClick={onSupport}>Поддержка <span>→</span></button><button>Условия использования <span>→</span></button></div></section>; }

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

function FavoritesSheet({ items, onClose, onRemove, onOpen }: { items: Product[]; onClose: () => void; onRemove: (id: string) => void; onOpen: (id: string) => void }) {
  return <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Избранное" onClick={onClose}><article className="sheet favorites-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-title"><p className="eyebrow">СОХРАНЕНО / {items.length}</p><button className="sheet-close" onClick={onClose} aria-label="Закрыть">×</button></div><h2>ИЗБРАННОЕ</h2>{items.length === 0 ? <div className="cart-empty"><span>0</span><strong>ПОКА ПУСТО</strong><p>Сохраняй материалы из каталога, чтобы вернуться к ним позже.</p><button onClick={onClose}>В КАТАЛОГ</button></div> : <div className="favorite-list">{items.map((item) => <article key={item.id}><button className={`favorite-preview ${item.color}`} onClick={() => onOpen(item.id)}><span>{item.id}</span><b>{item.mark}</b></button><div><button className="favorite-title" onClick={() => onOpen(item.id)}>{item.title}</button><span>{item.type}</span><strong>{item.price}</strong></div><button className="favorite-remove" onClick={() => onRemove(item.id)} aria-label={`Убрать ${item.title} из избранного`}>×</button></article>)}</div>}</article></div>;
}

function CustomOrderSheet({ onClose, onContact }: { onClose: () => void; onContact: () => void }) {
  return <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Индивидуальный заказ" onClick={onClose}><article className="sheet info-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-title"><p className="eyebrow">KITSUN / CUSTOM</p><button className="sheet-close" onClick={onClose} aria-label="Закрыть">×</button></div><h2>СВОЙ ПРОЕКТ</h2><p className="info-lead">Разработаем графику под конкретный товар, производство и площадку.</p><div className="lookbook"><div>TYPE / 01<strong>APPAREL</strong></div><div>TYPE / 02<strong>OBJECT</strong></div><div>TYPE / 03<strong>PACK</strong></div></div><div className="service-list"><div><span>01</span><p><b>Бриф</b><small>Задача, продукт и ограничения производства</small></p></div><div><span>02</span><p><b>Концепция</b><small>Направление и первый визуальный вариант</small></p></div><div><span>03</span><p><b>Подготовка</b><small>Исходники и файлы под выпуск тиража</small></p></div></div><div className="service-meta"><div><small>СРОК</small><b>от 7 дней</b></div><div><small>СТОИМОСТЬ</small><b>после брифа</b></div></div><button className="manager-button" onClick={() => { onContact(); onClose(); }}>НАПИСАТЬ МЕНЕДЖЕРУ ↗</button></article></div>;
}

function ProductSheet({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (product: Product, unitPrice: number) => void }) {
  const unitPrice = Number(product.price.replace(/\D/g, ""));
  return <div className="sheet-backdrop page-backdrop" role="region" aria-label={product.title}><article className="sheet product-sheet"><div className="page-topbar"><button onClick={onClose}>← НАЗАД</button><span>KITSUN®</span></div><div className={`sheet-art ${product.color}`}><span>{product.id} / KITSUN</span><b>{product.title}</b></div><p className="eyebrow">ЦИФРОВОЙ МАТЕРИАЛ</p><h2>{product.title}</h2><p className="sheet-copy">Готовый дизайн-файл для одежды, товаров и коммерческих проектов.</p><div className="spec"><span>В КОМПЛЕКТЕ</span><b>4 файла · инструкция</b></div><div className="spec"><span>ФОРМАТЫ</span><b>AI · SVG · PNG · PDF</b></div><section className="usage-block"><p className="eyebrow">ПОДХОДИТ ДЛЯ</p><div><span>ОДЕЖДА</span><span>МАРКЕТПЛЕЙСЫ</span><span>ПЕЧАТЬ</span></div><p>Макет можно редактировать, перекрашивать и адаптировать под выбранный носитель.</p></section><section className="instruction-block"><p className="eyebrow">КАК ЭТО РАБОТАЕТ</p><ol><li><span>01</span>Оплати заказ</li><li><span>02</span>Скачай архив в покупках</li><li><span>03</span>Передай файл в производство</li></ol></section><footer><strong>{unitPrice.toLocaleString("ru-RU")} ₽</strong><button onClick={() => { onAdd(product, unitPrice); onClose(); }}>В КОРЗИНУ</button></footer></article></div>;
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
