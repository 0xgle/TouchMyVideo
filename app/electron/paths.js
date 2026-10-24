'use strict';
const path = require('path');
const os = require('os');
const { app } = require('electron');

const PLATFORM = process.platform;
const IS_WIN = PLATFORM === 'win32';
const IS_MAC = PLATFORM === 'darwin';
const EXE = IS_WIN ? '.exe' : '';

const USER_DATA = app.getPath('userData');
const TOOLS_DIR = path.join(USER_DATA, 'tools');

module.exports = {
  IS_WIN,
  IS_MAC,
  IS_DEV: process.env.NODE_ENV === 'development',
  USER_DATA,
  TOOLS_DIR,
  SETTINGS_FILE: path.join(USER_DATA, 'settings.json'),
  HISTORY_FILE: path.join(USER_DATA, 'history.json'),
  LOG_FILE: path.join(USER_DATA, 'debug.log'),
  DEFAULT_DOWNLOADS_DIR: path.join(app.getPath('downloads') || path.join(os.homedir(), 'Downloads'), 'TouchMyVideo'),
  YTDLP_LOCAL: path.join(TOOLS_DIR, 'yt-dlp' + EXE),
  FFMPEG_LOCAL: path.join(TOOLS_DIR, 'ffmpeg' + EXE),
  FFPROBE_LOCAL: path.join(TOOLS_DIR, 'ffprobe' + EXE),
  EXE,
  ASSETS_DIR: path.join(__dirname, '..', 'assets'),
};
