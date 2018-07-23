# RSI_BULL_BEAR_ADX-Remote-Control-with-Telegram

This modified version will let you know remotely control when Gekko will buy and sell and also let you modify the RSI settings so you can make changes to your strategy live.

1. You need to have Zappra's version of Gekko installed.
2. Replace telegrambot.js in the plugins folder with the one in this repo (I corrected a bug in Zappra's repo, waiting for him to accept the pull request).
3. Open Telegram, start a chat session with BotFather, create a bot and get a token. Put the token and bot name in the config-papertrader-telegram.js file. Put this file in the Gekko folder.
4. Install the ADX indicator needed for RSI_Bull_Bear_ADX (from Gab0).
5. Copy the RSI_BULL_BEAR_ADX.js file to the strategies folder.
6. Run the bot (ex: node gekko --config config-papertrader-telegram.js).
