const express = require('express');
const {
  ensureMusicApiReady,
  getSongDetail,
  getSongLyric,
  getSongPlayUrl,
  searchSongs,
  searchAlbums,
  searchArtists,
  searchComplex,
  mapSongDetailToClient
} = require('../services/musicGateway');

const router = express.Router();

router.get('/health', async (req, res, next) => {
  try {
    const ready = await ensureMusicApiReady();
    res.json({
      ok: true,
      dataSource: 'netease-unofficial-api',
      serviceReady: Boolean(ready)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/song/:id/detail', async (req, res, next) => {
  try {
    const detail = await getSongDetail(req.params.id);
    res.json({
      code: 200,
      data: mapSongDetailToClient(detail),
      raw: detail
    });
  } catch (error) {
    next(error);
  }
});

router.get('/song/:id/play', async (req, res, next) => {
  try {
    const playInfo = await getSongPlayUrl(req.params.id);
    res.json({
      code: 200,
      data: playInfo
    });
  } catch (error) {
    next(error);
  }
});

router.get('/song/:id/lyric', async (req, res, next) => {
  try {
    const lyric = await getSongLyric(req.params.id);
    res.json({
      code: 200,
      data: lyric
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();

    if (!keyword) {
      return res.json({
        code: 200,
        data: {
          songs: [],
          artists: [],
          albums: []
        }
      });
    }

    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);
    const payload = await searchComplex(keyword, {
      ...(Number.isFinite(limit) ? { limit } : {}),
      ...(Number.isFinite(offset) ? { offset } : {})
    });

    res.json({
      code: 200,
      data: payload
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search/songs', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);

    if (!keyword) {
      return res.json({
        code: 200,
        data: {
          recordCount: 0,
          records: []
        }
      });
    }

    const payload = await searchSongs(keyword, {
      limit: Number.isFinite(limit) ? limit : 30,
      offset: Number.isFinite(offset) ? offset : 0,
      qualityFlag: true
    });

    res.json({
      code: 200,
      data: payload
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search/albums', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);

    if (!keyword) {
      return res.json({
        code: 200,
        data: {
          recordCount: 0,
          records: []
        }
      });
    }

    const payload = await searchAlbums(keyword, {
      limit: Number.isFinite(limit) ? limit : 30,
      offset: Number.isFinite(offset) ? offset : 0
    });

    res.json({
      code: 200,
      data: payload
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search/artists', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const limit = Number(req.query.limit);
    const offset = Number(req.query.offset);

    if (!keyword) {
      return res.json({
        code: 200,
        data: {
          recordCount: 0,
          records: []
        }
      });
    }

    const payload = await searchArtists(keyword, {
      limit: Number.isFinite(limit) ? limit : 30,
      offset: Number.isFinite(offset) ? offset : 0,
      identityFlag: true,
      subCountFlag: true
    });

    res.json({
      code: 200,
      data: payload
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
