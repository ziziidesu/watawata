const m3u8stream = require('m3u8stream');
const ytdl = require("ytdl-core");
const ytsr = require("ytsr");
const ytpl = require("ytpl");
const miniget = require("miniget");
const express = require("express");
const ejs = require("ejs");
const app = express();
const axios = require('axios');
const fs = require('fs');
const { https } = require('follow-redirects');
const cors = require('cors');

const limit = process.env.LIMIT || 50;

const user_agent = process.env.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36";

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

//tst
app.get('/tst/:id', (req, res) => {
  const id = req.params.id;
  res.render(`tst/${id}`, { id: id }); // views/tst/:id.ejs をレンダリング
});
//待って
app.get("/matte",(req, res) => {
  res.render("../views/matte.ejs")
})
//曲をきく！
app.get("/famous",(req, res) => {
  res.render("../views/famous.ejs")
})
//てすとー！
async function getYouTubePageTitle(url) {
  try {
    // YouTubeページのHTMLを取得
    const { data } = await axios.get(url);
    const pageinfo = data;

    // <title>タグの内容を正規表現で抽出
    const titleMatch = data.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'タイトルが取得できませんでした';
    
    return pageinfo;
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    return 'エラーが発生しました';
  }
}

// /titleエンドポイントにアクセスしたときにページタイトルを表示
app.get('/title', async (req, res) => {
  const videoUrl = 'https://www.youtube.com/watch?v=f6TytcA47rI';
  const pageinfo = await getYouTubePageTitle(videoUrl);
  res.setHeader('Content-Type', 'text/plain');
  res.send(`${pageinfo}`);
});

app.get('/holo', async (req, res) => {
  const videoUrl = 'https://schedule.hololive.tv/';
  const pageinfo = await getYouTubePageTitle(videoUrl);
  res.send(`<link rel="stylesheet" href="/css/hololo.css"> ${pageinfo}`);
});

//わかめわかめ
app.get('/mimi', async (req, res) => {
  const videoUrl = 'https://www.youtube.com/watch?v=7Y9sJvLI3Po';
  const pageinfo = await getYouTubePageTitle(videoUrl);
  res.send(`${pageinfo}`);
});

//サジェスト
app.use(cors());

app.get('/suggestions', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    try {
        const response = await axios.get(`https://www.google.com/complete/search?client=youtube&hl=ja&ds=yt&q=${encodeURIComponent(query)}`);
        const suggestions = response.data[1].map(suggestion => suggestion[0]);
        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching suggestions.' });
    }
});

//緊急
app.get('/w/:id', async (req, res) => {
  let videoId = req.params.id;
  let url = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `https://wakametubeapi.glitch.me/api/w/${videoId}`;
  
  try {
    const response = await axios.get(apiUrl);
    const { stream_url } = response.data;
    
    res.render('kwatch.ejs', { videoId, stream_url});
  } catch (error) {
    console.error(error);
    res.status(500).render('matte', { videoId, error: '動画を取得できません', details: error.message });
  }
});

//おもしろい🤣
app.get('/jehena', async (req, res) => {
  const videoUrl = 'https://www.youtube.com/watch?v=7Y9sJvLI3Po';
  const pageinfo = await getYouTubePageTitle(videoUrl);
  const videoId = '7Y9sJvLI3Po';
  let url = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `https://wakametubeapi.glitch.me/api/w/${videoId}`;
  try {
    const response = await axios.get(apiUrl);
    const { stream_url } = response.data;
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(`${pageinfo}`);
  } catch (error) {
    console.error(error);
    res.status(500).render('matte', { videoId, error: '動画を取得できません', details: error.message });
  }
});

//てーすと
const instances = [
    'https://yewtu.be',
    'https://vid.puffyan.us',
    'https://invidious.flokinet.to',
    'https://inv.tux.pizza',
    'https://iv.ggtyler.dev',
    'https://inv.nadeko.net',
    "https://invidious.lunar.icu/","https://onion.tube/","https://inv.riverside.rocks/","https://invidio.xamh.de/","https://y.com.sb/","https://invidious.sethforprivacy.com/","https://invidious.tiekoetter.com/","https://inv.bp.projectsegfau.lt/","https://inv.vern.cc/","https://invidious.nerdvpn.de/","https://inv.privacy.com.de/","https://invidious.rhyshl.live/","https://invidious.slipfox.xyz/","https://invidious.weblibre.org/","https://invidious.namazso.eu/"
];

async function get1080pStream(videoId) {
    for (const instance of instances) {
        try {
            const response = await axios.get(`${instance}/api/v1/videos/${videoId}`);
            console.log(`使用中のインスタンス: ${instance}`);
            const streams = response.data.formatStreams;

            if (streams) {
                const stream1080p = streams.find(stream => stream.qualityLabel === '1080p');
                return stream1080p ? stream1080p.url : null;
            } else {
                console.error("formatStreamsが見つかりませんでした。");
                return null;
            }
        } catch (error) {
            console.error(`インスタンス ${instance} でエラーが発生しました:`, error);
        }
    }
    return null;
}

