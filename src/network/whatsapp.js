require('dotenv').config();
const sdk = require('api')('@whapi/v1.7.5#27slv2oltdcs6xr');
const { createClient } = require('@supabase/supabase-js');
const {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_ID_CHAT,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} = process.env;

const supabaseAPI = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
sdk.auth(WHATSAPP_ACCESS_TOKEN);

run();

async function run() {
  try {
    const { data, error } = 
      await supabaseAPI.from('books-control')
      .select('*')
      .neq('whatsapp_image', '')
      .neq('whatsapp_image', null)
      .neq('whatsapp_content', null)
      .neq('whatsapp_content', '')
      .eq('whatsapp_posted', false)
      .eq('whatsapp_schedule', true)
      .order('whatsapp_position');

    if (error) {
      throw error;
    }
    
    if (data.length > 0) {
      // console.log('Fila de posts agendados:', data);
      await sendMessageWhatsApp(data[0].whatsapp_image, data[0].whatsapp_content, data[0].id);
      return;
    }
    console.log('Não existe mais nenhum post agendado...');
    // await limparTabela();
    // await limparArmazenamento();
  } catch (err) {
    console.log(err);
  }
}

async function sendMessageWhatsApp(image, text, postId) {
  try {
    sdk.sendMessageImage({
      to: WHATSAPP_ID_CHAT, // ID da Newsletter
      media: image,
      caption: text
    })
    .then(async({ data }) => {
      console.log('Newsletter publicado com sucesso!');
      await supabaseAPI.from('books-control').update({ whatsapp_posted: true }).eq('id', postId);
    })
    .catch((err) => {
      console.error('Erro ao publicar no WhatsApp:', err);
    });
  } catch (err) {
    console.error('Erro ao publicar no WhatsApp:', err);
  }
}

async function limparTabela() {
  try {
    // Limpar a tabela inteira
    const { error }
      = await supabaseAPI
      .from('books-control')
      .delete()
      .eq('whatsapp_schedule', true)
      .eq('whatsapp_posted', true);

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
