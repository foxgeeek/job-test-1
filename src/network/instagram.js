require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const {
  INSTAGRAM_ACCESS_TOKEN,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} = process.env;

const supabaseAPI = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const accessToken = INSTAGRAM_ACCESS_TOKEN;

// Verifica se o token de acesso está definido
if (!accessToken) {
  console.error('Token de acesso não está definido. Por favor, defina INSTAGRAM_ACCESS_TOKEN no arquivo .env');
  process.exit(1);
}

run();

async function run() {
  try {
    const { data, error } = 
      await supabaseAPI.from('books-control')
      .select('*')
      .neq('instagram_image', '')
      .neq('instagram_image', null)
      .neq('instagram_content', null)
      .neq('instagram_content', '')
      .eq('instagram_posted', false)
      .eq('schedule', true)
      .eq('instagram', true)
      .order('position');

    if (error) {
      throw error;
    }
    
    
    if (data.length > 0) {
      // console.log('Fila de posts agendados:', data);
      await sendStatus(data[0].instagram_image, data[0].instagram_content, data[0].id);
      // await sendText(data[0].instagram_content);
      return;
    }
    console.log('Não existe mais nenhum post agendado...');
    // await limparTabela();
    // await limparArmazenamento();
  } catch (err) {
    console.log(err);
  }
}

async function sendStatus(image, text, postId) {
  try {    
    // Endpoint da API do Instagram para publicar nos Stories
    // const endpointFeed = `${INSTAGRAM_URL_GRAPH_API}/${INSTAGRAM_APP_ID}/media?image_url=${image}&caption=${text}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    const endpointStories = `${INSTAGRAM_URL_GRAPH_API}/${INSTAGRAM_APP_ID}/media?image_url=${image}&media_type=STORIES&access_token=${INSTAGRAM_ACCESS_TOKEN}`;

    // Publicar o Stories
    axios.post(endpointStories)
    .then(async(response) => {
      await axios.post(`${INSTAGRAM_URL_GRAPH_API}/${INSTAGRAM_APP_ID}/media_publish?creation_id=${response.data.id}&access_token=${INSTAGRAM_ACCESS_TOKEN}`)
      .then(async(response) => {
        console.log('Postado... ', response.data);
        console.log('Stories publicado com sucesso:', response.data);
        await supabaseAPI.from('books-control').update({ instagram_posted: true }).eq('id', postId);
      });
    })
    .catch(error => {
      console.error('Erro ao publicar o Stories:', error.response);
    });
  } catch (err) {
    console.error('Erro ao publicar no Instagram: ', err);
  }
}

async function limparTabela() {
  try {
    // Limpar a tabela inteira
    const { error }
      = await supabaseAPI
      .from('books-control')
      .delete()
      .eq('instagram', true)
      .eq('instagram_posted', true);

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
