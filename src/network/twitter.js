require('dotenv').config();
const { TwitterApi } = require("twitter-api-v2");
const request = require("request");
const fs = require("fs");
const { createClient } = require('@supabase/supabase-js');
const {
  TWITTER_API_KEY,
  TWITTER_API_SECRET_KEY,
  TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_TOKEN_SECRET,
  TWITTER_BEARER_TOKEN,
  TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} = process.env;
const supabaseAPI = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const client = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET_KEY,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
  clientId: TWITTER_CLIENT_ID,
  clientSecret: TWITTER_CLIENT_SECRET,
});

run();

async function run() {
  try {
    const { data, error } = 
      await supabaseAPI.from('books-control')
      .select('*')
      .neq('img', '')
      .neq('img', null)
      .neq('content', null)
      .neq('content', '')
      .eq('posted', false)
      .eq('schedule', true)
      .eq('twitter', true)
      .order('position');

    if (error) {
      throw error;
    }
    
    
    if (data.length > 0) {
      // console.log('Fila de posts agendados:', data);
      await sendTweet(data[0].img, data[0].content);
      await supabaseAPI.from('books-control').update({ posted: true }).eq('id', data[0].id);
      return;
    }

    console.log('Não existe mais nenhum post agendado...');
    await limparTabela();
    await limparArmazenamento();
  } catch (err) {
    console.log(err);
  }
}

async function sendTweet(image, text) {
  

  // const bearer = new TwitterApi(TWITTER_BEARER_TOKEN) ;
  const twitterClient = client.readWrite;
  // const twitterBearer = bearer.readOnly;

  // TODO: organizar texto para pegar de acordo com a rede social pelo dashboard
  newText = `
  📚 The Seven Husbands of Evelyn Hugo: A Novel (English Edition)

  🛒 Por: R$56,14

  🔗 Link: https://ofertasdelivros.com.br/o/?c=B01M5IJM2U

  👉🏻 Valor sujeito a alteração sem aviso prévio
  `

  downloadImage(image, 'twitter-image-post.jpeg', async function(){
    try {
      const mediaId = await twitterClient.v1.uploadMedia('./twitter-image-post.jpeg')
      await twitterClient.v2.tweet({
        text: newText,
        media: {
          media_ids: [mediaId]
        }
      });
    } catch (e) {
      console.error(e);
    }
  });
}

async function downloadImage (uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
};

async function limparTabela() {
  try {
    // Limpar a tabela inteira
    const { error }
      = await supabaseAPI
      .from('books-control')
      .delete()
      .eq('twitter', true)
      .eq('posted', true);

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

