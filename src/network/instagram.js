require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const {
  INSTAGRAM_ACCESS_TOKEN,
  INSTAGRAM_URL_GRAPH_API,
  INSTAGRAM_APP_ID,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} = process.env;

let accessToken = INSTAGRAM_ACCESS_TOKEN;
const supabaseAPI = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
      .eq('instagram_schedule', true)
      .order('instagram_position');

    if (error) {
      throw error;
    }
    
    const hasToken = await supabaseAPI.from('tokens-control').select('*').eq('network', 'instagram');
    
    if (hasToken.data.length > 0) {
      accessToken = hasToken.data[0].access_token;
    }
    
    if (data.length > 0) {
      // console.log('Fila de posts agendados:', data);
      await sendStatus(data[0].instagram_image, data[0].instagram_content, data[0].id);
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
    // const endpointFeed = `${INSTAGRAM_URL_GRAPH_API}/${INSTAGRAM_APP_ID}/media?image_url=${image}&caption=${text}&access_token=${accessToken}`;
    const endpointStories = `${INSTAGRAM_URL_GRAPH_API}/${INSTAGRAM_APP_ID}/media?image_url=${image}&media_type=STORIES&access_token=${accessToken}`;

    // Publicar o Stories
    axios.post(endpointStories)
    .then(async(response) => {
      await axios.post(`${INSTAGRAM_URL_GRAPH_API}/${INSTAGRAM_APP_ID}/media_publish?creation_id=${response.data.id}&access_token=${accessToken}`)
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
      .eq('instagram_schedule', true)
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
