require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID_TO_NOTIFY,
  TELEGRAM_API_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} = process.env;
const supabaseAPI = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

run();

async function run() {
  try {
    const { data, error } = 
      await supabaseAPI.from('books-control')
      .select('*')
      .neq('telegram_image', '')
      .neq('telegram_image', null)
      .neq('telegram_content', null)
      .neq('telegram_content', '')
      .eq('telegram_posted', false)
      .eq('telegram_schedule', true)
      .eq('telegram', true)
      .order('position');

    if (error) {
      throw error;
    }
    
    
    if (data.length > 0) {
      // console.log('Fila de posts agendados:', data);
      await sendImage(data[0].telegram_image, data[0].telegram_content, data[0].id);
      // await sendText(data[0].telegram_content);
      return;
    }
    console.log('Não existe mais nenhum post agendado...');
    // await limparTabela();
    // await limparArmazenamento();
  } catch (err) {
    console.log(err);
  }
}

async function sendImage(image, text, postId) {
  try {
    const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    const data = {
      chat_id: TELEGRAM_CHAT_ID_TO_NOTIFY,
      photo: image,
      caption: text,
      disable_web_page_preview: true
    };
    await axios.post(url, data);
    await supabaseAPI.from('books-control').update({ telegram_posted: true }).eq('id', postId);
  } catch (err) {
    console.error('Erro ao publicar no teelgram: ', err);
  }
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

async function limparTabela() {
  try {
    // Limpar a tabela inteira
    const { error }
      = await supabaseAPI
      .from('books-control')
      .delete()
      .eq('telegram', true)
      .eq('telegram_posted', true);

    if (error) {
      throw error;
    }

    console.log('Tabela limpa com sucesso');
  } catch (error) {
    console.error('Erro ao limpar a tabela:', error.message);
  }
}

async function limparArmazenamento() {
  try {
    // Listar todos os arquivos no armazenamento
    const { data, error }
      = await supabaseAPI
      .storage
      .from('images')
      .list();

    if (error) {
      throw error;
    }

    // Excluir cada arquivo individualmente
    for (const file of data) {
      await supabaseAPI
        .storage
        .from('images')
        .remove([file.name]);
    }

    console.log('Armazenamento limpo com sucesso');
  } catch (error) {
    console.error('Erro ao limpar o armazenamento:', error.message);
  }
}