// /stream/:id エンドポイントの実装
app.get('/stream/:id', async (req, res) => {
    const videoId = req.params.id;
    const streamUrl = await get1080pStream(videoId);

    if (streamUrl) {
        res.json({ streamUrl });
    } else {
        res.status(404).json({ error: '1080pのストリームが見つかりませんでした。' });
    }
});

//観る
app.get('/p/:id', async (req, res) => {
  let videoId = req.params.id;
  let url = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `https://wakametubeapi.glitch.me/api/w/${videoId}`;

  if (!ytdl.validateURL(url)) {
    return res.status(400).render('index', { error: 'Invalid YouTube URL' });
  }
  
  try {
    const response = await axios.get(apiUrl);
    const { stream_url } = response.data;

    let info = await ytdl.getInfo(url);
    
    res.render('watch.ejs', { videoId, stream_url, info });
  } catch (error) {
    console.error(error);
    res.status(500).render('matte', { videoId, error: '動画を取得できません', details: error.message });
  }
});
//ダウンロード緊急
app.get('/pytdf/:id', async (req, res) => {
  const videoId = req.params.id;
  const apiUrl = `https://wakametubeapi.glitch.me/api/w/${videoId}`;
  const URL = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const response = await axios.get(apiUrl);
    const streamUrl = response.data.stream_url;
    
    https.get(streamUrl, (streamResponse) => {
      if (streamResponse.statusCode !== 200) {
        res.status(streamResponse.statusCode).send(`Failed to download video. Status code: ${streamResponse.statusCode}`);
        return;
      }

      res.setHeader('Content-Disposition', 'attachment; filename="wakame.mp4"');
      res.setHeader('Content-Type', 'video/mp4');

      streamResponse.pipe(res);
    }).on('error', (err) => {
      res.status(500).send(`Request error: ${err.message}`);
    });
  } catch (error) {
    res.status(500).send(`Failed to retrieve stream URL: ${error.message}`);
  }
});

//ダウンロード
app.get('/pytd/:id', async (req, res) => {
  const videoId = req.params.id;
  const apiUrl = `https://wakametubeapi.glitch.me/api/w/${videoId}`;
  const URL = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // APIからストリームURLを取得
    const response = await axios.get(apiUrl);
    const streamUrl = response.data.stream_url;
    const info = await ytdl.getInfo(URL);
    const title = info.videoDetails.title;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9一-龯ぁ-ゔァ-ヴーｱ-ﾝﾞﾟー]/g, ' ');

    // ストリームURLから動画をクライアントに送信
    https.get(streamUrl, (streamResponse) => {
      if (streamResponse.statusCode !== 200) {
        res.status(streamResponse.statusCode).send(`Failed to download video. Status code: ${streamResponse.statusCode}`);
        return;
      }

      // クライアントにファイルを送信するためのヘッダーを設定
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(sanitizedTitle)}.mp4`);
      res.setHeader('Content-Type', 'video/mp4');

      // ストリームデータをクライアントに送信
      streamResponse.pipe(res);
    }).on('error', (err) => {
      res.status(500).send(`Request error: ${err.message}`);
    });
  } catch (error) {
    res.status(500).send(`Failed to retrieve stream URL: ${error.message}`);
  }
});
//ライブ配信
app.get("/live/:id", async (req, res) => {
  let videoId = req.params.id;
  let url = `https://www.youtube.com/watch?v=${videoId}`;

  if (!ytdl.validateURL(url)) {
    return res.status(400).render('index', { error: 'Invalid YouTube URL' });
  }

  try {
    let info = await ytdl.getInfo(url);
    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
    res.render('live.ejs', {videoUrl: videoFormats[0].url, info});
  } catch (error) {
    console.error(error);
    res.status(500).render('index', { error: 'Error fetching video info' });
  }
})

//twitter
app.get("/xtwi",(req, res) => {
  res.render("../views/twitter.ejs")
})

// ホーム
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/index.html");
    const referer = req.get('Referer') || 'No referer information';
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // コンソールに Referer と IP アドレスを書き込む
    console.log(`URL: ${referer} から来た, IP: ${ip}`);
});

