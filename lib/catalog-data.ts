export const catalogCategories = ["clothing", "cars", "digital"] as const;
export type CatalogCategory = (typeof catalogCategories)[number];
export type ProductColor = "pink" | "blue" | "lime";
export const availabilityOptions = ["in_stock", "out_of_stock", "preorder"] as const;
export type ProductAvailability = (typeof availabilityOptions)[number];
export type ProductDetail = { label: string; value: string };
export type ProductDetails = ProductDetail[];
export type CatalogProduct = { id: string; title: string; type: string; category: CatalogCategory; price: string; description: string; color: ProductColor; mark: string; active: boolean; availability: ProductAvailability; details: ProductDetails; gallery: Array<{ label: string; src?: string }> };

export const defaultProducts: CatalogProduct[] = [
  { id: "01", title: "MELTED ORBIT", type: "Принт", category: "digital", price: "2 400 ₽", description: "Готовый принт и исходники для одежды, товаров и коммерческих проектов.", color: "pink", mark: "PRINT", active: true, availability: "in_stock", details: [{ label: "Формат", value: "PNG, PSD" }, { label: "Лицензия", value: "Личное использование" }, { label: "Разрешение", value: "По запросу" }], gallery: [{ label: "ПРЕВЬЮ" }, { label: "ДЕТАЛЬ" }] },
  { id: "02", title: "MOTOR STUDY", type: "Porsche", category: "cars", price: "3 200 ₽", description: "Тестовая карточка автомобиля. Подберём комплектацию и ответим на вопросы в личном сообщении.", color: "blue", mark: "OBJECT", active: true, availability: "preorder", details: [{ label: "Год", value: "По запросу" }, { label: "Пробег", value: "По запросу" }, { label: "Комплектация", value: "По запросу" }], gallery: [{ label: "ЭКСТЕРЬЕР" }, { label: "ИНТЕРЬЕР" }, { label: "ДЕТАЛЬ" }] },
  { id: "03", title: "TERRAIN 004", type: "Футболка", category: "clothing", price: "1 800 ₽", description: "Лимитированная позиция из тестовой коллекции KITSUN.", color: "lime", mark: "DROP", active: true, availability: "preorder", details: [{ label: "Размеры", value: "S · M · L · XL" }, { label: "Состав", value: "100% хлопок" }, { label: "Уход", value: "Бережная стирка" }], gallery: [{ label: "ЛУК" }, { label: "ДЕТАЛЬ" }] },
  { id: "04", title: "KITSUN TEE 001", type: "Футболка", category: "clothing", price: "3 900 ₽", description: "Базовая футболка свободного кроя из плотного хлопка.", color: "pink", mark: "TEE", active: true, availability: "in_stock", details: [{ label: "Размеры", value: "S · M · L · XL" }, { label: "Состав", value: "100% хлопок" }, { label: "Уход", value: "Бережная стирка" }], gallery: [{ label: "СПЕРЕДИ" }, { label: "СЗАДИ" }] },
  { id: "05", title: "UTILITY HOODIE", type: "Худи", category: "clothing", price: "8 900 ₽", description: "Худи свободного силуэта для прохладной погоды.", color: "blue", mark: "HOODIE", active: true, availability: "in_stock", details: [{ label: "Размеры", value: "S · M · L · XL" }, { label: "Состав", value: "100% хлопок" }, { label: "Уход", value: "Бережная стирка" }], gallery: [{ label: "СПЕРЕДИ" }, { label: "КАПЮШОН" }, { label: "СЗАДИ" }] },
];
