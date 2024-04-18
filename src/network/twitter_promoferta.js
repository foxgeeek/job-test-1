require('dotenv').config();
const { TwitterApi } = require("twitter-api-v2");
const request = require("request");
const fs = require("fs");
const { createClient } = require('@supabase/supabase-js');
const {
  P_TWITTER_API_KEY,
  P_TWITTER_API_SECRET_KEY,
  P_TWITTER_ACCESS_TOKEN,
  P_TWITTER_ACCESS_TOKEN_SECRET,
  P_TWITTER_BEARER_TOKEN,
  P_TWITTER_CLIENT_ID,
  P_TWITTER_CLIENT_SECRET,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} = process.env;
const supabaseAPI = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const client = new TwitterApi({
  appKey: P_TWITTER_API_KEY,
  appSecret: P_TWITTER_API_SECRET_KEY,
  accessToken: P_TWITTER_ACCESS_TOKEN,
  accessSecret: P_TWITTER_ACCESS_TOKEN_SECRET,
  clientId: P_TWITTER_CLIENT_ID,
  clientSecret: P_TWITTER_CLIENT_SECRET,
});

run();

async function run() {
  try {
    const { data, error } = 
      await supabaseAPI.from('offers-control')
      .select('*')
      .neq('twitter_image', '')
      .neq('twitter_image', null)
      .neq('twitter_content', null)
      .neq('twitter_content', '')
      .eq('twitter_posted', false)
      .eq('twitter_schedule', true)
      .order('twitter_position');

    if (error) {
      throw error;
    }
    
    
    if (data.length > 0) {
      // console.log('Fila de posts agendados:', data);
      await sendTweet(data[0].twitter_image, data[0].twitter_content, data);
      return;
    }

    console.log('Não existe mais nenhum post agendado...');
    // await limparTabela();
    // await limparArmazenamento();
  } catch (err) {
    console.log(err);
  }
}

async function sendTweet(image, text, data) {
  
  // const bearer = new TwitterApi(P_TWITTER_BEARER_TOKEN) ;
  const twitterClient = client.readWrite;
  // const twitterBearer = bearer.readOnly;

  downloadImage(image, 'twitter-image-post.jpeg', async function(){
    try {
      const mediaId = await twitterClient.v1.uploadMedia('./twitter-image-post.jpeg')
      await twitterClient.v2.tweet({
        text: text,
        media: {
          media_ids: [mediaId]
        }
      });
      await supabaseAPI.from('offers-control').update({ twitter_posted: true }).eq('id', data[0].id);
    } catch (e) {
      console.error(e);
    }
  });
}

async function downloadImage (uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

async function limparTabela() {
  try {
    // Limpar a tabela inteira
    const { error }
      = await supabaseAPI
      .from('offers-control')
      .delete()
      .eq('twitter_schedule', true)
      .eq('twitter_posted', true);

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