// サーチ
app.get("/s", async (req, res) => {
	let query = req.query.q;
	let page = Number(req.query.p || 1);
	if (!query) return res.redirect("/");
    let cookies = parseCookies(req);
    let wakames = cookies.wakames === 'true';
    if (wakames) {
        try {
		res.render("search2.ejs", {
			res: await ytsr(query, { limit, pages: page }),
			query: query,
			page
		});
	} catch (error) {
		console.error(error);
		try {
			res.status(500).render("error.ejs", {
				title: "ytsr Error",
				content: error
			});
		} catch (error) {
			console.error(error);
		}
	}
    } else {
       try {
		res.render("search.ejs", {
			res: await ytsr(query, { limit, pages: page }),
			query: query,
			page
		});
	} catch (error) {
		console.error(error);
		try {
			res.status(500).render("error.ejs", {
				title: "ytsr Error",
				content: error
			});
		} catch (error) {
			console.error(error);
		}
	}
    }
});

app.get("/e/:id", async (req, res) => {
	if (!req.params.id) return res.redirect("/");
	try {
		let info = await ytdl.getInfo(req.params.id);
		if (!info.formats.filter(format => format.hasVideo && format.hasAudio).length) {
			return res.status(500).send("This Video is not Available for this Server Region.");
		}

		res.render('embed.ejs', {
			id: req.params.id, info
		});
	} catch (error) {
		console.error(error);
		res.status(500).send(error.toString());
	}
});

app.get("/p/:id", async (req, res) => {
	if (!req.params.id) return res.redirect("/");
	let page = Number(req.query.p || 1);
	try {
		res.render("playlist.ejs", {
			playlist: await ytpl(req.params.id, { limit, pages: page }),
			page
		});
	} catch (error) {
		console.error(error);
		res.status(500).render("error.ejs", {
			title: "ytpl Error",
			content: error
		});
	}
});

// チャンネル
app.get("/c/:id", async (req, res) => {
	if (!req.params.id) return res.redirect("/");
	let page = Number(req.query.p || 1);
	try {
		res.render("channel.ejs", {
			channel: await ytpl(req.params.id, { limit, pages: page }),
			page
		});
	} catch (error) {
		console.error(error);
		res.status(500).render("error.ejs", {
			title: "ytpl Error",
			content: error
		});
	}
});

//音のみ再生
app.get('/listen/:id', async (req, res) => {
  let videoId = req.params.id;
  let url = `https://www.youtube.com/watch?v=${videoId}`;

  if (!ytdl.validateURL(url)) {
    return res.status(400).render('index', { error: 'Invalid YouTube URL' });
  }

  try {
    let info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    if (audioFormats.length === 0) {
      return res.status(500).render('index', { error: 'No audio formats available' });
    }
    res.render('listen', { audioUrl: audioFormats[0].url, info });
  } catch (error) {
    console.error(error);
    res.status(500).render('index', { error: 'Error fetching audio info' });
  }
});

// Video Streaming
app.get("/s/:id", async (req, res) => {
	if (!req.params.id) return res.redirect("/");
	try {
		let info = await ytdl.getInfo(req.params.id);
		info.formats = info.formats.filter(format => format.hasVideo && format.hasAudio);
		
		if (!info.formats.length) {
			return res.status(500).send("This Video is not Available for this Server Region.");
		}

		let headers = {
			'user-agent': user_agent
		}

		// If user is seeking a video
		if (req.headers.range) {
			headers.range = req.headers.range;
		}

		if (info.videoDetails.isLiveContent && info.formats[0].type == "video/ts") {
			return m3u8stream(info.formats[0].url).on('error', (err) => {
				res.status(500).send(err.toString());
				console.error(err);
			}).pipe(res);
		}

		let stream = miniget(info.formats[0].url, {
			headers
		}).on('response', resp => {			
			if (resp.headers['accept-ranges']) res.setHeader('accept-ranges', resp.headers['accept-ranges']);
			if (resp.headers['content-length']) res.setHeader('content-length', resp.headers['content-length']);
			if (resp.headers['content-type']) res.setHeader('content-type', resp.headers['content-type']);
			if (resp.headers['content-range']) res.setHeader('content-range', resp.headers['content-range']);
			if (resp.headers['connection']) res.setHeader('connection', resp.headers['connection']);
			if (resp.headers['cache-control']) res.setHeader('cache-control', resp.headers['cache-control']);
			stream.pipe(res.status(resp.statusCode));
		}).on('error', err => {
			res.status(500).send(err.toString());
		});
	} catch (error) {
		res.status(500).send(error.toString());
	}
});

//play(軽量化)
app.get('/play/:id', async (req, res) => {
  const videoId = req.params.id;
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  if (!ytdl.validateURL(url)) {
    return res.status(400).render('index', { error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
    res.render('play', { videoUrl: videoFormats[0].url });
  } catch (error) {
    console.error(error);
    res.status(500).render('index', { error: 'Error fetching video info' });
  }
});

//ダウンロード(軽量化)
app.get("/dd/:id", async (req, res) => {
  try {
    const videoID = req.params.id;
    const URL = `https://www.youtube.com/watch?v=${videoID}`;

    const info = await ytdl.getInfo(URL);
    const title = info.videoDetails.title;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9一-龯ぁ-ゔァ-ヴーｱ-ﾝﾞﾟー]/g, ' ');

    res.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(sanitizedTitle)}.mp4`);

    ytdl(URL, { quality: '18' }).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to download video');
  }
});

// サムネ読み込み
app.get("/vi*", (req, res) => {
	let stream = miniget(`https://i.ytimg.com/${req.url.split("?")[0]}`, {
		headers: {
			"user-agent": user_agent
		}
	});
	stream.on('error', err => {
		console.log(err);
		res.status(500).send(err.toString());
	});
	stream.pipe(res);
});

