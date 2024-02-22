require('dotenv').config();
const axios = require('axios');
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID_TO_NOTIFY,
  TELEGRAM_API_URL,
  SUPABASE_URL_BOOKS  
} = process.env;

run();

async function run() {
  try {
    const books = await getBooks();
    let randomBook = getRandomInt(1, books.length);
    let text = buildText(books[randomBook]);

    await sendImage(books[randomBook].thumbnail);
    await sendText(text);
  } catch (err) {
    console.log(err);
  }
}

async function getBooks() {
  const userAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36';
  const options = { headers: { 'User-Agent': userAgent } };
  const response = await axios.get(`${SUPABASE_URL_BOOKS}`, options);
  const books = response.data;
  books.shift();

  return books;
}

function buildText(book) {
  let text = `
  ==============================
  
  📚 ${book.title.replace('Anúncio patrocinado – ', '')}
  
  ${book.price.discounted && book.price.before_price != 0  ? '🏷️ De: R$' + book.price.before_price.toFixed(2).replace('.', ',') : ''}
  ${book.price.before_price == 0 && book.price.current_price == 0 ? '🛒 Grátis no Kindle Unlimited' : '🛒 Por: R$' + book.price.current_price.toFixed(2).replace('.', ',') + ''}
  
  🔗 Link: https://horadaleitura.com.br/o/?c=${book.asin}
  
  👉🏻 Valor sujeito a alteração sem aviso prévio
  
  ↳ Nossas redes sociais:
  🔗 Site: https://horadaleitura.com.br
  🔗 Instagram: https://instagram.com/horadaleituraof
  🔗 Telegram: https://t.me/horadaleituraof
  `
  return text;
}

async function sendImage(image) {
  const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const data = {
    chat_id: TELEGRAM_CHAT_ID_TO_NOTIFY,
    photo: image,
    disable_web_page_preview: true
  };
  await axios.post(url, data);
}

async function sendText(text) {
  const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const data = {
    chat_id: TELEGRAM_CHAT_ID_TO_NOTIFY,
    disable_web_page_preview: true,
    text
  };
  await axios.post(url, data);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; // O intervalo é inclusivo do min e max
}
