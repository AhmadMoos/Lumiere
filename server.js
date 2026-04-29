const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const puppeteer = require("puppeteer-core");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const dataDir = path.join(__dirname, "data");
const receiptsDir = path.join(__dirname, "public", "receipts");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });

const dbPath = path.join(dataDir, "lumiere.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    last_login_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_ref TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    service REAL NOT NULL,
    total REAL NOT NULL,
    items_json TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    login_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`ALTER TABLE users ADD COLUMN last_login_at TEXT`, () => {});

  db.run(
    "INSERT OR IGNORE INTO users (full_name, email, password) VALUES (?,?,?)",
    ["Test User", "test@lumiere.com", "test123"]
  );
});

const MENU_ITEMS = [
  { id: 1, name: "Kasap Burger", category: "Burgers", price: 325.0, image: "🍔", rating: 4.8, description: "100 gr. burger koftesi, cheddar peyniri, ozel sos, dana fume, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 2, name: "Tavuk Burger", category: "Burgers", price: 240.0, image: "🍔", rating: 4.6, description: "130 gr. tavuk koftesi, ozel sos, tursu, cheddar peyniri, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 3, name: "Acili Tavuk Burger", category: "Burgers", price: 250.0, image: "🍔", rating: 4.5, description: "130 gr. tavuk koftesi, aci sos, jalapeno biberi, tursu, cheddar peyniri, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 4, name: "Hamburger", category: "Burgers", price: 275.0, image: "🍔", rating: 4.7, description: "100 gr. burger koftesi, ozel sos, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 5, name: "Cheeseburger", category: "Burgers", price: 295.0, image: "🍔", rating: 4.8, description: "100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 6, name: "Barbeku Burger", category: "Burgers", price: 295.0, image: "🍔", rating: 4.6, description: "100 gr. burger koftesi, cheddar peyniri, ozel sos, barbeku sos, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 7, name: "Mexica Burger", category: "Burgers", price: 295.0, image: "🍔", rating: 4.6, description: "100 gr. burger koftesi, cheddar peyniri, aci sos, jelapano biberi, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 8, name: "Mantar Burger", category: "Burgers", price: 315.0, image: "🍔", rating: 4.5, description: "100 gr. burger koftesi, cheddar peyniri, ozel sos, mantar, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 9, name: "Peperoni Burger", category: "Burgers", price: 325.0, image: "🍔", rating: 4.6, description: "100 gr. burger koftesi, cheddar peyniri, ozel sos, sucuk, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 10, name: "Anadolu Burger", category: "Burgers", price: 340.0, image: "🍔", rating: 4.7, description: "100 gr. burger koftesi, cheddar peyniri, ozel sos, pastirma, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 11, name: "Special Burger", category: "Burgers", price: 325.0, image: "🍔", rating: 4.8, description: "100 gr. burger koftesi, cheddar peyniri, ozel sos, kavurma, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 12, name: "Sef Burger", category: "Burgers", price: 380.0, image: "🍔", rating: 4.9, description: "100 gr. burger koftesi, cheddar peyniri, ozel sos, dana fume, pastirma, sucuk, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 13, name: "Double Hamburger", category: "Burgers", price: 425.0, image: "🍔", rating: 4.7, description: "2x 100 gr. burger koftesi, ozel sos, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 14, name: "Double Tavuk Burger", category: "Burgers", price: 350.0, image: "🍔", rating: 4.5, description: "2x 130 gr. tavuk koftesi, ozel sos, tursu, 2x cheddar peyniri, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 15, name: "Double Acili Tavuk Burger", category: "Burgers", price: 360.0, image: "🍔", rating: 4.5, description: "2x 130 gr. tavuk koftesi, aci sos, jalapeno biberi, tursu, 2x cheddar peyniri, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 16, name: "Double Cheese Burger", category: "Burgers", price: 445.0, image: "🍔", rating: 4.8, description: "2x 100 gr. burger koftesi, 4x cheddar peyniri, ozel sos, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 17, name: "Double Barbeku Burger", category: "Burgers", price: 445.0, image: "🍔", rating: 4.7, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, barbeku sos, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 18, name: "Double Mexica Burger", category: "Burgers", price: 445.0, image: "🍔", rating: 4.7, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, aci sos, jelapano biberi, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 19, name: "Double Mantar Burger", category: "Burgers", price: 465.0, image: "🍔", rating: 4.6, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, mantar, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 20, name: "Double Kasap Burger", category: "Burgers", price: 475.0, image: "🍔", rating: 4.8, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, dana fume, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 21, name: "Double Peperoni Burger", category: "Burgers", price: 475.0, image: "🍔", rating: 4.7, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, sucuk, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 22, name: "Double Anadolu Burger", category: "Burgers", price: 490.0, image: "🍔", rating: 4.8, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, pastirma, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 23, name: "Double Special Burger", category: "Burgers", price: 485.0, image: "🍔", rating: 4.8, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, kavurma, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 24, name: "Double Sef Burger", category: "Burgers", price: 530.0, image: "🍔", rating: 4.9, description: "2x 100 gr. burger koftesi, 2x cheddar peyniri, ozel sos, dana fume, pastirma, sucuk, tursu, yesillik yaninda patates kizartmasi ile servis edilir." },
  { id: 25, name: "Iki Kisilik Et Burger Menu", category: "Menus", price: 750.0, image: "🍽️", rating: 4.8, description: "2 adet 100 gr dana burger, 6'li sogan halkasi, 2 patates kizartmasi ve 2 icecek ile servis edilir." },
  { id: 26, name: "Iki Kisilik Tavuk Burger Menu", category: "Menus", price: 630.0, image: "🍽️", rating: 4.6, description: "2 adet 130 gr tavuk burger, 6'li sogan halkasi, 2 patates kizartmasi ve 2 icecek ile servis edilir." },
  { id: 200, name: "Aile Pizza Menu", category: "Menus", price: 890.0, image: "🍽️", rating: 4.7, description: "Buyuk boy pizza, 6'li peynir cubugu, 6'li sogan halkasi, 2 adet icecek." },
  { id: 201, name: "Cocuk Menu", category: "Menus", price: 320.0, image: "🍽️", rating: 4.5, description: "Tavuk burger, kucuk patates, mini icecek ve 1 adet dondurma cup." },
  { id: 202, name: "Combo Cheeseburger Menu", category: "Menus", price: 410.0, image: "🍽️", rating: 4.6, description: "Cheeseburger, patates kizartmasi, 1 adet 330 ml icecek." },
  { id: 203, name: "Combo Tavuk Burger Menu", category: "Menus", price: 380.0, image: "🍽️", rating: 4.5, description: "Tavuk burger, patates kizartmasi, 1 adet 330 ml icecek." },
  { id: 27, name: "Kucuk Pizza Margarita", category: "Pizza", price: 245.0, image: "🍕", rating: 4.7, description: "Ozel pizza sosu ve mozzarella peyniri." },
  { id: 28, name: "Kucuk Pizza Kasap", category: "Pizza", price: 265.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, sosis, misir." },
  { id: 29, name: "Kucuk Pizza Meksika", category: "Pizza", price: 265.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, pizza salami, mantar, yesil biber, aci jalapeno biberi." },
  { id: 30, name: "Kucuk Pizza Anadolu", category: "Pizza", price: 320.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, pastirma, sucuk, sogan, mantar, yesil biber." },
  { id: 31, name: "Kucuk Pizza Denge", category: "Pizza", price: 295.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, salam, yesil biber, domates." },
  { id: 32, name: "Kucuk Pizza Dolu Dolu", category: "Pizza", price: 295.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, pizza salami, sosis, yesil biber, mantar, siyah zeytin." },
  { id: 33, name: "Kucuk Pizza Dort Peynirli", category: "Pizza", price: 295.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, beyaz peynir, tulum peyniri, cheddar peyniri." },
  { id: 34, name: "Kucuk Pizza Et Soleni", category: "Pizza", price: 265.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, salam, sogan, sosis." },
  { id: 35, name: "Kucuk Pizza Sebze Soleni", category: "Pizza", price: 295.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, beyaz peynir, mantar, yesil biber, siyah zeytin, domates." },
  { id: 36, name: "Kucuk Pizza Special", category: "Pizza", price: 320.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, kavurma, domates, sogan." },
  { id: 37, name: "Kucuk Pizza Tavuk Keyfi", category: "Pizza", price: 295.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, parca tavuk, domates, yesil biber." },
  { id: 38, name: "Kucuk Pizza Ton", category: "Pizza", price: 320.0, image: "🍕", rating: 4.7, description: "Ozel pizza sosu, mozzarella peyniri, ton baligi, sogan, misir." },
  { id: 39, name: "Kucuk Pizza Usta Karisik", category: "Pizza", price: 265.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, pizza salami, sosis, yesil biber, mantar, misir." },
  { id: 40, name: "Kucuk Pizza Enfes", category: "Pizza", price: 265.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, sosis, mantar, misir, yesil biber." },
  { id: 41, name: "Kucuk Pizza Zeytin Sever", category: "Pizza", price: 265.0, image: "🍕", rating: 4.4, description: "Ozel pizza sosu, mozzarella peyniri, zeytin, sogan, misir." },
  { id: 42, name: "Kucuk Pizza Lezzet Harmani", category: "Pizza", price: 265.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, sosis, sogan, mantar, misir." },
  { id: 43, name: "Orta Pizza Margarita", category: "Pizza", price: 360.0, image: "🍕", rating: 4.7, description: "Ozel pizza sosu ve mozzarella peyniri." },
  { id: 44, name: "Orta Pizza Kasap", category: "Pizza", price: 395.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, sosis, misir." },
  { id: 45, name: "Orta Pizza Meksika", category: "Pizza", price: 395.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, pizza salami, mantar, yesil biber, aci jalapeno biberi." },
  { id: 46, name: "Orta Pizza Anadolu", category: "Pizza", price: 465.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, pastirma, sucuk, sogan, mantar, yesil biber." },
  { id: 47, name: "Orta Pizza Denge", category: "Pizza", price: 435.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, salam, yesil biber, domates." },
  { id: 48, name: "Orta Pizza Dolu Dolu", category: "Pizza", price: 435.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, pizza salami, sosis, yesil biber, mantar, siyah zeytin." },
  { id: 49, name: "Orta Pizza Dort Peynirli", category: "Pizza", price: 435.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, beyaz peynir, tulum peyniri, cheddar peyniri." },
  { id: 50, name: "Orta Pizza Et Soleni", category: "Pizza", price: 395.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, salam, sogan, sosis." },
  { id: 51, name: "Orta Pizza Sebze Soleni", category: "Pizza", price: 435.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, beyaz peynir, mantar, yesil biber, siyah zeytin, domates." },
  { id: 52, name: "Orta Pizza Special", category: "Pizza", price: 465.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, kavurma, domates, sogan." },
  { id: 53, name: "Orta Pizza Tavuk Keyfi", category: "Pizza", price: 435.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, parca tavuk, domates, yesil biber." },
  { id: 54, name: "Orta Pizza Ton", category: "Pizza", price: 465.0, image: "🍕", rating: 4.7, description: "Ozel pizza sosu, mozzarella peyniri, ton baligi, sogan, misir." },
  { id: 55, name: "Buyuk Pizza Margarita", category: "Pizza", price: 535.0, image: "🍕", rating: 4.7, description: "Ozel pizza sosu ve mozzarella peyniri." },
  { id: 56, name: "Buyuk Pizza Kasap", category: "Pizza", price: 565.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, sosis, misir." },
  { id: 57, name: "Buyuk Pizza Meksika", category: "Pizza", price: 565.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, pizza salami, mantar, yesil biber, aci jalapeno biberi." },
  { id: 58, name: "Buyuk Pizza Anadolu", category: "Pizza", price: 675.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, pastirma, sucuk, sogan, mantar, yesil biber." },
  { id: 59, name: "Buyuk Pizza Denge", category: "Pizza", price: 630.0, image: "🍕", rating: 4.5, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, salam, yesil biber, domates." },
  { id: 60, name: "Buyuk Pizza Dolu Dolu", category: "Pizza", price: 630.0, image: "🍕", rating: 4.6, description: "Ozel pizza sosu, mozzarella peyniri, sucuk, pizza salami, sosis, yesil biber, mantar, siyah zeytin." },
  { id: 61, name: "Buyuk Pizza Dort Peynirli", category: "Pizza", price: 630.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, beyaz peynir, tulum peyniri, cheddar peyniri." },
  { id: 62, name: "Buyuk Pizza Special", category: "Pizza", price: 675.0, image: "🍕", rating: 4.8, description: "Ozel pizza sosu, mozzarella peyniri, kavurma, domates, sogan." },
  { id: 63, name: "Buyuk Pizza Ton", category: "Pizza", price: 675.0, image: "🍕", rating: 4.7, description: "Ozel pizza sosu, mozzarella peyniri, ton baligi, sogan, misir." },
  { id: 64, name: "6'li Peynir Cubugu", category: "Snacks", price: 160.0, image: "🧀", rating: 4.5, description: "Alti adet peynir cubugu." },
  { id: 65, name: "6'li Citir Tavuk", category: "Snacks", price: 150.0, image: "🍗", rating: 4.6, description: "Alti adet citir tavuk." },
  { id: 66, name: "6'li Sogan Halkasi", category: "Snacks", price: 80.0, image: "🧅", rating: 4.4, description: "Alti adet sogan halkasi." },
  { id: 67, name: "Karisik Atistirma Tabagi", category: "Snacks", price: 200.0, image: "🍱", rating: 4.8, description: "2 adet sogan halkasi, 2 adet peynir cubugu, 2 adet citir tavuk ve patates kizartmasi ile servis edilir." },
  { id: 68, name: "Patates Kizartmasi", category: "Snacks", price: 100.0, image: "🍟", rating: 4.7, description: "Patates kizartmasi." },
  { id: 69, name: "Algida Maras Cup", category: "Ice Cream", price: 50.0, image: "🍨", rating: 4.5, description: "Dondurma cup." },
  { id: 70, name: "Carte d'Or Cikolata Ruyasi Cup", category: "Ice Cream", price: 50.0, image: "🍨", rating: 4.6, description: "Dondurma cup." },
  { id: 71, name: "Carte d'Or Meyve Ruyasi Cup", category: "Ice Cream", price: 50.0, image: "🍨", rating: 4.5, description: "Dondurma cup." },
  { id: 72, name: "Magnum Mini Badem", category: "Ice Cream", price: 50.0, image: "🍦", rating: 4.7, description: "Mini bademli dondurma." },
  { id: 73, name: "Magnum Mini Cookie", category: "Ice Cream", price: 50.0, image: "🍦", rating: 4.6, description: "Mini cookie dondurma." },
  { id: 74, name: "Algida Mini Nogger", category: "Ice Cream", price: 50.0, image: "🍦", rating: 4.5, description: "Mini nogger dondurma." },
  { id: 75, name: "7UP", category: "Drinks", price: 70.0, image: "🥤", rating: 4.3, description: "Soguk gazli icecek." },
  { id: 76, name: "7UP 1 LT", category: "Drinks", price: 110.0, image: "🥤", rating: 4.3, description: "Soguk gazli icecek 1 litre." },
  { id: 77, name: "Pepsi", category: "Drinks", price: 70.0, image: "🥤", rating: 4.3, description: "Soguk gazli icecek." },
  { id: 78, name: "Pepsi 1 LT", category: "Drinks", price: 110.0, image: "🥤", rating: 4.3, description: "Soguk gazli icecek 1 litre." },
  { id: 79, name: "Pepsi Max", category: "Drinks", price: 70.0, image: "🥤", rating: 4.2, description: "Sekersiz soguk gazli icecek." },
  { id: 80, name: "Pepsi Max 1 LT", category: "Drinks", price: 110.0, image: "🥤", rating: 4.2, description: "Sekersiz soguk gazli icecek 1 litre." },
  { id: 81, name: "Yedigun", category: "Drinks", price: 70.0, image: "🥤", rating: 4.2, description: "Soguk gazli icecek." },
  { id: 82, name: "Yedigun 1 LT", category: "Drinks", price: 110.0, image: "🥤", rating: 4.2, description: "Soguk gazli icecek 1 litre." },
  { id: 83, name: "Lipton Ice Tea Mango", category: "Drinks", price: 70.0, image: "🧋", rating: 4.4, description: "Mango aromali soguk cay." },
  { id: 84, name: "Lipton Ice Tea Mango 1 LT", category: "Drinks", price: 110.0, image: "🧋", rating: 4.4, description: "Mango aromali soguk cay 1 litre." },
  { id: 85, name: "Lipton Ice Tea Seftali", category: "Drinks", price: 70.0, image: "🧋", rating: 4.4, description: "Seftali aromali soguk cay." },
  { id: 86, name: "Lipton Ice Tea Seftali 1 LT", category: "Drinks", price: 110.0, image: "🧋", rating: 4.4, description: "Seftali aromali soguk cay 1 litre." },
  { id: 87, name: "Lipton Ice Tea Limon", category: "Drinks", price: 70.0, image: "🧋", rating: 4.4, description: "Limon aromali soguk cay." },
  { id: 88, name: "Tropicana Karisik", category: "Drinks", price: 70.0, image: "🧃", rating: 4.3, description: "Meyve suyu." },
  { id: 89, name: "Tropicana Seftali", category: "Drinks", price: 70.0, image: "🧃", rating: 4.3, description: "Meyve suyu." },
  { id: 90, name: "Tropicana Visne", category: "Drinks", price: 70.0, image: "🧃", rating: 4.3, description: "Meyve suyu." },
  { id: 91, name: "Sutas Ayran", category: "Drinks", price: 40.0, image: "🥛", rating: 4.5, description: "Geleneksel ayran." },
  { id: 92, name: "Sirma Limonlu Soda", category: "Drinks", price: 40.0, image: "💧", rating: 4.2, description: "Limonlu soda." },
  { id: 93, name: "Sirma Sade Soda", category: "Drinks", price: 30.0, image: "💧", rating: 4.2, description: "Sade soda." },
  { id: 94, name: "Su", category: "Drinks", price: 20.0, image: "💧", rating: 4.0, description: "Icme suyu." },
  { id: 95, name: "Colorado Ketcap", category: "Sauces", price: 10.0, image: "🥫", rating: 4.1, description: "Colorado ketcap." },
  { id: 96, name: "Colorado Mayonez", category: "Sauces", price: 10.0, image: "🥫", rating: 4.1, description: "Colorado mayonez." },
  { id: 97, name: "Colorado Sarimsakli Mayonez", category: "Sauces", price: 20.0, image: "🥫", rating: 4.2, description: "Colorado sarimsakli mayonez." },
  { id: 98, name: "Colorado Ranch Sos", category: "Sauces", price: 20.0, image: "🥫", rating: 4.2, description: "Colorado ranch sos." },
  { id: 99, name: "Colorado Barbeku Sos", category: "Sauces", price: 20.0, image: "🥫", rating: 4.2, description: "Colorado barbeku sos." },
  { id: 100, name: "Colorado Balli Hardal", category: "Sauces", price: 20.0, image: "🥫", rating: 4.2, description: "Colorado balli hardal sos." },
  { id: 101, name: "Colorado Hot Chili Aci Sos", category: "Sauces", price: 20.0, image: "🥫", rating: 4.2, description: "Colorado hot chili aci sos." },
  { id: 102, name: "Cheddar Peynir", category: "Extras", price: 25.0, image: "🧀", rating: 4.0, description: "1 adet urun icerir." },
  { id: 103, name: "Sucuk", category: "Extras", price: 40.0, image: "🥓", rating: 4.1, description: "1 adet urun icerir." },
  { id: 104, name: "Dana Fume", category: "Extras", price: 40.0, image: "🥩", rating: 4.1, description: "1 adet urun icerir." },
  { id: 105, name: "Pastirma", category: "Extras", price: 40.0, image: "🥩", rating: 4.2, description: "1 adet urun icerir." },
  { id: 106, name: "Kavurma", category: "Extras", price: 40.0, image: "🍖", rating: 4.3, description: "1 adet urun icerir." },
  { id: 107, name: "Hamburger Koftesi", category: "Extras", price: 150.0, image: "🥩", rating: 4.4, description: "Ekstra hamburger koftesi." },
  { id: 108, name: "Burger / Pizza Tek Fiyat", category: "Campaign", price: 349.99, image: "🔥", rating: 4.7, description: "Cheeseburger + patates + icecek veya orta boy pizza + icecek kampanyasi." },
  { id: 220, name: "Hafta Sonu Aile Kampanyasi", category: "Campaign", price: 999.0, image: "🔥", rating: 4.8, description: "2 burger + buyuk pizza + 6'li sogan halkasi + 4 icecek." },
  { id: 221, name: "Ogle Yemegi Kampanyasi", category: "Campaign", price: 249.0, image: "🔥", rating: 4.6, description: "Hamburger + patates + 1 adet 330 ml icecek hafta ici 12:00 - 16:00 arasi gecerlidir." },
  { id: 222, name: "Ogrenci Burger Kampanyasi", category: "Campaign", price: 199.0, image: "🔥", rating: 4.7, description: "Cheeseburger + patates kizartmasi + ayran. Ogrenci kimligi ile gecerlidir." },
  { id: 223, name: "Ikili Pizza Kampanyasi", category: "Campaign", price: 599.0, image: "🔥", rating: 4.6, description: "2 adet orta boy pizza + 1 adet 1 lt icecek." }
];

const IMAGE_SOURCES = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  burgerDouble: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=600&q=80",
  burgerCombo: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=600&q=80",
  pizza: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
  pizzaCheese: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
  pizzaTuna: "https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&w=600&q=80",
  fries: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
  onionRings: "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=600&q=80",
  cheeseSticks: "https://images.unsplash.com/photo-1605478579862-f87a32a92814?auto=format&fit=crop&w=600&q=80",
  chicken: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80",
  cola: "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=600&q=80",
  iceTea: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
  juice: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80",
  ayran: "https://images.unsplash.com/photo-1571687949921-1306bfb24b72?auto=format&fit=crop&w=600&q=80",
  water: "https://images.unsplash.com/photo-1564725075388-cc5fff19be91?auto=format&fit=crop&w=600&q=80",
  iceCream: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=600&q=80",
  ketchup: "https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?auto=format&fit=crop&w=600&q=80",
  mayo: "https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?auto=format&fit=crop&w=600&q=80",
  cheese: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80",
  meat: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
  campaign: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=600&q=80"
};

function imageForItem(item) {
  const n = item.name.toLowerCase();
  const c = item.category.toLowerCase();
  if (c === "menus") return IMAGE_SOURCES.burgerCombo;
  if (c === "campaign") return IMAGE_SOURCES.campaign;
  if (c === "burgers") {
    if (n.includes("double")) return IMAGE_SOURCES.burgerDouble;
    return IMAGE_SOURCES.burger;
  }
  if (c === "pizza") {
    if (n.includes("ton")) return IMAGE_SOURCES.pizzaTuna;
    if (n.includes("peynirli") || n.includes("margarita")) return IMAGE_SOURCES.pizzaCheese;
    return IMAGE_SOURCES.pizza;
  }
  if (c === "snacks") {
    if (n.includes("sogan")) return IMAGE_SOURCES.onionRings;
    if (n.includes("peynir")) return IMAGE_SOURCES.cheeseSticks;
    if (n.includes("tavuk")) return IMAGE_SOURCES.chicken;
    return IMAGE_SOURCES.fries;
  }
  if (c === "drinks") {
    if (n.includes("ice tea")) return IMAGE_SOURCES.iceTea;
    if (n.includes("tropicana")) return IMAGE_SOURCES.juice;
    if (n.includes("ayran")) return IMAGE_SOURCES.ayran;
    if (n.includes("su") || n.includes("soda")) return IMAGE_SOURCES.water;
    return IMAGE_SOURCES.cola;
  }
  if (c === "ice cream") return IMAGE_SOURCES.iceCream;
  if (c === "sauces") {
    if (n.includes("mayonez")) return IMAGE_SOURCES.mayo;
    return IMAGE_SOURCES.ketchup;
  }
  if (c === "extras") {
    if (n.includes("peynir")) return IMAGE_SOURCES.cheese;
    return IMAGE_SOURCES.meat;
  }
  return IMAGE_SOURCES.burger;
}

app.get("/api/menu", (_, res) => {
  const menuWithImages = MENU_ITEMS.map((item) => ({
    ...item,
    image: imageForItem(item),
    price: Math.round(item.price * 2 * 100) / 100
  }));
  res.json(menuWithImages);
});

app.post("/api/auth/register", (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;
  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }
  db.run(
    "INSERT INTO users (full_name, email, password) VALUES (?,?,?)",
    [fullName.trim(), email.trim().toLowerCase(), password],
    function onInsert(err) {
      if (err) return res.status(400).json({ error: "Email already registered." });
      return res.json({ ok: true, userId: this.lastID });
    }
  );
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  db.get(
    "SELECT id, full_name, email FROM users WHERE email = ? AND password = ?",
    [email.trim().toLowerCase(), password],
    (err, row) => {
      if (err) return res.status(500).json({ error: "Login failed." });
      if (!row) return res.status(401).json({ error: "Invalid credentials." });
      db.run(
        "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
        [row.id],
        () => {
          db.run(
            "INSERT INTO login_history (user_id, email) VALUES (?, ?)",
            [row.id, row.email],
            () => res.json({ ok: true, user: row })
          );
        }
      );
    }
  );
});

app.get("/api/cart/:userId", (req, res) => {
  db.all(
    "SELECT item_id, name, category, price, quantity FROM cart_items WHERE user_id = ?",
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Could not load cart." });
      return res.json(rows || []);
    }
  );
});

app.post("/api/cart/save", (req, res) => {
  const { userId, items } = req.body;
  if (!userId || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid cart payload." });
  }
  db.serialize(() => {
    db.run("DELETE FROM cart_items WHERE user_id = ?", [userId]);
    const stmt = db.prepare(
      "INSERT INTO cart_items (user_id, item_id, name, category, price, quantity) VALUES (?,?,?,?,?,?)"
    );
    items.forEach((item) => {
      stmt.run([userId, item.id, item.name, item.category, item.price, item.quantity]);
    });
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: "Cart save failed." });
      return res.json({ ok: true });
    });
  });
});

app.get("/api/orders/:userId", (req, res) => {
  db.all(
    "SELECT id, order_ref, subtotal, service, total, items_json, created_at FROM orders WHERE user_id = ? ORDER BY id DESC",
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Could not load orders." });
      return res.json(rows || []);
    }
  );
});

app.post("/api/orders", (req, res) => {
  const { userId, items } = req.body;
  if (!userId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order is empty." });
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const service = subtotal * 0.1;
  const total = subtotal + service;
  const orderRef = `LM-${Date.now().toString().slice(-6)}`;
  const payload = JSON.stringify(items);

  db.run(
    "INSERT INTO orders (order_ref, user_id, subtotal, service, total, items_json) VALUES (?,?,?,?,?,?)",
    [orderRef, userId, subtotal, service, total, payload],
    function onInsert(err) {
      if (err) return res.status(500).json({ error: "Could not create order." });
      const orderId = this.lastID;
      db.run("DELETE FROM cart_items WHERE user_id = ?", [userId], () => {
        res.json({
          ok: true,
          order: { orderId, orderRef, subtotal, service, total, items, createdAt: new Date().toISOString() }
        });
      });
    }
  );
});

function resolveBrowserPath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

app.post("/api/receipt/pdf", async (req, res) => {
  const { order } = req.body;
  if (!order || !order.orderRef || !Array.isArray(order.items)) {
    return res.status(400).json({ error: "Invalid receipt payload." });
  }
  const executablePath = resolveBrowserPath();
  if (!executablePath) {
    return res.status(500).json({ error: "No Chrome/Edge executable found for Puppeteer." });
  }

  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:right;">${(item.price * item.quantity).toFixed(2)} TL</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
  <html><head><meta charset="utf-8"/><style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1b1b1b}
  .title{font-size:28px;font-weight:700;margin-bottom:4px}
  .sub{color:#666;margin-bottom:18px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{padding:10px;border-bottom:1px solid #ddd}
  .totals{margin-top:20px;max-width:320px;margin-left:auto}
  .row{display:flex;justify-content:space-between;padding:6px 0}
  .grand{font-size:20px;font-weight:700}
  .thank{margin-top:26px;color:#666}
  </style></head><body>
    <div class="title">LUMIERE Restaurant</div>
    <div class="sub">Order Receipt | #${order.orderRef}</div>
    <div>Date: ${new Date(order.createdAt || Date.now()).toLocaleString()}</div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${order.subtotal.toFixed(2)} TL</span></div>
      <div class="row"><span>Service (10%)</span><span>${order.service.toFixed(2)} TL</span></div>
      <div class="row grand"><span>Total</span><span>${order.total.toFixed(2)} TL</span></div>
    </div>
    <div class="thank">Thank you for ordering from our restaurant.</div>
  </body></html>`;

  try {
    const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const filename = `receipt-${order.orderRef}.pdf`;
    const outputPath = path.join(receiptsDir, filename);
    await page.pdf({ path: outputPath, format: "A4", printBackground: true });
    await browser.close();
    return res.json({ ok: true, fileUrl: `/receipts/${filename}` });
  } catch (error) {
    return res.status(500).json({ error: `PDF generation failed: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`LUMIERE server running on http://localhost:${PORT}`);
});