// 画像読み込み
app.get("/ytc/*", (req, res) => {
	let stream = miniget(`https://yt3.ggpht.com/${req.url}`, {
		headers: {
			"user-agent": user_agent
		}
	});
	stream.on('error', err => {
		console.log(err);
		res.status(500).send(err.toString());
	});
	stream.pipe(res);
});

//tool
app.get("/tool",(req, res) => {
  res.render("../tool/home.ejs")
})
app.get("/tool/calculator",(req, res) => {
  res.render("../tool/calculator.ejs")
})
app.get("/tool/android",(req, res) => {
  res.render("../tool/android.ejs")
})
app.get("/tool/check",(req, res) => {
  res.render("../tool/check.ejs")
})

//tst
app.get("/tst1234",(req, res) => {
  res.render("../tst.ejs")
})

//url
//tst
app.get("/urls",(req, res) => {
  res.render("../views/url.ejs")
})

//blog
app.get("/blog",(req, res) => {
  res.render("../views/blog.ejs")
})

app.get("/blog/up",(req, res) => {
  res.render("../views/blog/update.ejs")
})

//お問い合わせ
app.get("/send",(req, res) => {
  res.render("../views/send.ejs")
})

//apps
app.get("/app",(req, res) => {
  res.render("../public/apps.ejs")
})

//game
app.get("/game/stickman",(req, res) => {
  res.render("../game/stickman.ejs")
})
app.get("/game/ctr",(req, res) => {
  res.render("../game/ctr.ejs")
})
app.get("/game/taiko",(req, res) => {
  res.render("../game/taiko.ejs")
})
app.get("/game/2048",(req, res) => {
  res.render("../game/2048.ejs")
})
app.get("/game/snow",(req, res) => {
  res.render("../game/snow.ejs")
})
app.get("/game/topwar",(req, res) => {
  res.render("../game/topwar.ejs")
})
app.get("/game/interland",(req, res) => {
  res.render("../game/interland.ejs")
})
app.get("/game/driftboss",(req, res) => {
  res.render("../game/driftboss.ejs")
})
app.get("/game/paper",(req, res) => {
  res.render("../game/paper.ejs")
})
app.get("/game/drive",(req, res) => {
  res.render("../game/drive.ejs")
})
app.get("/game/aiothello",(req, res) => {
  res.render("../game/aiothello.ejs")
})
app.get("/game/stellar",(req, res) => {
  res.render("../game/stellar.ejs")
})

//proxy
app.get("/proxy/",(req, res) => {
  res.render("../read/proxy.ejs")
})

//setting
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

function parseCookies(request) {
    const list = {};
    const cookieHeader = request.headers.cookie;

    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            let parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }

    return list;
}

app.get('/setting', (req, res) => {
    const cookies = parseCookies(req);
    const wakames = cookies.wakames === 'true';
    res.render('setting', { wakames });
});

app.post('/setting', (req, res) => {
    const wakames = req.body.wakames === 'on';
    res.setHeader('Set-Cookie', `wakames=${wakames}; HttpOnly; Max-Age=604800`);
    res.redirect('/setting');
});

//proxy
app.get('/proxy/shadow', (req, res) => {
    res.render("../read/proxy/shadow.ejs");
});
app.get('/proxy/doge', (req, res) => {
    res.render("../read/proxy/doge.ejs");
});
app.get('/proxy/inbox', (req, res) => {
    res.render("../read/proxy/inbox.ejs");
});
app.get('/proxy/st', (req, res) => {
    res.render("../read/proxy/st.ejs");
});
app.get('/proxy/art', (req, res) => {
    res.render("../read/proxy/art.ejs");
});
app.get('/proxy/rammer', (req, res) => {
    res.render("../read/proxy/rammer.ejs");
});
app.get('/proxy/black', (req, res) => {
    res.render("../read/proxy/black.ejs");
});
app.get('/proxy/flow', (req, res) => {
    res.render("../read/proxy/flow.ejs");
});

// エラー
app.use((req, res) => {
	res.status(404).render("error.ejs", {
		title: "404 Not found",
		content: "このページは削除されているか、存在していません。問題がありましたら「問い合わせ」からどうぞ。"
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log("Your app is now listening on port", listener.address().port);
});

process.on("unhandledRejection", console.error);

